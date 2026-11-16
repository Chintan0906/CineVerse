const express = require("express");
const router = express.Router();
const { getCuratedRecommendations } = require("../../services/recommendationService");
const { getUserForSession } = require("../../services/authService");

// Middleware to get user from session cookie
function authenticateUser(req, res, next) {
  const token = req.cookies?.cineverse_session;
  const user = getUserForSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  req.user = user;
  next();
}

// GET /api/recommendations/curated
router.get("/curated", authenticateUser, async (req, res) => {
  try {
    const recommendations = await getCuratedRecommendations(req.user.id);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error("Curated recommendations error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load recommendations." });
  }
});

module.exports = router;
