const stabilityService = require('../services/stabilityService');

class ModelController {
  getModels(req, res) {
    const imageModel = stabilityService.getModelInfo();
    const videoModel = stabilityService.getVideoModelInfo();

    res.json({
      success: true,
      data: {
        currentModel: imageModel.name,
        supportedDimensions: imageModel.supportedDimensions,
        supportedFormats: imageModel.supportedFormats,
        maxPromptLength: imageModel.maxPromptLength,
        features: imageModel.features,
        maxDimensions: imageModel.maxDimensions,
        video: {
          name: videoModel.name,
          type: videoModel.type,
          supportedResolutions: videoModel.supportedResolutions,
          supportedFormats: videoModel.supportedFormats,
          maxDurationSeconds: videoModel.maxDurationSeconds,
          fps: videoModel.fps,
          watermarked: videoModel.watermarked,
          parameterRanges: videoModel.parameterRanges,
          features: videoModel.features
        }
      }
    });
  }
}

module.exports = new ModelController();