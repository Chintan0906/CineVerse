const express = require("express");
const router = express.Router();
const { recordActivity } = require("../../services/recommendationService");
const { getUserForSession } = require("../../services/authService");

// Middleware to get user from session cookie
function authenticateUser(req, res, next) {
  const token = req.headers.cookie?.split("; ").find(row => row.startsWith("cineverse_session="))?.split("=")[1];
  const user = getUserForSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  req.user = user;
  next();
}

// POST /api/activity/record
router.post("/record", authenticateUser, async (req, res) => {
  try {
    await recordActivity(req.user.id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("Record activity error:", error.message);
    res.status(500).json({ success: false, message: "Unable to record activity." });
  }
});

module.exports = router;
