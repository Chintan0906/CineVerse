const express = require("express");
const { fetchWyzieSubtitleFile, searchWyzieSubtitles } = require("../../services/wyzieService");

const router = express.Router();
const searchWindows = new Map();
const MAX_SEARCHES_PER_MINUTE = 30;

function allowSearch(req, res, next) {
  const now = Date.now();
  const client = req.ip || req.socket.remoteAddress || "unknown";
  let window = searchWindows.get(client);
  if (!window || now - window.startedAt >= 60_000) {
    window = { startedAt: now, count: 0 };
    searchWindows.set(client, window);
  }
  window.count += 1;

  if (searchWindows.size > 5_000) {
    for (const [ip, entry] of searchWindows) {
      if (now - entry.startedAt >= 60_000) searchWindows.delete(ip);
    }
  }
  if (window.count > MAX_SEARCHES_PER_MINUTE) {
    return res.status(429).json({ success: false, message: "Too many subtitle searches. Please wait a minute and try again." });
  }
  return next();
}

router.get("/search", allowSearch, async (req, res) => {
  try {
    const subtitles = await searchWyzieSubtitles({
      id: req.query.id,
      season: req.query.season,
      episode: req.query.episode,
      language: req.query.language || "en",
    });
    res.json({ success: true, subtitles });
  } catch (error) {
    const status = Number.isInteger(error.statusCode) ? error.statusCode : 502;
    res.status(status).json({ success: false, message: error.message || "Subtitle search failed." });
  }
});

router.post("/file", async (req, res) => {
  try {
    const subtitle = await fetchWyzieSubtitleFile(req.body?.url);
    res.type("text/plain; charset=utf-8").send(subtitle);
  } catch (error) {
    const status = Number.isInteger(error.statusCode) ? error.statusCode : 502;
    res.status(status).json({ success: false, message: error.message || "Unable to download this subtitle." });
  }
});

module.exports = router;
