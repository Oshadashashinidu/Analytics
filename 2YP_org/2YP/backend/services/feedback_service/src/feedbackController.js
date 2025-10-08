// services/feedback_service/src/feedbackController.js
const { getFeedbackWithDetails } = require('./feedbackService');

async function fetchFeedback(req, res) {
  try {
    const data = await getFeedbackWithDetails();
    res.json({
      message: "✅ Feedback fetched with event + building details",
      feedback: data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  fetchFeedback,
};
