const stabilityService = require('../services/stabilityService');
const { validateImageParams } = require('../utils/validation');

class ImageController {
  async generateImage(req, res, next) {
    try {
      const { prompt, width = 1024, height = 1024, seed, output_format = 'png' } = req.body;

      // Validate parameters
      const validation = validateImageParams({ prompt, width, height, output_format });
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Bad Request',
          message: validation.message,
          code: validation.code
        });
      }

      // Generate image using Stability service
      const result = await stabilityService.generateImage({
        prompt,
        width,
        height,
        seed,
        output_format
      });

      // Return success response
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ImageController();