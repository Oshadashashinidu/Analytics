// services/feedback_service/src/routes.js
const express = require('express');
const { fetchFeedback } = require('./feedbackController');

const router = express.Router();

router.get('/feedback/details', fetchFeedback);

module.exports = router;
