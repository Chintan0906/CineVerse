const express = require("express");
const router = express.Router();
const { getFlixHQStream } = require("../../services/consumetService");

/**
 * GET /api/stream/consumet
 * Query params: title, year, type ('movie' | 'tv'), season, episode
 * Returns direct HLS stream (.m3u8), qualities, and subtitle tracks
 */
router.get("/consumet", async (req, res) => {
  const { title, year, type, season, episode } = req.query;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Title query parameter is required.",
    });
  }

  const isTv = type === "tv";
  const sNum = Number.parseInt(season, 10) || 1;
  const eNum = Number.parseInt(episode, 10) || 1;

  try {
    const streamData = await getFlixHQStream(title, year, isTv, sNum, eNum);

    if (!streamData || !streamData.sources || streamData.sources.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No stream sources found via Consumet FlixHQ.",
      });
    }

    res.json({
      success: true,
      data: streamData,
    });
  } catch (error) {
    console.error("Stream route error:", error.message);
    res.status(502).json({
      success: false,
      message: "Failed to extract stream from provider.",
    });
  }
});

module.exports = router;
