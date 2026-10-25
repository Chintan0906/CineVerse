const express = require("express");
const router = express.Router();

const {
  getNetflixCatalogue,
  searchMovies,
  searchMultimedia,
  getMovieDetails,
  getTVShowDetails,
  getTVSeasonEpisodes,
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
router.get("/genre/:genre", async (req, res) => {
  try {
    const requestedGenre = req.params.genre.toLowerCase();
    const catalogue = await getNetflixCatalogue();

    const filtered = catalogue.allMovies.filter((movie) =>
      movie.genres.some((g) => g.toLowerCase() === requestedGenre)
    );

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Genre filter error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to filter movies by genre.",
    });
  }
});

// GET /api/movies/:id/seasons/:seasonNumber
router.get("/:id/seasons/:seasonNumber", async (req, res) => {
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

// GET /api/movies/:id
// Get details for a movie or TV show
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const type = req.query.type; // 'movie' or 'tv'

    let details;
    if (type === 'tv') {
      details = await getTVShowDetails(id);
    } else {
      // Try movie first, fallback to TV if not found
      try {
        details = await getMovieDetails(id);
      } catch (error) {
        details = await getTVShowDetails(id);
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
