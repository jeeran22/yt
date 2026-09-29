const videoService = require('./videoService');
const videoStitchService = require('./videoStitchService');
const clipStoreService = require('./clipStoreService');
const STABILITY_CONFIG = require('../config/stabilityConfig');
const CAMPAIGNS_CONFIG = require('../config/campaignsConfig');

// SD3 Turbo only produces square keyframes; 768x768 feeds SVD's square
// output format cleanly. Feed landscape/portrait images through the
// image-to-video or campaign image upload path for 16:9 / 9:16 output.
const DEFAULT_IMAGE_SIZE = 768;

const toNumber = (value) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

class CampaignService {
  getPresets() {
    return {
      marketing: {
        productTypes: CAMPAIGNS_CONFIG.MARKETING.productTypes,
        motionSettings: CAMPAIGNS_CONFIG.MARKETING.motion,
        fps: STABILITY_CONFIG.MODELS.VIDEO.fps,
        maxDurationSeconds: STABILITY_CONFIG.MODELS.VIDEO.maxDurationSeconds,
        supportedResolutions: STABILITY_CONFIG.MODELS.VIDEO.supportedResolutions
      },
      youtube: {
        niches: CAMPAIGNS_CONFIG.YOUTUBE.niches,
        videoTypes: CAMPAIGNS_CONFIG.YOUTUBE.videoTypes,
        moods: Object.keys(CAMPAIGNS_CONFIG.YOUTUBE.moods),
        motionSettings: CAMPAIGNS_CONFIG.YOUTUBE.motion,
        fps: STABILITY_CONFIG.MODELS.VIDEO.fps,
        maxDurationSeconds: STABILITY_CONFIG.MODELS.VIDEO.maxDurationSeconds
      }
    };
  }

  // ------------------------------------------------------------------
  // MARKETING CAMPAIGNS (product promotion videos)
  // ------------------------------------------------------------------

  async generateMarketingVideo(params) {
    const { product, style = {}, seed } = params;
    const type = (product.type || 'physical').toLowerCase();
    const brief = this._buildMarketingBrief(product, style);

    const defaultMotion = CAMPAIGNS_CONFIG.MARKETING.motion[type];
    const motion_bucket_id = toNumber(style.motion_bucket_id) || defaultMotion.motion_bucket_id;
    const cfg_scale = toNumber(style.cfg_scale) || defaultMotion.cfg_scale;

    let result;

    if (product.imageBuffer || product.imageBase64) {
      // Animate the provided product image directly (image-to-video)
      const video = await videoService.generateImageToVideo({
        imageBuffer: product.imageBuffer,
        imageBase64: product.imageBase64,
        imageMimeType: product.imageMimeType || `image/${product.imageFormat || 'png'}`,
        seed,
        cfg_scale,
        motion_bucket_id
      });

      const source = product.imageBase64;
      result = {
        ...video,
        sourceImage: source
          ? (source.startsWith('data:') ? source : `data:image/${product.imageFormat || 'png'};base64,${source}`)
          : null,
        prompt: brief.imagePrompt
      };
    } else {
      // End-to-end text-to-video: generate a keyframe with SD3 Turbo, then animate it
      const video = await videoService.generateVideoFromPrompt({
        prompt: brief.imagePrompt,
        width: toNumber(style.width) || DEFAULT_IMAGE_SIZE,
        height: toNumber(style.height) || DEFAULT_IMAGE_SIZE,
        seed,
        output_format: 'png',
        cfg_scale,
        motion_bucket_id
      });
      result = { ...video };
    }

    return {
      campaign: 'marketing',
      product: { name: product.name, type },
      videoUrl: result.videoUrl,
      sourceImage: result.sourceImage,
      prompt: result.prompt,
      creativeBrief: brief,
      motion: { motion_bucket_id, cfg_scale },
      format: 'mp4',
      seed: result.seed,
      model: result.model,
      durationSeconds: result.durationSeconds,
      generatedAt: result.generatedAt
    };
  }

  _buildMarketingBrief(product, style) {
    const type = (product.type || 'physical').toLowerCase();
    const template = CAMPAIGNS_CONFIG.MARKETING.promptTemplates[type];
    const mood = style.mood || 'high-end';
    const description = (product.description || `${type === 'digital' ? 'modern digital' : 'premium physical'} product from ${product.category || 'a leading brand'}`).trim();

    const prompt = template
      .replace('{product}', product.name.trim())
      .replace('{description}', description)
      .replace('{mood}', mood)
      .replace('{surface}', style.surface || (type === 'digital' ? 'a glowing glass platform' : 'a sleek rotating turntable'))
      .replace('{lighting}', style.lighting || 'dramatic rim lighting and soft reflections')
      .replace('{atmosphere}', style.atmosphere || 'gentle haze, floating dust particles, dark elegant backdrop')
      .replace('{accent}', style.accent || 'cyan')
      .replace('{style}', style.style || 'high-end commercial advertisement aesthetic');

    return {
      campaign: 'Marketing product showcase',
      productType: type,
      imagePrompt: prompt,
      motion: CAMPAIGNS_CONFIG.MARKETING.motion[type],
      recommendedResolution: '768x768',
      notes: 'Digital/SaaS promos favour brighter, faster motion; physical products use slower turntable motion. Supply a product photo (image upload or base64) for a true 16:9 / 9:16 result. Pass shots[] or use POST /generate-video/stitch for multi-clip server-side assembly.'
    };
  }

  // ------------------------------------------------------------------
  // YOUTUBE CAMPAIGNS (niche creator videos)
  // ------------------------------------------------------------------

  async generateYouTubeVideo(params) {
    const { niche, videoType = 'b_roll', topic, mood = 'calm', style = {}, seed } = params;
    const typeKey = videoType.toLowerCase();
    const moodKey = mood.toLowerCase();
    const brief = this._buildYouTubeBrief({ niche, videoType: typeKey, topic, mood: moodKey });

    const defaultMotion = CAMPAIGNS_CONFIG.YOUTUBE.motion[typeKey];
    const motion_bucket_id = toNumber(style.motion_bucket_id) || defaultMotion.motion_bucket_id;
    const cfg_scale = toNumber(style.cfg_scale) || defaultMotion.cfg_scale;

    const video = await videoService.generateVideoFromPrompt({
      prompt: brief.imagePrompt,
      width: toNumber(style.width) || DEFAULT_IMAGE_SIZE,
      height: toNumber(style.height) || DEFAULT_IMAGE_SIZE,
      seed,
      output_format: 'png',
      cfg_scale,
      motion_bucket_id
    });

    return {
      campaign: 'youtube',
      niche,
      videoType: typeKey,
      mood: moodKey,
      topic: topic || `a ${niche} video`,
      videoUrl: video.videoUrl,
      sourceImage: video.sourceImage,
      prompt: video.prompt,
      creativeBrief: brief,
      motion: { motion_bucket_id, cfg_scale },
      format: 'mp4',
      seed: video.seed,
      model: video.model,
      durationSeconds: video.durationSeconds,
      generatedAt: video.generatedAt
    };
  }

  _buildYouTubeBrief({ niche, videoType, topic, mood }) {
    const template = CAMPAIGNS_CONFIG.YOUTUBE.videoTypeTemplates[videoType];
    const nicheStyle = CAMPAIGNS_CONFIG.YOUTUBE.nicheStyles[niche];
    const moodText = CAMPAIGNS_CONFIG.YOUTUBE.moods[mood] || CAMPAIGNS_CONFIG.YOUTUBE.moods.calm;
    const topicText = topic || `a ${niche} video`;

    const prompt = template
      .replace('{niche}', niche)
      .replace('{topic}', topicText)
      .replace('{nicheStyle}', nicheStyle)
      .replace('{mood}', moodText);

    return {
      campaign: `YouTube ${videoType.replace('_', ' ')}`,
      niche,
      videoType,
      mood: moodText,
      topic: topicText,
      imagePrompt: prompt,
      motion: CAMPAIGNS_CONFIG.YOUTUBE.motion[videoType],
      recommendedResolution: '768x768',
      notes: 'Each clip is ~2 seconds. Use shots[] (multi-shot campaigns) or POST /generate-video/stitch to assemble longer videos server-side.'
    };
  }

  // ------------------------------------------------------------------
  // MULTI-SHOT CAMPAIGN JOBS (generate + stitch, async via job store)
  // ------------------------------------------------------------------

  _seedFor(seed, index) {
    return seed === undefined ? undefined : seed + index;
  }

  _defaultStitchParams(params) {
    return {
      transition: params.transition || 'fade',
      resolution: params.resolution,
      transition_duration: params.transition_duration
    };
  }

  /**
   * Background worker for a marketing job. Generates each shot (reusing the
   * single-shot path), stitches them into one video, and stores the result.
   */
  async processMarketingJob(jobId, params) {
    const job = clipStoreService.get(jobId);
    if (!job) {
      return;
    }

    clipStoreService.update(jobId, { status: 'processing', shotsDone: 0, error: null });
    const shots = params.shots || [];
    const shotResults = [];

    try {
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const shotStyle = { ...(params.style || {}), ...shot };
        const single = await this.generateMarketingVideo({
          product: params.product,
          style: shotStyle,
          seed: this._seedFor(params.seed, i)
        });
        shotResults.push(single);
        clipStoreService.update(jobId, { shotsDone: i + 1 });
      }

      const stitched = await videoStitchService.stitchClips({
        clips: shotResults.map((r) => r.videoUrl),
        ...this._defaultStitchParams(params)
      });

      clipStoreService.update(jobId, {
        status: 'completed',
        result: {
          campaign: 'marketing',
          product: { name: params.product.name, type: (params.product.type || 'physical').toLowerCase() },
          videoUrl: stitched.videoUrl,
          format: 'mp4',
          clipCount: shotResults.length,
          durationSeconds: stitched.durationSeconds,
          transition: stitched.transition,
          resolution: stitched.resolution,
          shots: shotResults,
          generatedAt: stitched.generatedAt
        }
      });
    } catch (error) {
      clipStoreService.update(jobId, {
        status: 'failed',
        error: {
          message: error.message || 'Marketing job failed',
          code: error.code || 'JOB_FAILED',
          details: error.details
        }
      });
    }
  }

  /**
   * Background worker for a YouTube job. Each shot may override the
   * niche/videoType/topic/mood blend for varied sequences (e.g. intro + b-roll).
   */
  async processYouTubeJob(jobId, params) {
    const job = clipStoreService.get(jobId);
    if (!job) {
      return;
    }

    clipStoreService.update(jobId, { status: 'processing', shotsDone: 0, error: null });
    const shots = params.shots || [];
    const shotResults = [];

    try {
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const single = await this.generateYouTubeVideo({
          niche: shot.niche || params.niche,
          videoType: shot.videoType || params.videoType || 'b_roll',
          topic: shot.topic || params.topic,
          mood: shot.mood || params.mood || 'calm',
          style: { ...(params.style || {}), ...(shot.style || {}) },
          seed: this._seedFor(params.seed, i)
        });
        shotResults.push(single);
        clipStoreService.update(jobId, { shotsDone: i + 1 });
      }

      const stitched = await videoStitchService.stitchClips({
        clips: shotResults.map((r) => r.videoUrl),
        ...this._defaultStitchParams(params)
      });

      clipStoreService.update(jobId, {
        status: 'completed',
        result: {
          campaign: 'youtube',
          niche: params.niche,
          videoUrl: stitched.videoUrl,
          format: 'mp4',
          clipCount: shotResults.length,
          durationSeconds: stitched.durationSeconds,
          transition: stitched.transition,
          resolution: stitched.resolution,
          shots: shotResults,
          generatedAt: stitched.generatedAt
        }
      });
    } catch (error) {
      clipStoreService.update(jobId, {
        status: 'failed',
        error: {
          message: error.message || 'YouTube job failed',
          code: error.code || 'JOB_FAILED',
          details: error.details
        }
      });
    }
  }
}

module.exports = new CampaignService();