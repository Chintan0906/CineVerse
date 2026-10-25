const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function getMovies() {
  const response = await fetch(`${API_BASE_URL}/movies`);

  if (!response.ok) {
    throw new Error("Failed to fetch movies from CineVerse API.");
  }

  const result = await response.json();

  return {
    movies: result.data || [],
    categories: result.categories || [],
    featuredMovies: result.featuredMovies || [],
  };
}

export async function getNetflixCatalogue() {
  const response = await fetch(`${API_BASE_URL}/movies/netflix`);

  if (!response.ok) {
    throw new Error("Failed to fetch Netflix catalogue.");
  }

  return response.json();
}

export async function getMovieById(id, type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const response = await fetch(
    `${API_BASE_URL}/movies/${encodeURIComponent(id)}${query}`
  );

  if (!response.ok) {
    throw new Error("Movie not found.");
  }

  const result = await response.json();

  return result.data;
}

export async function getTVShowById(id) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/movies/tv/${encodeURIComponent(id)}`
    );
    if (response.ok) {
      const result = await response.json();
      return result.data;
    }
  } catch (_) {}

  // Fallback to query param
  return getMovieById(id, "tv");
}

export async function getTVSeasonEpisodes(id, seasonNumber) {
  const response = await fetch(
    `${API_BASE_URL}/movies/${encodeURIComponent(id)}/seasons/${encodeURIComponent(seasonNumber)}`
  );
  if (!response.ok) throw new Error("Unable to load episodes for this season.");
  const result = await response.json();
  return result.data || [];
}

export async function searchMovies(query) {
  // Search both movies and TV shows
  const response = await fetch(
    `${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error("Failed to search.");
  }

  const result = await response.json();

  return result.data;
}

export async function getMoviesByGenre(genre) {
  const response = await fetch(
    `${API_BASE_URL}/movies/genre/${encodeURIComponent(genre)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch by genre.");
  }

  const result = await response.json();

  return result.data;
}
