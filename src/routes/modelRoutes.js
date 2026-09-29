const express = require('express');
const modelController = require('../controllers/modelController');

const router = express.Router();

// GET /models
router.get('/', modelController.getModels);

module.exports = router;