const videoService = require('../services/videoService');
const videoStitchService = require('../services/videoStitchService');
const {
  validateVideoParams,
  validateTextToVideoParams,
  validateStitchParams
} = require('../utils/validation');

// Coerce numeric form fields (multipart sends strings) into real numbers.
const toNumber = (value) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

// Extract the source image from either a multipart upload (multer)
// or a JSON payload carrying imageBase64.
const extractImage = (req) => {
  if (req.file && req.file.buffer && req.file.buffer.length > 0) {
    return {
      imageBuffer: req.file.buffer,
      imageMimeType: req.file.mimetype || 'image/png'
    };
  }
  if (req.body && req.body.imageBase64) {
    return {
      imageBase64: req.body.imageBase64,
      imageMimeType: req.body.imageMimeType || 'image/png'
    };
  }
  return null;
};

const badRequest = (res, validation) => res.status(400).json({
  error: 'Bad Request',
  message: validation.message,
  code: validation.code
});

class VideoController {
  // POST /generate-video — end-to-end text-to-video
  async generateVideoFromText(req, res, next) {
    try {
      const body = req.body || {};
      const params = {
        prompt: body.prompt,
        width: toNumber(body.width) || 768,
        height: toNumber(body.height) || 768,
        output_format: body.output_format || 'png',
        seed: toNumber(body.seed),
        cfg_scale: toNumber(body.cfg_scale),
        motion_bucket_id: toNumber(body.motion_bucket_id),
        resolution: body.resolution
      };

      const validation = validateTextToVideoParams(params);
      if (!validation.isValid) {
        return badRequest(res, validation);
      }

      console.log(`🎬 Generating text-to-video for prompt: "${params.prompt.substring(0, 100)}${params.prompt.length > 100 ? '...' : ''}"`);
      const result = await videoService.generateVideoFromPrompt(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /generate-video/image — image-to-video (multipart or JSON base64)
  async generateVideoFromImage(req, res, next) {
    try {
      const image = extractImage(req);
      if (!image) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'An image file (multipart field "image") or imageBase64 is required',
          code: 'MISSING_IMAGE'
        });
      }

      const body = req.body || {};
      const params = {
        ...image,
        seed: toNumber(body.seed),
        cfg_scale: toNumber(body.cfg_scale),
        motion_bucket_id: toNumber(body.motion_bucket_id),
        resolution: body.resolution
      };

      const validation = validateVideoParams(params);
      if (!validation.isValid) {
        return badRequest(res, validation);
      }

      console.log('🎬 Generating image-to-video...');
      const result = await videoService.generateImageToVideo(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /generate-video/async — start async image-to-video generation
  async startVideoGeneration(req, res, next) {
    try {
      const image = extractImage(req);
      if (!image) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'An image file (multipart field "image") or imageBase64 is required',
          code: 'MISSING_IMAGE'
        });
      }

      const body = req.body || {};
      const params = {
        ...image,
        seed: toNumber(body.seed),
        cfg_scale: toNumber(body.cfg_scale),
        motion_bucket_id: toNumber(body.motion_bucket_id),
        resolution: body.resolution
      };

      const validation = validateVideoParams(params);
      if (!validation.isValid) {
        return badRequest(res, validation);
      }

      console.log('🎬 Starting async image-to-video generation...');
      const result = await videoService.startImageToVideo(params);

      res.status(202).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /generate-video/result/:id — poll an async generation
  async getVideoResult(req, res, next) {
    try {
      const { id } = req.params;
      const result = await videoService.pollVideoResult(id);

      if (result.complete) {
        return res.json({ success: true, data: result });
      }
      res.status(202).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /generate-video/stitch — merge multiple clips into one MP4
  async stitchVideos(req, res, next) {
    try {
      const body = req.body || {};

      // Support either JSON (clips[] as data URLs) or multipart uploads
      // (multer stores files in req.files["clips"]).
      let clips = body.clips;
      if ((!clips || clips.length === 0) && req.files && req.files.length > 0) {
        clips = req.files.map((f) => `data:${f.mimetype || 'video/mp4'};base64,${f.buffer.toString('base64')}`);
      }

      const params = {
        clips,
        transition: (body.transition || 'cut').toLowerCase(),
        resolution: body.resolution,
        transition_duration: toNumber(body.transition_duration)
      };

      const validation = validateStitchParams(params);
      if (!validation.isValid) {
        return badRequest(res, validation);
      }

      console.log(`🧩 Stitching ${clips.length} clips (transition: ${params.transition})...`);
      const result = await videoStitchService.stitchClips(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VideoController();