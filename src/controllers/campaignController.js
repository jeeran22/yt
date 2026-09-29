const campaignService = require('../services/campaignService');
const clipStoreService = require('../services/clipStoreService');
const {
  validateMarketingCampaignParams,
  validateYouTubeCampaignParams,
  validateCampaignShots
} = require('../utils/validation');

const parseJsonField = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

class CampaignController {
  // GET /campaigns — list all available presets (for UI form population)
  getPresets(req, res) {
    res.json({
      success: true,
      data: campaignService.getPresets()
    });
  }

  // POST /campaigns/marketing — product promotion video.
  // Without shots:   generates a single video (200).
  // With shots[]:    starts a multi-shot job (generate + stitch) and returns 202 + jobId.
  async generateMarketingVideo(req, res, next) {
    try {
      const body = req.body || {};
      const validation = validateMarketingCampaignParams(body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Bad Request',
          message: validation.message,
          code: validation.code
        });
      }

      // With multipart uploads JSON fields arrive as strings
      let product = body.product;
      if (typeof product === 'string') {
        product = JSON.parse(product);
      }
      const style = parseJsonField(body.style);
      const shots = parseJsonField(body.shots);

      // Support uploading the product photo directly (multipart field "image")
      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
        product.imageBuffer = req.file.buffer;
        product.imageMimeType = req.file.mimetype || 'image/png';
      }

      // Multi-shot campaign job (async)
      if (Array.isArray(shots)) {
        const shotsValidation = validateCampaignShots(shots);
        if (!shotsValidation.isValid) {
          return res.status(400).json({
            error: 'Bad Request',
            message: shotsValidation.message,
            code: shotsValidation.code
          });
        }

        const job = clipStoreService.create('marketing', { shotsTotal: shots.length });
        console.log(`📢 Starting marketing job ${job.id} for product: "${product.name}" (${shots.length} shots)`);

        campaignService.processMarketingJob(job.id, {
          product,
          style,
          seed: body.seed,
          shots,
          transition: body.transition,
          resolution: body.resolution,
          transition_duration: body.transition_duration
        });

        return res.status(202).json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            shotsTotal: shots.length,
            pollUrl: `/campaigns/jobs/${job.id}`
          }
        });
      }

      console.log(`📢 Generating marketing video for product: "${product.name}"`);
      const result = await campaignService.generateMarketingVideo({
        product,
        style,
        seed: body.seed
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /campaigns/youtube — niche creator video.
  // Without shots:   generates a single video (200).
  // With shots[]:    starts a multi-shot job (generate + stitch) and returns 202 + jobId.
  async generateYouTubeVideo(req, res, next) {
    try {
      const body = req.body || {};
      const validation = validateYouTubeCampaignParams(body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Bad Request',
          message: validation.message,
          code: validation.code
        });
      }

      const shots = parseJsonField(body.shots);

      // Multi-shot campaign job (async)
      if (Array.isArray(shots)) {
        const shotsValidation = validateCampaignShots(shots);
        if (!shotsValidation.isValid) {
          return res.status(400).json({
            error: 'Bad Request',
            message: shotsValidation.message,
            code: shotsValidation.code
          });
        }

        const job = clipStoreService.create('youtube', { shotsTotal: shots.length });
        console.log(`🎥 Starting YouTube job ${job.id} for niche: "${body.niche}" (${shots.length} shots)`);

        campaignService.processYouTubeJob(job.id, {
          niche: body.niche,
          videoType: body.videoType,
          topic: body.topic,
          mood: body.mood,
          style: parseJsonField(body.style),
          seed: body.seed,
          shots,
          transition: body.transition,
          resolution: body.resolution,
          transition_duration: body.transition_duration
        });

        return res.status(202).json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            shotsTotal: shots.length,
            pollUrl: `/campaigns/jobs/${job.id}`
          }
        });
      }

      console.log(`🎥 Generating YouTube ${body.videoType || 'b_roll'} video for niche: "${body.niche}"`);
      const result = await campaignService.generateYouTubeVideo(body);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /campaigns/jobs/:id — poll a multi-shot campaign job
  getJob(req, res, next) {
    try {
      const job = clipStoreService.get(req.params.id);
      if (!job) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Job not found or expired',
          code: 'JOB_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          kind: job.kind,
          status: job.status,
          shotsTotal: job.shotsTotal,
          shotsDone: job.shotsDone,
          result: job.result,
          error: job.error,
          createdAt: job.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CampaignController();