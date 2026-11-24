const express = require("express");
const router = express.Router();

const TMDB_PRIMARY = "https://api.tmdb.org/3";
const TMDB_FALLBACK = "https://api.themoviedb.org/3";

router.use(async (req, res) => {
  const path = (req.path || "").replace(/^\/+/, "");
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "TMDB_API_KEY is not configured on the server.",
    });
  }

  const queryParams = new URLSearchParams();
  queryParams.set("api_key", apiKey);

  for (const [key, val] of Object.entries(req.query || {})) {
    if (key !== "api_key" && val !== undefined && val !== null) {
      queryParams.set(key, String(val));
    }
  }

  const fetchWithTimeout = async (baseUrl) => {
    const url = `${baseUrl}/${path}?${queryParams.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };

  try {
    let response;
    try {
      response = await fetchWithTimeout(TMDB_PRIMARY);
    } catch (_) {
      response = await fetchWithTimeout(TMDB_FALLBACK);
    }

    const data = await response.json();
    res.set("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    return res.status(response.status).json(data);
  } catch (error) {
    console.error(`TMDB proxy error for /${path}:`, error.message);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch from TMDB upstream.",
    });
  }
});

module.exports = router;
