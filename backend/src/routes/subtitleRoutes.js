const express = require("express");

const router = express.Router();

router.get("/search", (req, res) => {
  res.json({ success: true, subtitles: [] });
});

router.post("/file", (req, res) => {
  res.status(404).json({ success: false, message: "Subtitle file proxy is disabled." });
});

module.exports = router;
