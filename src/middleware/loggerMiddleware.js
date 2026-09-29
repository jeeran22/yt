const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`${timestamp} - ${method} ${path} - IP: ${ip}`);
  
  // Log request body for POST requests (excluding sensitive data)
  if (method === 'POST' && req.body) {
    const logBody = { ...req.body };
    if (logBody.prompt) {
      logBody.prompt = logBody.prompt.substring(0, 100) + (logBody.prompt.length > 100 ? '...' : '');
    }
    console.log(`Request body:`, logBody);
  }
  
  next();
};

module.exports = {
  requestLogger
};