const STABILITY_CONFIG = require('../config/stabilityConfig');

class StabilityService {
  constructor() {
    this.apiKey = STABILITY_CONFIG.API_KEY;
    this.baseUrl = STABILITY_CONFIG.BASE_URL;
    this.turboEndpoint = STABILITY_CONFIG.ENDPOINTS.TURBO;
  }

  // ------------------------------------------------------------------
  // IMAGE GENERATION (Stable Diffusion 3 Turbo)
  // ------------------------------------------------------------------

  async generateImage(params) {
    const rawImage = await this._generateImageRaw(params);

    return {
      imageUrl: `data:image/${rawImage.format};base64,${rawImage.imageBase64}`,
      prompt: rawImage.prompt,
      dimensions: { width: rawImage.width, height: rawImage.height },
      format: rawImage.format,
      seed: rawImage.seed,
      model: STABILITY_CONFIG.MODELS.TURBO.name,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Request the raw image from the Turbo model and return base64 + buffer.
   * Shared by the image endpoint and the text-to-video pipeline.
   */
  async _generateImageRaw(params) {
    const { prompt, width, height, seed, output_format, model = 'sd3-turbo', aspect_ratio } = params;

    try {
      // Prepare form data for Stability AI API (SD3 spec: aspect_ratio + model,
      // text-to-image mode; width/height are NOT accepted on this endpoint)
      const formData = new FormData();
      formData.append('prompt', prompt.trim());
      formData.append('model', model);
      formData.append('mode', 'text-to-image');
      formData.append('aspect_ratio', aspect_ratio || this._aspectRatioFor(width, height));
      formData.append('output_format', output_format);

      if (seed !== undefined) {
        formData.append('seed', seed.toString());
      }

      console.log(`🎨 Generating image with Turbo model for prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

      // Make request to Stability AI Turbo API
      const response = await fetch(`${this.baseUrl}${this.turboEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stability AI API Error:', response.status, errorData);

        throw {
          status: response.status || 500,
          error: 'Stability AI API Error',
          message: errorData.message || 'Failed to generate image with Turbo model',
          code: 'STABILITY_API_ERROR',
          details: errorData
        };
      }

      const result = await response.json();

      // Check if the response contains the expected image data
      if (!result.image) {
        console.error('Unexpected API response structure:', result);
        throw {
          status: 500,
          error: 'API Response Error',
          message: 'Unexpected response format from Stability AI Turbo',
          code: 'INVALID_RESPONSE'
        };
      }

      console.log(`✅ Turbo image generated successfully for prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

      return {
        imageBase64: result.image,
        buffer: Buffer.from(result.image, 'base64'),
        prompt,
        width,
        height,
        format: output_format,
        seed: result.seed || seed
      };
    } catch (error) {
      // Re-throw structured errors
      if (error && error.status) {
        throw error;
      }
      throw this._normalizeError(error, 'An unexpected error occurred while generating the image');
    }
  }

  // ------------------------------------------------------------------
  // Model metadata
  // ------------------------------------------------------------------

  getModelInfo() {
    return STABILITY_CONFIG.MODELS.TURBO;
  }

  getVideoModelInfo() {
    return STABILITY_CONFIG.MODELS.VIDEO;
  }

  // ------------------------------------------------------------------
  // Shared error normalization
  // ------------------------------------------------------------------

  // Map square turbo sizes onto SD3 aspect ratios (API takes aspect_ratio, not w/h).
  _aspectRatioFor(width, height) {
    if (width === height) return '1:1';
    if (width > height) return '16:9';
    return '9:16';
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

module.exports = new StabilityService();