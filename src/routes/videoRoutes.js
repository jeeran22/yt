const express = require('express');
const multer = require('multer');
const videoController = require('../controllers/videoController');

const router = express.Router();

// Uploaded images are kept in memory (no disk writes required)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Larger limit for clip uploads (multiple MP4s)
const uploadClips = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 } // 25MB x 20 clips
});

// POST /generate-video — end-to-end text-to-video
router.post('/', videoController.generateVideoFromText);

// POST /generate-video/image — image-to-video (multipart "image" or JSON imageBase64)
router.post('/image', upload.single('image'), videoController.generateVideoFromImage);

// POST /generate-video/async — start async image-to-video generation
router.post('/async', upload.single('image'), videoController.startVideoGeneration);

// GET /generate-video/result/:id — poll an async generation
router.get('/result/:id', videoController.getVideoResult);

// POST /generate-video/stitch — merge multiple MP4 clips into one video
// (JSON body { clips: [dataUrl...], transition, resolution } OR multipart "clips" files)
router.post('/stitch', uploadClips.array('clips', 20), videoController.stitchVideos);

module.exports = router;