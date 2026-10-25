require("../src/dnsConfig");

const BASE_URL = "https://www.omdbapi.com/";

const { getMovieArtwork } = require("./fanartService");

// Make requests to OMDb
async function requestOMDb(params) {
  let apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    throw new Error("OMDB_API_KEY is missing from backend/.env");
  }

  // Handle accidental full-URL configuration
  if (apiKey.includes("apikey=")) {
    const match = apiKey.match(/apikey=([^&]+)/);
    if (match) apiKey = match[1];
  }

  const url = new URL(BASE_URL);

  url.searchParams.set("apikey", apiKey);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OMDb HTTP error: ${response.status}`);
  }

  const result = await response.json();

  if (result.Response === "False") {
    throw new Error(result.Error || "OMDb request failed");
  }

  return result;
}

// Normalize movie metadata into a consistent format
function normalizeMovie(movie) {
  return {
    id: movie.imdbID,
    title: movie.Title,
    year: movie.Year,
    rating: movie.imdbRating || "N/A",

    genre: movie.Genre
      ? movie.Genre.split(",").map((item) => item.trim())
      : [],

    duration: movie.Runtime || "",
    description: movie.Plot || "",

    poster:
      movie.Poster && movie.Poster !== "N/A"
        ? movie.Poster
        : "",

    backdrop: "",
    logo: "",

    language: movie.Language || "",
    actors: movie.Actors || "",
    director: movie.Director || "",

    playback: {
      type: "unavailable",
      url: "",
    },
  };
}

// Search movies using OMDb
async function searchMovies(query) {
  const result = await requestOMDb({
    s: query,
    type: "movie",
  });

  return result.Search.map((movie) => ({
    id: movie.imdbID,
    title: movie.Title,
    year: movie.Year,

    rating: "N/A",
    genre: [],
    duration: "",
    description: "",

    poster:
      movie.Poster && movie.Poster !== "N/A"
        ? movie.Poster
        : "",

    backdrop: "",
    logo: "",

    playback: {
      type: "unavailable",
      url: "",
    },
  }));
}

// Get complete movie details and Fanart.tv artwork
async function getMovieDetails(imdbID) {
  // Fetch textual metadata from OMDb
  const movie = await requestOMDb({
    i: imdbID,
    plot: "full",
  });

  const normalizedMovie = normalizeMovie(movie);

  // Fetch artwork from Fanart.tv
  try {
    const artwork = await getMovieArtwork(movie.imdbID);

    return {
      ...normalizedMovie,

      // Prefer Fanart.tv poster, falling back to OMDb
      poster: artwork.poster || normalizedMovie.poster,

      backdrop: artwork.backdrop || "",
      logo: artwork.logo || "",
    };
  } catch (error) {
    // Keep movie details available if Fanart.tv fails
    console.error("Fanart.tv artwork error:", error.message);

    return normalizedMovie;
  }
}

module.exports = {
  searchMovies,
  getMovieDetails,
};