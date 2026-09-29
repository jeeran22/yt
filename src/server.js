// Load environment variables FIRST, before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const imageRoutes = require('./routes/imageRoutes');
const healthRoutes = require('./routes/healthRoutes');
const modelRoutes = require('./routes/modelRoutes');
const videoRoutes = require('./routes/videoRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { requestLogger } = require('./middleware/loggerMiddleware');
const { validateApiKey } = require('./utils/validation');

const app = express();
const PORT = process.env.PORT || 1000;

// Validate API key on startup
validateApiKey();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/health', healthRoutes);
app.use('/generate-image', imageRoutes);
app.use('/generate-video', videoRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/models', modelRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Stability AI Media Generation Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log(`   - POST http://localhost:${PORT}/generate-image`);
  console.log(`   - POST http://localhost:${PORT}/generate-video            (text-to-video)`);
  console.log(`   - POST http://localhost:${PORT}/generate-video/image      (image-to-video)`);
  console.log(`   - POST http://localhost:${PORT}/generate-video/async      (async image-to-video)`);
  console.log(`   - GET  http://localhost:${PORT}/generate-video/result/:id (poll async result)`);
  console.log(`   - POST http://localhost:${PORT}/generate-video/stitch     (merge clips into one video)`);
  console.log(`   - POST http://localhost:${PORT}/campaigns/marketing       (product promo video, shots[] = multi-shot job)`);
  console.log(`   - POST http://localhost:${PORT}/campaigns/youtube         (YouTube niche video, shots[] = multi-shot job)`);
  console.log(`   - GET  http://localhost:${PORT}/campaigns/jobs/:id        (poll multi-shot campaign job)`);
  console.log(`   - GET  http://localhost:${PORT}/campaigns                 (campaign presets)`);
  console.log(`   - GET  http://localhost:${PORT}/models`);
  console.log(`✨ Image: Stable Diffusion 3 Turbo | Video: Stable Video Diffusion | Stitch: ffmpeg`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});