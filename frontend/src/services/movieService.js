import { movies as fallbackMovies } from "../data/movies";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalhost ? "http://localhost:3000/api" : "/api");

const TMDB_API_KEY = "c38f3318c1885596d981f6ffc938dfaf";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// TMDB Genre ID to Name mapping (Movies & TV)
const TMDB_GENRES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const KNOWN_SYNOPSES = {
  "969681": "Fighting crime full-time as Spider-Man in a world that doesn't remember him—and the pressure of seeing his old friends move on without him—sparks a change in Peter Parker he may not have the power to control. But that transformation might also be the only thing that can stop a shocking new threat to the city and those he loves - a powerful villain no one can even see.",
  "1170608": "Nearly two decades after he seized control of the Imperium, Paul Atreides is now a ruthless Emperor, and must face the consequences of his reign as old allies return, terrifying new threats emerge, and betrayal lurks in every shadow.",
  "569094": "Miles Morales embarks on an epic cross-dimensional journey alongside Gwen Stacy and an alliance of Spider-Heroes to challenge destiny and save every dimension from total collapse.",
  "1022789": "Earth's mightiest heroes and allies across the multiverse unite to face the greatest multiversal cataclysm in history, where realities collide in a fight for the existence of all creation.",
  "1003596": "The Avengers assemble to confront Doctor Doom as he threatens the multiversal timeline with cosmic mastery and technological dominance.",
  "1003598": "Bruce Wayne delves deeper into Gotham's criminal underworld as Batman, confronting new corrupt forces and psychological perils that threaten to unravel the city.",
  "1064213": "Superman embarks on a journey to reconcile his Kryptonian heritage with his human upbringing as Clark Kent in Smallville, Kansas, standing as the embodiment of truth, justice, and kindness in a world that views kindness as old-fashioned.",
};

function readCatalogueCache() {
  try {
    const raw = sessionStorage.getItem("cineverse_catalogue_cache") || localStorage.getItem("cineverse_catalogue_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.movies) && parsed.movies.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

function findMovieInCache(id) {
  const cache = readCatalogueCache();
  if (cache && Array.isArray(cache.movies)) {
    const found = cache.movies.find(
      (m) => String(m.id) === String(id) || String(m.tmdbId) === String(id)
    );
    if (found) return found;
  }
  const fallback = fallbackMovies.find(
    (m) => String(m.id) === String(id) || String(m.tmdbId) === String(id)
  );
  return fallback || null;
}

function normalizeTMDBMovie(item, isTvOverride = false) {
  if (!item) return null;
  const isTv =
    isTvOverride ||
    item.media_type === "tv" ||
    Boolean(item.first_air_date) ||
    Boolean(item.number_of_seasons);

  let genres = [];
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    genres = item.genres.map((g) => (typeof g === "string" ? g : g.name)).filter(Boolean);
  } else if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
    genres = item.genre_ids.map((gid) => TMDB_GENRES[gid]).filter(Boolean);
  }
  if (genres.length === 0) genres = ["Cinema"];

  const year = (item.release_date || item.first_air_date || "").slice(0, 4) || "2024";

  let duration = "";
  if (item.runtime) {
    const hours = Math.floor(item.runtime / 60);
    const mins = item.runtime % 60;
    duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else if (isTv && item.number_of_seasons) {
    duration = `${item.number_of_seasons} Season${item.number_of_seasons > 1 ? "s" : ""}`;
  } else {
    duration = isTv ? "TV Series" : "2h 10m";
  }

  const rating =
    item.vote_average != null && item.vote_average > 0
      ? item.vote_average.toFixed(1)
      : "7.8";

  const poster = item.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}`
    : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";

  const backdrop = item.backdrop_path
    ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}`
    : poster;

  const idStr = String(item.id || "");
  let description = item.overview || "";
  if (!description || description.trim().length < 15) {
    if (KNOWN_SYNOPSES[idStr]) {
      description = KNOWN_SYNOPSES[idStr];
    } else {
      const gStr = genres.slice(0, 2).join(" & ");
      const titleName = item.title || item.name || "This title";
      description = `${titleName} is an acclaimed ${gStr} story exploring high-stakes conflict, profound emotional journeys, and celebrated cinematic storytelling.`;
    }
  }

  const cast = (item.credits?.cast || []).slice(0, 12).map((actor) => ({
    id: actor.id,
    name: actor.name,
    character: actor.character,
    profile: actor.profile_path
      ? `${TMDB_IMAGE_BASE}/w185${actor.profile_path}`
      : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
  }));

  const trailerVideo =
    (item.videos?.results || []).find(
      (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    ) ||
    (item.videos?.results || []).find((v) => v.site === "YouTube") ||
    item.videos?.results?.[0];

  const trailerUrl = trailerVideo
    ? `https://www.youtube.com/embed/${trailerVideo.key}?autoplay=1&mute=0`
    : null;
  const trailerKey = trailerVideo?.key || null;

  const similar = (item.similar?.results || []).slice(0, 12).map((m) => normalizeTMDBMovie(m, isTv));

  return {
    id: String(item.id),
    tmdbId: item.id,
    title: item.title || item.name || "Untitled",
    year,
    rating,
    genre: genres[0] || "Cinema",
    genres,
    duration,
    description,
    overview: description,
    poster,
    backdrop,
    mediaType: isTv ? "tv" : "movie",
    isTV: isTv,
    cast,
    trailerUrl,
    trailerKey,
    similar,
    seasons: item.seasons || [],
    numberOfSeasons: item.number_of_seasons || (item.seasons?.length || 0),
    status: item.status || "Released",
    tagline: item.tagline || "",
    voteCount: item.vote_count || 0,
    tags: genres.map((g) => g.toLowerCase()),
  };
}

export async function getMovies() {
  try {
    const response = await fetch(`${API_BASE_URL}/movies`);
    if (response.ok) {
      const result = await response.json();
      return {
        movies: result.data || [],
        categories: result.categories || [],
        featuredMovies: result.featuredMovies || [],
      };
    }
  } catch (_) {}

  // Fallback to cache or bundled data
  const cached = readCatalogueCache();
  if (cached && Array.isArray(cached.movies) && cached.movies.length > 0) {
    return cached;
  }

  return {
    movies: fallbackMovies,
    categories: [],
    featuredMovies: fallbackMovies.filter((m) => m.featured || m.trending),
  };
}

export async function getNetflixCatalogue() {
  try {
    const response = await fetch(`${API_BASE_URL}/movies/netflix`);
    if (response.ok) {
      return response.json();
    }
  } catch (_) {}

  const cached = readCatalogueCache();
  return {
    categories: cached?.categories || [],
    featuredMovies: cached?.featuredMovies || fallbackMovies.slice(0, 5),
    allMovies: cached?.movies || fallbackMovies,
  };
}

export async function getMovieReels(offset = 0, limit = 8) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/movies/reels?offset=${encodeURIComponent(offset)}&limit=${encodeURIComponent(limit)}`
    );
    if (response.ok) {
      const result = await response.json();
      return {
        reels: result.reels || [],
        nextOffset: result.nextOffset ?? offset,
        hasMore: Boolean(result.hasMore),
      };
    }
  } catch (_) {}

  return {
    reels: [],
    nextOffset: offset,
    hasMore: false,
  };
}

export async function getKinoCheckMovieReels({ feed = "trending", page = 1, limit = 12, category = "all", language = "en", seed, signal } = {}) {
  try {
    const params = new URLSearchParams({ feed, page: String(page), limit: String(limit), category, language });
    if (seed) params.set("seed", String(seed));
    const response = await fetch(`${API_BASE_URL}/movies/movie-reels?${params}`, { signal });
    if (response.ok) {
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        return {
          videos: result.videos || [],
          page: result.page || page,
          totalPages: result.totalPages || page,
          hasMore: Boolean(result.hasMore),
        };
      }
    }
  } catch (_) {}

  return {
    videos: [],
    page,
    totalPages: page,
    hasMore: false,
  };
}

export async function getMovieById(id, type) {
  // 1. Try backend API first
  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    const response = await fetch(
      `${API_BASE_URL}/movies/${encodeURIComponent(id)}${query}`
    );
    if (response.ok) {
      const result = await response.json();
      if (result.data) return result.data;
    }
  } catch (_) {}

  // 2. Check local catalogue cache
  const cached = findMovieInCache(id);
  if (cached && cached.description && cached.backdrop) {
    return cached;
  }

  // 3. Fallback directly to TMDB API (browser client fetch over HTTPS)
  const isTv = type === "tv";
  const primaryPath = isTv ? `/tv/${id}` : `/movie/${id}`;
  const secondaryPath = isTv ? `/movie/${id}` : `/tv/${id}`;

  try {
    const tmdbRes = await fetch(
      `${TMDB_BASE_URL}${primaryPath}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar`
    );
    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      return normalizeTMDBMovie(data, isTv);
    }
  } catch (_) {}

  try {
    const fallbackRes = await fetch(
      `${TMDB_BASE_URL}${secondaryPath}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar`
    );
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      return normalizeTMDBMovie(data, !isTv);
    }
  } catch (_) {}

  // 4. Return cached version if found
  if (cached) return cached;

  // 5. Synthesize clean title from known list or generic ID
  const idStr = String(id);
  const knownDesc = KNOWN_SYNOPSES[idStr];
  let knownTitle = "Featured Cinema";
  if (idStr === "969681") knownTitle = "Spider-Man: Brand New Day";
  else if (idStr === "1170608") knownTitle = "Dune: Part Three";
  else if (idStr === "569094") knownTitle = "Spider-Man: Beyond the Spider-Verse";
  else if (idStr === "1022789") knownTitle = "Avengers: Secret Wars";
  else if (idStr === "1003596") knownTitle = "Avengers: Doomsday";

  return {
    id: idStr,
    tmdbId: Number(id) || idStr,
    title: knownTitle,
    year: "2024",
    rating: "8.2",
    genre: "Action",
    genres: ["Action", "Sci-Fi", "Cinema"],
    duration: "2h 18m",
    description:
      knownDesc ||
      "An acclaimed cinematic story exploring high-stakes conflict, profound emotional journeys, and celebrated storytelling.",
    overview:
      knownDesc ||
      "An acclaimed cinematic story exploring high-stakes conflict, profound emotional journeys, and celebrated storytelling.",
    poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zViRwl3ySscZnbXZJ2Q9wq3SeUG.jpg",
    mediaType: isTv ? "tv" : "movie",
    isTV: isTv,
    cast: [],
    similar: [],
    seasons: [],
    numberOfSeasons: 0,
    status: "Released",
    tagline: "",
    voteCount: 1000,
  };
}

export async function getTVShowById(id) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/movies/tv/${encodeURIComponent(id)}`
    );
    if (response.ok) {
      const result = await response.json();
      if (result.data) return result.data;
    }
  } catch (_) {}

  return getMovieById(id, "tv");
}

export async function getTVSeasonEpisodes(id, seasonNumber) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/movies/${encodeURIComponent(id)}/seasons/${encodeURIComponent(seasonNumber)}`
    );
    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
  } catch (_) {}

  // Fallback to TMDB directly
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
    );
    if (res.ok) {
      const data = await res.json();
      return (data.episodes || []).map((ep) => ({
        id: ep.id,
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        still_path: ep.still_path ? `${TMDB_IMAGE_BASE}/w300${ep.still_path}` : null,
        runtime: ep.runtime,
      }));
    }
  } catch (_) {}

  return [];
}

export async function searchMovies(query) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}`
    );
    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
  } catch (_) {}

  // Fallback: search TMDB multi-search directly
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );
    if (res.ok) {
      const data = await res.json();
      return (data.results || []).map((m) => normalizeTMDBMovie(m));
    }
  } catch (_) {}

  // Fallback: search local catalogue
  const cached = readCatalogueCache();
  const list = cached?.movies || fallbackMovies;
  const q = String(query).toLowerCase();
  return list.filter((m) => (m.title || m.name || "").toLowerCase().includes(q));
}

export async function getMoviesByGenre(genre) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/movies/genre/${encodeURIComponent(genre)}`
    );
    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
  } catch (_) {}

  const cached = readCatalogueCache();
  const list = cached?.movies || fallbackMovies;
  if (!genre || genre === "All") return list;
  return list.filter(
    (m) =>
      m.genre?.toLowerCase() === genre.toLowerCase() ||
      m.genres?.some((g) => g.toLowerCase() === genre.toLowerCase())
  );
}

export async function getMovieRecommendations(id, type) {
  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    const response = await fetch(
      `${API_BASE_URL}/movies/${encodeURIComponent(id)}/recommendations${query}`
    );
    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
  } catch (_) {}

  const details = await getMovieById(id, type).catch(() => null);
  return details?.similar || [];
}

export async function getCuratedRecommendations() {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations/curated`, {
      credentials: "include",
    });
    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
  } catch (_) {}
  return [];
}

export async function recordUserStreamingActivity(media) {
  try {
    await fetch(`${API_BASE_URL}/activity/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(media),
      credentials: "include",
    });
  } catch (_) {}
}

