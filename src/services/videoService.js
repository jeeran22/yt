const stabilityService = require('./stabilityService');
const STABILITY_CONFIG = require('../config/stabilityConfig');

class VideoService {
  constructor() {
    this.apiKey = STABILITY_CONFIG.API_KEY;
    this.baseUrl = STABILITY_CONFIG.BASE_URL;
    this.imageToVideoEndpoint = STABILITY_CONFIG.ENDPOINTS.IMAGE_TO_VIDEO;
    this.videoResultEndpoint = STABILITY_CONFIG.ENDPOINTS.VIDEO_RESULT;
    this.videoModel = STABILITY_CONFIG.MODELS.VIDEO;
  }

  // ------------------------------------------------------------------
  // Synchronous image-to-video generation
  // ------------------------------------------------------------------

  /**
   * Animates a single image into a short MP4 clip using Stable Video Diffusion.
   * Accepts params.imageBuffer (binary) or params.imageBase64.
   */
  async generateImageToVideo(params) {
    const cfg_scale = this._defaultOr(params.cfg_scale, STABILITY_CONFIG.VIDEO_DEFAULTS.cfg_scale);
    const motion_bucket_id = this._defaultOr(params.motion_bucket_id, STABILITY_CONFIG.VIDEO_DEFAULTS.motion_bucket_id);
    const seed = this._defaultOr(params.seed, STABILITY_CONFIG.VIDEO_DEFAULTS.seed);

    const formData = this._buildVideoFormData({ ...params, seed, cfg_scale, motion_bucket_id });

    try {
      console.log(`🎬 Generating video with Stable Video Diffusion (motion: ${motion_bucket_id}, cfg: ${cfg_scale})...`);

      const response = await fetch(`${this.baseUrl}${this.imageToVideoEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stability AI Video API Error:', response.status, errorData);

        throw {
          status: response.status || 500,
          error: 'Stability AI Video API Error',
          message: errorData.message || 'Failed to generate video',
          code: 'STABILITY_API_ERROR',
          details: errorData
        };
      }

      const analysis = await this._parseVideoResponse(response);
      console.log(`✅ Video generated successfully (${analysis.finishReason})`);

      return {
        videoUrl: analysis.videoUrl,
        format: 'mp4',
        seed: analysis.seed !== undefined ? analysis.seed : seed,
        cfg_scale,
        motion_bucket_id,
        model: this.videoModel.name,
        durationSeconds: this.videoModel.maxDurationSeconds,
        finishReason: analysis.finishReason,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error && error.status) {
        throw error;
      }
      throw this._normalizeError(error, 'An unexpected error occurred while generating the video');
    }
  }

  // ------------------------------------------------------------------
  // Async image-to-video generation (start then poll)
  // ------------------------------------------------------------------

  /**
   * Starts an async image-to-video generation and returns a generation id.
   * The caller polls it via pollVideoResult(id).
   */
  async startImageToVideo(params) {
    const cfg_scale = this._defaultOr(params.cfg_scale, STABILITY_CONFIG.VIDEO_DEFAULTS.cfg_scale);
    const motion_bucket_id = this._defaultOr(params.motion_bucket_id, STABILITY_CONFIG.VIDEO_DEFAULTS.motion_bucket_id);
    const seed = this._defaultOr(params.seed, STABILITY_CONFIG.VIDEO_DEFAULTS.seed);

    const formData = this._buildVideoFormData({ ...params, seed, cfg_scale, motion_bucket_id });

    try {
      console.log('🎬 Starting async video generation with Stable Video Diffusion...');

      const response = await fetch(`${this.baseUrl}${this.imageToVideoEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      // Async accepted - the API returned a generation id
      if (response.status === 202) {
        const data = await response.json();
        return { id: data.id, status: data.status || 'processing' };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stability AI Video API Error:', response.status, errorData);

        throw {
          status: response.status || 500,
          error: 'Stability AI Video API Error',
          message: errorData.message || 'Failed to start video generation',
          code: 'STABILITY_API_ERROR',
          details: errorData
        };
      }

      // Some accounts still respond synchronously (200) with the final video
      const analysis = await this._parseVideoResponse(response);
      return { id: null, status: 'completed', ...analysis };

    } catch (error) {
      if (error && error.status) {
        throw error;
      }
      throw this._normalizeError(error, 'An unexpected error occurred while starting video generation');
    }
  }

  /**
   * Polls an async generation. Returns { complete: false, status }
   * while processing, or { complete: true, videoUrl, ... } when done.
   */
  async pollVideoResult(id) {
    if (!id) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'A generation id is required',
        code: 'MISSING_GENERATION_ID'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}${this.videoResultEndpoint}/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      // Still processing
      if (response.status === 202) {
        const data = await response.json().catch(() => ({}));
        return { complete: false, status: data.status || 'processing' };
      }

      if (response.status === 404) {
        throw {
          status: 404,
          error: 'Not Found',
          message: `Generation ${id} not found or expired`,
          code: 'GENERATION_NOT_FOUND'
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stability AI Video Result Error:', response.status, errorData);

        throw {
          status: response.status || 500,
          error: 'Stability AI Video API Error',
          message: errorData.message || 'Failed to fetch video generation result',
          code: 'STABILITY_API_ERROR',
          details: errorData
        };
      }

      const analysis = await this._parseVideoResponse(response);

      return {
        complete: true,
        videoUrl: analysis.videoUrl,
        seed: analysis.seed,
        finishReason: analysis.finishReason,
        format: 'mp4',
        model: this.videoModel.name,
        durationSeconds: this.videoModel.maxDurationSeconds
      };

    } catch (error) {
      if (error && error.status) {
        throw error;
      }
      throw this._normalizeError(error, 'An unexpected error occurred while polling the video generation');
    }
  }

  // ------------------------------------------------------------------
  // End-to-end text-to-video pipeline
  // ------------------------------------------------------------------

  /**
   * Generates a video from a text prompt in two steps:
   *   1. Render a keyframe image with SD3 Turbo (reuses the image service).
   *   2. Animate the keyframe into a short MP4 with Stable Video Diffusion.
   */
  async generateVideoFromPrompt(params) {
    const { prompt, width, height, seed, output_format = 'png' } = params;
    const videoSeed = params.video_seed !== undefined ? params.video_seed : seed;

    // Step 1 - generate the keyframe image
    const imageRaw = await stabilityService._generateImageRaw({
      prompt,
      width,
      height,
      seed,
      output_format
    });

    // Step 2 - animate the keyframe into a video
    const video = await this.generateImageToVideo({
      imageBuffer: imageRaw.buffer,
      imageMimeType: `image/${output_format}`,
      seed: videoSeed,
      cfg_scale: params.cfg_scale,
      motion_bucket_id: params.motion_bucket_id
    });

    return {
      videoUrl: video.videoUrl,
      prompt,
      sourceImage: `data:image/${output_format};base64,${imageRaw.imageBase64}`,
      dimensions: { width, height },
      format: 'mp4',
      seed: video.seed || videoSeed,
      cfg_scale: video.cfg_scale,
      motion_bucket_id: video.motion_bucket_id,
      model: video.model,
      durationSeconds: video.durationSeconds,
      finishReason: video.finishReason,
      generatedAt: new Date().toISOString()
    };
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  _defaultOr(value, fallback) {
    return value === undefined || value === null ? fallback : value;
  }

  _buildVideoFormData(params) {
    const imageBuffer = params.imageBuffer || (params.imageBase64
      ? Buffer.from(params.imageBase64.replace(/^data:.*;base64,/, ''), 'base64')
      : null);

    if (!imageBuffer || imageBuffer.length === 0) {
      throw {
        status: 400,
        error: 'Bad Request',
        message: 'An image is required for image-to-video generation',
        code: 'MISSING_IMAGE'
      };
    }

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: params.imageMimeType || 'image/png' }), 'input.png');
    formData.append('seed', String(this._defaultOr(params.seed, STABILITY_CONFIG.VIDEO_DEFAULTS.seed)));
    formData.append('cfg_scale', String(this._defaultOr(params.cfg_scale, STABILITY_CONFIG.VIDEO_DEFAULTS.cfg_scale)));
    formData.append('motion_bucket_id', String(this._defaultOr(params.motion_bucket_id, STABILITY_CONFIG.VIDEO_DEFAULTS.motion_bucket_id)));

    return formData;
  }

  async _parseVideoResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    // Binary video payload (video/mp4 or application/octet-stream)
    if (contentType.includes('video') || contentType.includes('octet-stream')) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        videoUrl: `data:video/mp4;base64,${buffer.toString('base64')}`,
        seed: undefined,
        finishReason: 'SUCCESS'
      };
    }

    const json = await response.json().catch(() => ({}));

    if (json.finish_reason && json.finish_reason !== 'SUCCESS') {
      const isFiltered = json.finish_reason === 'CONTENT_FILTERED';
      throw {
        status: isFiltered ? 422 : 500,
        error: isFiltered ? 'Unprocessable Entity' : 'Video Generation Failed',
        message: `The video generation finished with reason: ${json.finish_reason}`,
        code: isFiltered ? 'CONTENT_FILTERED' : 'VIDEO_GENERATION_FAILED',
        details: json
      };
    }

    if (!json.video) {
      throw {
        status: 500,
        error: 'API Response Error',
        message: 'Unexpected response format from Stability AI video API',
        code: 'INVALID_RESPONSE'
      };
    }

    return {
      videoUrl: `data:video/mp4;base64,${json.video}`,
      seed: json.seed,
      finishReason: json.finish_reason || 'SUCCESS'
    };
  }

  _normalizeError(error, fallbackMessage) {
    if (error && error.status) {
      return error;
    }

    if (error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      return {
        status: 503,
        error: 'Service Unavailable',
        message: 'Unable to connect to Stability AI service',
        code: 'CONNECTION_ERROR'
      };
    }

    if (error && error.code === 'ETIMEDOUT') {
      return {
        status: 504,
        error: 'Gateway Timeout',
        message: 'Request to Stability AI service timed out',
        code: 'TIMEOUT_ERROR'
      };
    }

    return {
      status: 500,
      error: 'Internal Server Error',
      message: fallbackMessage,
      code: 'INTERNAL_ERROR'
    };
  }
}

module.exports = new VideoService();