const errorHandler = (err, req, res, next) => {
  console.error('Error Handler:', err);

  // Handle structured errors from services
  if (err.status && err.error && err.message && err.code) {
    return res.status(err.status).json({
      error: err.error,
      message: err.message,
      code: err.code,
      details: err.details
    });
  }

  // Handle generic errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'GLOBAL_ERROR'
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
    availableRoutes: [
      'GET /health',
      'POST /generate-image',
      'POST /generate-video',
      'POST /generate-video/image',
      'POST /generate-video/async',
      'GET /generate-video/result/:id',
      'POST /campaigns/marketing',
      'POST /campaigns/youtube',
      'GET /campaigns',
      'GET /models'
    ]
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};