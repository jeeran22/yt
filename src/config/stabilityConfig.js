const STABILITY_CONFIG = {
  API_KEY: process.env.STABILITY_API_KEY,
  BASE_URL: 'https://api.stability.ai',
  ENDPOINTS: {
    // Official SD3 endpoint — model variant goes in the `model` form field,
    // there is no dedicated `/sd3-turbo` path (that returns 404).
    TURBO: '/v2beta/stable-image/generate/sd3',
    IMAGE_TO_VIDEO: '/v2beta/image-to-video',
    VIDEO_RESULT: '/v2beta/image-to-video/result'
  },
  MODELS: {
    TURBO: {
      name: 'Stable Diffusion 3 Turbo',
      maxDimensions: 1024,
      supportedDimensions: [512, 768, 1024],
      supportedFormats: ['png', 'jpeg', 'webp'],
      maxPromptLength: 10000,
      features: ['Fast generation', 'Lower cost', 'Good quality']
    },
    VIDEO: {
      name: 'Stable Video Diffusion',
      type: 'Image-to-Video',
      supportedResolutions: ['1024x576', '576x1024', '768x768'],
      supportedFormats: ['mp4'],
      maxDurationSeconds: 2,
      generatedFrames: 25,
      interpolationFrames: 24,
      fps: 24,
      watermarked: true,
      features: [
        'Image-to-video animation',
        'Motion strength control',
        'Seed-based reproducibility',
        '24fps MP4 output'
      ],
      parameterRanges: {
        cfgScale: { min: 0, max: 10, default: 1.8 },
        motionBucketId: { min: 1, max: 255, default: 127 },
        seed: { min: 0, max: 4294967294, default: 0 }
      }
    }
  },
  DEFAULT_PARAMS: {
    width: 1024,
    height: 1024,
    output_format: 'png'
  },
  VIDEO_DEFAULTS: {
    resolution: '1024x576',
    cfg_scale: 1.8,
    motion_bucket_id: 127,
    seed: 0
  }
};

module.exports = STABILITY_CONFIG;