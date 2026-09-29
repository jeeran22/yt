const express = require('express');
const imageController = require('../controllers/imageController');

const router = express.Router();

// POST /generate-image
router.post('/', imageController.generateImage);

module.exports = router;