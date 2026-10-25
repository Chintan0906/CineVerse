const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./dnsConfig");

const movieRoutes = require("./routes/movieRoutes");
const authRoutes = require("./routes/authRoutes");
const { getTrendingMovies } = require("../services/tmdbService");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or any origin for public catalog API
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// Movie API
app.use("/api/movies", movieRoutes);
app.use("/api/auth", authRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to CineVerse API!",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CineVerse backend is running!",
    timestamp: new Date().toISOString(),
  });
});

// TMDB test endpoint
app.get("/api/tmdb-test", async (req, res) => {
  try {
    const movies = await getTrendingMovies();

    res.json({
      success: true,
      count: movies.length,
      movies: movies.slice(0, 5),
    });
  } catch (error) {
    console.error("TMDB test failed:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`CineVerse API running at http://localhost:${PORT}`);
});
