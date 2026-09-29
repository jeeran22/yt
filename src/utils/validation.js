const STABILITY_CONFIG = require('../config/stabilityConfig');
const CAMPAIGNS_CONFIG = require('../config/campaignsConfig');

const TURBO_MODEL = STABILITY_CONFIG.MODELS.TURBO;
const VIDEO_MODEL = STABILITY_CONFIG.MODELS.VIDEO;

const validateApiKey = () => {
  if (!STABILITY_CONFIG.API_KEY) {
    console.error('❌ Error: STABILITY_API_KEY environment variable is required');
    console.log('Please create a .env file with your Stability AI API key:');
    console.log('STABILITY_API_KEY=your_api_key_here');
    process.exit(1);
  }
  console.log('✅ Stability AI API key loaded successfully');
};

const validateImageParams = (params) => {
  const { prompt, width, height, output_format } = params;

  // Validate prompt
  if (!prompt) {
    return {
      isValid: false,
      message: 'Text prompt is required',
      code: 'MISSING_PROMPT'
    };
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return {
      isValid: false,
      message: 'Prompt must be a non-empty string',
      code: 'INVALID_PROMPT'
    };
  }

  if (prompt.length > TURBO_MODEL.maxPromptLength) {
    return {
      isValid: false,
      message: `Prompt must be less than ${TURBO_MODEL.maxPromptLength} characters`,
      code: 'PROMPT_TOO_LONG'
    };
  }

  // Validate dimensions for Turbo model
  const validDimensions = TURBO_MODEL.supportedDimensions;
  if (!validDimensions.includes(width) || !validDimensions.includes(height)) {
    return {
      isValid: false,
      message: `Width and height must be one of: ${validDimensions.join(', ')} (Turbo model limitation)`,
      code: 'INVALID_DIMENSIONS'
    };
  }

  // Validate output format
  const validFormats = TURBO_MODEL.supportedFormats;
  if (!validFormats.includes(output_format)) {
    return {
      isValid: false,
      message: `Output format must be one of: ${validFormats.join(', ')}`,
      code: 'INVALID_FORMAT'
    };
  }

  return { isValid: true };
};

// ------------------------------------------------------------------
// VIDEO VALIDATION (Stable Video Diffusion - Image-to-Video)
// ------------------------------------------------------------------

// Validates the shared video configuration parameters (no image check).
const validateVideoConfigParams = (params) => {
  const { resolution, seed, cfg_scale, motion_bucket_id } = params;

  if (resolution !== undefined && !VIDEO_MODEL.supportedResolutions.includes(resolution)) {
    return {
      isValid: false,
      message: `Resolution must be one of: ${VIDEO_MODEL.supportedResolutions.join(', ')}`,
      code: 'INVALID_RESOLUTION'
    };
  }

  if (seed !== undefined &&
      (typeof seed !== 'number' || seed < VIDEO_MODEL.parameterRanges.seed.min || seed > VIDEO_MODEL.parameterRanges.seed.max)) {
    return {
      isValid: false,
      message: `Seed must be an integer between ${VIDEO_MODEL.parameterRanges.seed.min} and ${VIDEO_MODEL.parameterRanges.seed.max}`,
      code: 'INVALID_SEED'
    };
  }

  if (cfg_scale !== undefined &&
      (typeof cfg_scale !== 'number' || cfg_scale < VIDEO_MODEL.parameterRanges.cfgScale.min || cfg_scale > VIDEO_MODEL.parameterRanges.cfgScale.max)) {
    return {
      isValid: false,
      message: `cfg_scale must be a number between ${VIDEO_MODEL.parameterRanges.cfgScale.min} and ${VIDEO_MODEL.parameterRanges.cfgScale.max}`,
      code: 'INVALID_CFG_SCALE'
    };
  }

  if (motion_bucket_id !== undefined &&
      (typeof motion_bucket_id !== 'number' || motion_bucket_id < VIDEO_MODEL.parameterRanges.motionBucketId.min || motion_bucket_id > VIDEO_MODEL.parameterRanges.motionBucketId.max)) {
    return {
      isValid: false,
      message: `motion_bucket_id must be an integer between ${VIDEO_MODEL.parameterRanges.motionBucketId.min} and ${VIDEO_MODEL.parameterRanges.motionBucketId.max}`,
      code: 'INVALID_MOTION_BUCKET'
    };
  }

  return { isValid: true };
};

// Validates an image-to-video request (requires a source image).
const validateVideoParams = (params) => {
  if (!params.imageBuffer && !params.imageBase64) {
    return {
      isValid: false,
      message: 'An image file (multipart field "image") or imageBase64 is required',
      code: 'MISSING_IMAGE'
    };
  }

  return validateVideoConfigParams(params);
};

// Validates an end-to-end text-to-video request (prompt + optional config).
const validateTextToVideoParams = (params) => {
  const { prompt, width, height } = params;

  if (!prompt) {
    return {
      isValid: false,
      message: 'Text prompt is required',
      code: 'MISSING_PROMPT'
    };
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return {
      isValid: false,
      message: 'Prompt must be a non-empty string',
      code: 'INVALID_PROMPT'
    };
  }

  if (prompt.length > TURBO_MODEL.maxPromptLength) {
    return {
      isValid: false,
      message: `Prompt must be less than ${TURBO_MODEL.maxPromptLength} characters`,
      code: 'PROMPT_TOO_LONG'
    };
  }

  const validDimensions = TURBO_MODEL.supportedDimensions;
  if (width !== undefined && !validDimensions.includes(width)) {
    return {
      isValid: false,
      message: `Width must be one of: ${validDimensions.join(', ')} (Turbo model limitation)`,
      code: 'INVALID_DIMENSIONS'
    };
  }

  if (height !== undefined && !validDimensions.includes(height)) {
    return {
      isValid: false,
      message: `Height must be one of: ${validDimensions.join(', ')} (Turbo model limitation)`,
      code: 'INVALID_DIMENSIONS'
    };
  }

  return validateVideoConfigParams(params);
};

// ------------------------------------------------------------------
// CAMPAIGN VALIDATION
// ------------------------------------------------------------------

const validateMarketingCampaignParams = (params) => {
  const { product } = params;

  if (!product || typeof product !== 'object') {
    return {
      isValid: false,
      message: 'A product object is required',
      code: 'MISSING_PRODUCT'
    };
  }

  if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
    return {
      isValid: false,
      message: 'Product name is required',
      code: 'MISSING_PRODUCT_NAME'
    };
  }

  const validTypes = CAMPAIGNS_CONFIG.MARKETING.productTypes.map((p) => p.id);
  const type = (product.type || 'physical').toLowerCase();
  if (!validTypes.includes(type)) {
    return {
      isValid: false,
      message: `Product type must be one of: ${validTypes.join(', ')}`,
      code: 'INVALID_PRODUCT_TYPE'
    };
  }

  return { isValid: true };
};

const validateYouTubeCampaignParams = (params) => {
  const { niche, videoType, topic, mood } = params;

  if (!niche) {
    return {
      isValid: false,
      message: 'A niche is required',
      code: 'MISSING_NICHE'
    };
  }

  if (!CAMPAIGNS_CONFIG.YOUTUBE.niches.includes(niche)) {
    return {
      isValid: false,
      message: `Niche must be one of: ${CAMPAIGNS_CONFIG.YOUTUBE.niches.join(', ')}`,
      code: 'INVALID_NICHE'
    };
  }

  if (videoType !== undefined && !CAMPAIGNS_CONFIG.YOUTUBE.videoTypes.includes(videoType)) {
    return {
      isValid: false,
      message: `videoType must be one of: ${CAMPAIGNS_CONFIG.YOUTUBE.videoTypes.join(', ')}`,
      code: 'INVALID_VIDEO_TYPE'
    };
  }

  if (topic !== undefined && (typeof topic !== 'string' || topic.trim().length === 0)) {
    return {
      isValid: false,
      message: 'Topic must be a non-empty string',
      code: 'INVALID_TOPIC'
    };
  }

  if (mood !== undefined && !Object.keys(CAMPAIGNS_CONFIG.YOUTUBE.moods).includes(mood)) {
    return {
      isValid: false,
      message: `Mood must be one of: ${Object.keys(CAMPAIGNS_CONFIG.YOUTUBE.moods).join(', ')}`,
      code: 'INVALID_MOOD'
    };
  }

  return { isValid: true };
};

// ------------------------------------------------------------------
// STITCH VALIDATION (server-side clip merging)
// ------------------------------------------------------------------

const STITCH_LIMITS = {
  minClips: 2,
  maxClips: 20,
  minTransitionDuration: 0.1,
  maxTransitionDuration: 2.0
};

const validateStitchParams = (params) => {
  const { clips, transition, resolution, transition_duration } = params;

  if (!Array.isArray(clips) || clips.length < STITCH_LIMITS.minClips) {
    return {
      isValid: false,
      message: `At least ${STITCH_LIMITS.minClips} clips are required to stitch a video`,
      code: 'INVALID_CLIPS'
    };
  }

  if (clips.length > STITCH_LIMITS.maxClips) {
    return {
      isValid: false,
      message: `No more than ${STITCH_LIMITS.maxClips} clips can be stitched in one call`,
      code: 'TOO_MANY_CLIPS'
    };
  }

  for (const clip of clips) {
    const ok = typeof clip === 'string' ||
      (clip && typeof clip === 'object' && (clip.videoUrl || clip.data || clip.clip));
    if (!ok) {
      return {
        isValid: false,
        message: 'Each clip must be a base64 data URL string or an object with a videoUrl',
        code: 'INVALID_CLIPS'
      };
    }
  }

  if (transition !== undefined && !['cut', 'fade', 'dissolve'].includes(String(transition).toLowerCase())) {
    return {
      isValid: false,
      message: 'Transition must be one of: cut, fade, dissolve',
      code: 'INVALID_TRANSITION'
    };
  }

  if (resolution !== undefined && !VIDEO_MODEL.supportedResolutions.includes(String(resolution))) {
    return {
      isValid: false,
      message: `Resolution must be one of: ${VIDEO_MODEL.supportedResolutions.join(', ')}`,
      code: 'INVALID_RESOLUTION'
    };
  }

  if (transition_duration !== undefined &&
      (typeof transition_duration !== 'number' ||
       transition_duration < STITCH_LIMITS.minTransitionDuration ||
       transition_duration > STITCH_LIMITS.maxTransitionDuration)) {
    return {
      isValid: false,
      message: `transition_duration must be between ${STITCH_LIMITS.minTransitionDuration} and ${STITCH_LIMITS.maxTransitionDuration} seconds`,
      code: 'INVALID_TRANSITION_DURATION'
    };
  }

  return { isValid: true };
};

// Validates the shots[] array used to build multi-shot campaign videos.
const validateCampaignShots = (shots) => {
  if (!Array.isArray(shots) || shots.length < 2) {
    return {
      isValid: false,
      message: 'shots must be an array of at least 2 shot descriptors',
      code: 'INVALID_SHOTS'
    };
  }

  if (shots.length > 10) {
    return {
      isValid: false,
      message: 'shots must not exceed 10 descriptors',
      code: 'TOO_MANY_SHOTS'
    };
  }

  for (const shot of shots) {
    if (!shot || typeof shot !== 'object' || Object.keys(shot).length === 0) {
      return {
        isValid: false,
        message: 'Each shot must be a non-empty object',
        code: 'INVALID_SHOTS'
      };
    }
  }

  return { isValid: true };
};

module.exports = {
  validateApiKey,
  validateImageParams,
  validateVideoParams,
  validateVideoConfigParams,
  validateTextToVideoParams,
  validateMarketingCampaignParams,
  validateYouTubeCampaignParams,
  validateStitchParams,
  validateCampaignShots
};