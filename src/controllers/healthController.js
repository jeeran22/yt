class HealthController {
  getHealth(req, res) {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'Stability AI Image & Video Generation API',
      model: 'Stable Diffusion 3 Turbo',
      videoModel: 'Stable Video Diffusion',
      version: '2.0.0'
    });
  }
}

module.exports = new HealthController();