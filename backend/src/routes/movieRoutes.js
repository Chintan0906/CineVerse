const express = require("express");
const router = express.Router();

const {
  getNetflixCatalogue,
  searchMovies,
  searchMultimedia,
  getMovieDetails,
  getTVShowDetails,
  getTVSeasonEpisodes,
  discoverByGenre,
} = require("../../services/tmdbService");

// GET /api/movies/netflix
// Return curated Netflix categories (Top 10, Trending, Action, Sci-Fi, etc.)
router.get("/netflix", async (req, res) => {
  try {
    const catalogue = await getNetflixCatalogue();

    res.json({
      success: true,
      categories: catalogue.categories,
      featuredMovies: catalogue.featuredMovies,
      count: catalogue.allMovies.length,
    });
  } catch (error) {
    console.error("Netflix catalogue error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load Netflix catalogue.",
    });
  }
});

// GET /api/movies
// Return complete catalogue of all available movies (~100+ titles)
router.get("/", async (req, res) => {
  try {
    const catalogue = await getNetflixCatalogue();

    res.json({
      success: true,
      count: catalogue.allMovies.length,
      data: catalogue.allMovies,
      categories: catalogue.categories,
      featuredMovies: catalogue.featuredMovies,
    });
  } catch (error) {
    console.error("Movie catalogue error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load movies.",
    });
  }
});

// GET /api/movies/search?q=query
// Search both movies and TV shows
router.get("/search", async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Please provide a search query using ?q=movie-name",
    });
  }

  try {
    const results = await searchMultimedia(query);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(502).json({
      success: false,
      message: "Search query failed.",
    });
  }
});

// GET /api/movies/genre/:genre
// Discover movies and series by genre from TMDB + catalogue
router.get("/genre/:genre", async (req, res) => {
  try {
    const requestedGenre = req.params.genre;
    const results = await discoverByGenre(requestedGenre);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Genre filter error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to filter movies by genre.",
    });
  }
});

// GET /api/movies/:id/seasons/:seasonNumber (also supports /tv/:id/seasons/:seasonNumber)
router.get(["/:id/seasons/:seasonNumber", "/tv/:id/seasons/:seasonNumber"], async (req, res) => {
  const showId = String(req.params.id);
  const seasonNumber = Number(req.params.seasonNumber);
  if (!/^\d+$/.test(showId) || !Number.isInteger(seasonNumber) || seasonNumber < 0) {
    return res.status(400).json({ success: false, message: "Invalid show or season ID." });
  }

  try {
    const episodes = await getTVSeasonEpisodes(showId, seasonNumber);
    res.json({ success: true, data: episodes });
  } catch (error) {
    console.error("TV season error:", error.message);
    res.status(502).json({ success: false, message: "Unable to load this season." });
  }
});

// GET /api/movies/tv/:id
// Explicit TV show details endpoint
router.get("/tv/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const details = await getTVShowDetails(id);
    res.json({ success: true, data: details });
  } catch (error) {
    console.error("TV Details error:", error.message);
    res.status(404).json({ success: false, message: "TV Show not found." });
  }
});

// GET /api/movies/subtitles?id=tmdbId&season=1&episode=1&language=en
// Server-side proxy: Keeps Wyzie & OpenSubtitles API keys 100% private
router.get("/subtitles", async (req, res) => {
  const { id, season, episode, language = "en" } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: "Missing media id." });
  }

  const workerUrl = process.env.WYZIE_WORKER_URL;
  const workerKey = process.env.NITRO_WORKER_KEY;
  const directKey = process.env.WYZIE_API_KEY;

  try {
    let rawTracks = [];

    // 1. Wyzie Worker Proxy (Option 1)
    if (workerUrl && workerKey) {
      const targetUrl = new URL("/search", workerUrl);
      targetUrl.searchParams.set("id", String(id));
      targetUrl.searchParams.set("language", String(language));
      if (season) targetUrl.searchParams.set("season", String(season));
      if (episode) targetUrl.searchParams.set("episode", String(episode));

      const workerRes = await fetch(targetUrl.toString(), {
        headers: {
          Authorization: `Bearer ${workerKey}`,
        },
      });

      if (workerRes.ok) {
        const data = await workerRes.json();
        rawTracks = Array.isArray(data)
          ? data
          : data.subtitles || data.results || data.data || [];
      }
    } else if (directKey) {
      // 2. Direct server-side call (keeps key off client bundles)
      const targetUrl = new URL("https://sub.wyzie.io/search");
      targetUrl.searchParams.set("id", String(id));
      targetUrl.searchParams.set("language", String(language));
      targetUrl.searchParams.set("key", String(directKey));
      if (season) targetUrl.searchParams.set("season", String(season));
      if (episode) targetUrl.searchParams.set("episode", String(episode));

      const wyzieRes = await fetch(targetUrl.toString());
      if (wyzieRes.ok) {
        const data = await wyzieRes.json();
        rawTracks = Array.isArray(data)
          ? data
          : data.subtitles || data.results || data.data || [];
      }
    }

    // 3. Fallback to OpenSubtitles server-side if OPEN_SUBTITLES_KEY is configured
    if (!rawTracks.length && process.env.OPEN_SUBTITLES_KEY) {
      const openSubsUrl = new URL("https://api.opensubtitles.com/api/v1/subtitles");
      openSubsUrl.searchParams.set("tmdb_id", String(id));
      openSubsUrl.searchParams.set("languages", String(language));
      if (season) openSubsUrl.searchParams.set("season_number", String(season));
      if (episode) openSubsUrl.searchParams.set("episode_number", String(episode));

      const osRes = await fetch(openSubsUrl.toString(), {
        headers: {
          "Api-Key": process.env.OPEN_SUBTITLES_KEY,
          "User-Agent": "CineVerse v1.0",
        },
      });
      if (osRes.ok) {
        const data = await osRes.json();
        const list = data.data || [];
        rawTracks = list.map((item) => {
          const file = item.attributes?.files?.[0];
          return {
            id: item.id || String(file?.file_id),
            label: item.attributes?.release || file?.file_name || "English Subtitle",
            language: item.attributes?.language || language,
            fileId: file?.file_id,
            source: "OpenSubtitles",
          };
        });
      }
    }

    const formatted = rawTracks.map((item, idx) => ({
      id: item.id || `sub-${idx}`,
      label: item.display || item.name || item.label || `English Subtitle #${idx + 1}`,
      language: item.language || language,
      url: item.url || item.download || item.link || null,
      fileId: item.fileId || null,
      format: item.format || "vtt",
      source: item.source || "Wyzie Subs",
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("Subtitles fetch error:", err.message);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve subtitles.",
      data: [],
    });
  }
});

// GET /api/movies/:id
// Get details for a movie or TV show
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const type = req.query.type; // 'movie' or 'tv'

    let details;
    if (type === 'tv') {
      details = await getTVShowDetails(id);
    } else if (type === 'movie') {
      details = await getMovieDetails(id);
    } else {
      // Check if known in Netflix catalogue as TV
      let knownAsTv = false;
      try {
        const catalogue = await getNetflixCatalogue();
        const found = catalogue.allMovies.find((m) => String(m.id) === String(id));
        if (found && (found.isTV || found.mediaType === "tv")) {
          knownAsTv = true;
        }
      } catch (_) {}

      if (knownAsTv) {
        try {
          details = await getTVShowDetails(id);
        } catch (_) {
          details = await getMovieDetails(id);
        }
      } else {
        // Try movie first, fallback to TV if not found
        try {
          details = await getMovieDetails(id);
        } catch (error) {
          details = await getTVShowDetails(id);
        }
      }
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("Details error:", error.message);
    res.status(404).json({
      success: false,
      message: "Content not found.",
    });
  }
});

module.exports = router;
