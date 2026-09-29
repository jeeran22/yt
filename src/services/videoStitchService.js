/**
 * Video Stitch Service
 *
 * Merges multiple short SVD MP4 clips (all ~2s from the same pipeline) into
 * a single MP4 using ffmpeg.
 *
 * Strategies:
 *  - transition = "cut" with no normalization  -> concat demuxer + `-c copy`
 *    (instant, lossless — inputs share the same H.264/AAC encoding)
 *  - transition = "fade" | "dissolve" or a `resolution` normalize request
 *    -> full re-encode (scale/pad each input, then xfade chain or concat filter)
 *
 * Binary resolution order (for portability):
 *   1. FFMPEG_PATH env var           (e.g. "path/to/ffmpeg", or run via node)
 *   2. ffmpeg-static package          (if installed)
 *   3. "ffmpeg" on the system PATH
 *
 * Requires Node.js 22+ for node:child_process.
 */

let childProcess;
try {
  childProcess = require('node:child_process');
} catch {
  childProcess = require('child_process');
}
const { execFile } = childProcess;

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const STABILITY_CONFIG = require('../config/stabilityConfig');

// All SVD clips from this pipeline are ~2 seconds.
const CLIP_DURATION_SECONDS = STABILITY_CONFIG.MODELS.VIDEO.maxDurationSeconds;
const DEFAULT_TRANSITION_SECONDS = 0.5;
const MAX_CLIPS = 20;
const MAX_CLIP_BYTES = 25 * 1024 * 1024; // 25MB per clip
const FFMPEG_TIMEOUT_MS = 120_000;

const VALID_TRANSITIONS = ['cut', 'fade', 'dissolve'];

const badRequest = (code, message) => Object.assign(new Error(message), {
  status: 400,
  error: 'Bad Request',
  message,
  code
});

function resolveFfmpegCommand() {
  if (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH.trim() !== '') {
    return process.env.FFMPEG_PATH.trim().split(/\s+/).filter(Boolean);
  }
  try {
    return [require('ffmpeg-static')];
  } catch {
    // package not installed — fall through to system PATH
  }
  return ['ffmpeg'];
}

function extractClipBase64(clip) {
  let source;
  if (typeof clip === 'string') {
    source = clip;
  } else if (clip && typeof clip === 'object') {
    source = clip.videoUrl || clip.data || clip.clip;
  }

  if (!source) {
    throw badRequest('INVALID_CLIPS', 'Each clip must be a base64 data URL string or an object with a videoUrl');
  }

  return String(source).replace(/^data:[^,]+;base64,/, '').trim();
}

async function runFfmpeg(args) {
  const command = resolveFfmpegCommand();
  const [file, ...baseArgv] = command;

  try {
    // execFile callback form (verified on Node 22): (error, stdoutString)
    //   - error === null            -> exited 0
    //   - error.code is a string    -> spawn failure (e.g. ENOENT)
    //   - error.code is a number    -> non-zero exit code
    await new Promise((resolve, reject) => {
      execFile(file, [...baseArgv, ...args], {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: FFMPEG_TIMEOUT_MS,
        windowsHide: true
      }, (error) => (error ? reject(error) : resolve()));
    });
  } catch (error) {
    // Binary missing / cannot spawn
    if (typeof error.code === 'string' && (error.code === 'ENOENT' || error.code === 'ENOTFOUND')) {
      throw {
        status: 503,
        error: 'Service Unavailable',
        message: 'ffmpeg binary not found. Install ffmpeg-static, set FFMPEG_PATH, or add ffmpeg to PATH.',
        code: 'FFMPEG_NOT_FOUND'
      };
    }

    const exitStatus = typeof error.code === 'number' ? error.code : error.signal;
    const commandLine = Array.isArray(error.cmd) ? error.cmd.join(' ') : '';
    console.error(`🛑 ffmpeg failed (exit ${exitStatus}): ${commandLine}`);

    throw {
      status: 422,
      error: 'Video Stitch Failed',
      message: 'Failed to stitch video clips with ffmpeg',
      code: 'FFMPEG_ERROR',
      details: {
        exitStatus,
        command: commandLine
      }
    };
  }
}

// [0:v]scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2,setsar=1[0:s];...
function buildScalePrefilters(count, width, height) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
           `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[${i}:s];`;
  }
  return out;
}

// Returns { filter, mapLabel } for the ffmpeg -filter_complex graph.
function buildFilterGraph(count, transitionName, transitionDuration, targetResolution) {
  const chainInput = (i) => (targetResolution ? `[${i}:s]` : `[${i}:v]`);
  const prefix = targetResolution
    ? buildScalePrefilters(count, ...targetResolution.split('x').map(Number))
    : '';

  if (transitionName === 'cut') {
    // concat filter (this path is only hit when a target resolution is set)
    const inputs = [];
    for (let i = 0; i < count; i++) inputs.push(chainInput(i));
    return {
      filter: `${prefix}${inputs.join('')}concat=n=${count}:v=1:a=0[v]`,
      mapLabel: '[v]'
    };
  }

  // xfade chain: offset_k = (k+1) * (D - T)
  let chain = chainInput(0);
  for (let k = 1; k < count; k++) {
    const offset = ((k + 1) * (CLIP_DURATION_SECONDS - transitionDuration)).toFixed(3);
    chain += `${chainInput(k)}xfade=transition=${transitionName}:duration=${transitionDuration}:offset=${offset}[v${k}]`;
  }
  return { filter: prefix + chain, mapLabel: `[v${count - 1}]` };
}

function estimateDuration(transitionName, transitionDuration, clipCount) {
  if (transitionName === 'cut') {
    return Number((clipCount * CLIP_DURATION_SECONDS).toFixed(2));
  }
  return Number((clipCount * CLIP_DURATION_SECONDS - (clipCount - 1) * transitionDuration).toFixed(2));
}

class VideoStitchService {
  /**
   * @param {Object} params
   * @param {Array<string|{videoUrl:string}>} params.clips - base64 MP4 data URLs (min 2, max 20)
   * @param {('cut'|'fade'|'dissolve')} [params.transition='cut']
   * @param {string} [params.resolution] - '1024x576' | '576x1024' | '768x768' (normalizes all clips)
   * @param {number} [params.transition_duration=0.5] - xfade overlap in seconds
   */
  async stitchClips(params) {
    const { clips, transition = 'cut', resolution, transition_duration } = params;
    const transitionName = String(transition).toLowerCase();
    const transitionDuration = transition_duration === undefined
      ? DEFAULT_TRANSITION_SECONDS
      : Number(transition_duration);
    const targetResolution = resolution !== undefined ? String(resolution) : null;

    if (!Array.isArray(clips) || clips.length < 2) {
      throw badRequest('INVALID_CLIPS', 'At least 2 clips are required to stitch a video');
    }
    if (clips.length > MAX_CLIPS) {
      throw badRequest('TOO_MANY_CLIPS', `No more than ${MAX_CLIPS} clips can be stitched in one call`);
    }
    if (!VALID_TRANSITIONS.includes(transitionName)) {
      throw badRequest('INVALID_TRANSITION', `Transition must be one of: ${VALID_TRANSITIONS.join(', ')}`);
    }

    const tmpDir = path.join(os.tmpdir(), `stitch-${crypto.randomBytes(6).toString('hex')}`);
    fs.mkdirSync(tmpDir);

    try {
      // Stage each clip to a real file (ffmpeg works on files)
      const files = [];
      for (let i = 0; i < clips.length; i++) {
        const base64 = extractClipBase64(clips[i]);
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length === 0) {
          throw badRequest('INVALID_CLIPS', `Clip ${i + 1} is empty or not valid base64`);
        }
        if (buffer.length > MAX_CLIP_BYTES) {
          throw badRequest('CLIP_TOO_LARGE', `Clip ${i + 1} exceeds the ${MAX_CLIP_BYTES / (1024 * 1024)}MB limit`);
        }
        const filePath = path.join(tmpDir, `clip_${String(i).padStart(2, '0')}.mp4`);
        fs.writeFileSync(filePath, buffer);
        files.push(filePath);
      }

      const outputPath = path.join(tmpDir, 'merged.mp4');

      // Lossless concat when nothing requires re-encoding
      const needsReencode = transitionName !== 'cut' || targetResolution !== null;

      if (!needsReencode) {
        await this._concatCopy(files, outputPath);
      } else {
        await this._reencode(files, outputPath, transitionName, transitionDuration, targetResolution);
      }

      const mergedBuffer = fs.readFileSync(outputPath);

      return {
        videoUrl: `data:video/mp4;base64,${mergedBuffer.toString('base64')}`,
        format: 'mp4',
        clipCount: clips.length,
        durationSeconds: estimateDuration(transitionName, transitionDuration, clips.length),
        transition: transitionName,
        resolution: targetResolution || 'source',
        model: 'Stable Video Diffusion (stitched)',
        generatedAt: new Date().toISOString()
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  async _concatCopy(files, outputPath) {
    const listPath = path.join(path.dirname(outputPath), 'list.txt');
    const listContent = files
      .map((f) => `file '${f.replace(/\\/g, '/')}'`)
      .join('\n');
    fs.writeFileSync(listPath, listContent, 'utf8');

    await runFfmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath
    ]);
  }

  async _reencode(files, outputPath, transitionName, transitionDuration, targetResolution) {
    const inputs = [];
    for (const f of files) inputs.push('-i', f);

    const { filter, mapLabel } = buildFilterGraph(
      files.length,
      transitionName,
      transitionDuration,
      targetResolution
    );

    await runFfmpeg([
      '-y',
      ...inputs,
      '-filter_complex', filter,
      '-map', mapLabel,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-r', String(STABILITY_CONFIG.MODELS.VIDEO.fps),
      '-movflags', '+faststart',
      outputPath
    ]);
  }
}

module.exports = new VideoStitchService();