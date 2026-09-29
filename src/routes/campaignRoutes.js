const express = require('express');
const multer = require('multer');
const campaignController = require('../controllers/campaignController');

const router = express.Router();

// Uploaded product images are kept in memory (no disk writes required)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// GET /campaigns — list all presets (product types, niches, video types, moods)
router.get('/', campaignController.getPresets);

// GET /campaigns/jobs/:id — poll a multi-shot campaign job
router.get('/jobs/:id', campaignController.getJob);

// POST /campaigns/marketing — product promotion video (multipart "image" optional)
router.post('/marketing', upload.single('image'), campaignController.generateMarketingVideo);

// POST /campaigns/youtube — niche creator video
router.post('/youtube', campaignController.generateYouTubeVideo);

module.exports = router;