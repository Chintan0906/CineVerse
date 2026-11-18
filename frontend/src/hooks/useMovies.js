import { useEffect, useState } from "react";
import { getMovies } from "../services/movieService";
import { movies as fallbackMovies } from "../data/movies";

const CACHE_KEY = "cineverse_catalogue_cache";
let memoryCache = null;

const fallbackFeatured = fallbackMovies.filter((m) => m.featured || m.trending);
const defaultFeaturedList = fallbackFeatured.length > 0 ? fallbackFeatured : fallbackMovies.slice(0, 5);

function readCatalogueCache() {
  if (memoryCache && Array.isArray(memoryCache.movies) && memoryCache.movies.length > 0) {
    return memoryCache;
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.movies) && parsed.movies.length > 0) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

function saveCatalogueCache(data) {
  memoryCache = data;
  try {
    const serialized = JSON.stringify(data);
    sessionStorage.setItem(CACHE_KEY, serialized);
    localStorage.setItem(CACHE_KEY, serialized);
  } catch (_) {}
}

export function useMovies() {
  const initialCache = readCatalogueCache();

  // Instant zero-delay data: initialCache from session/local storage, or bundled fallback
  const [movies, setMovies] = useState(() => initialCache?.movies || fallbackMovies);
  const [categories, setCategories] = useState(() => initialCache?.categories || []);
  const [featuredMovies, setFeaturedMovies] = useState(() => initialCache?.featuredMovies || defaultFeaturedList);
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMovies() {
      try {
        if (!initialCache) {
          setLoading(true);
        }
        setError("");

        const result = await getMovies();

        if (!cancelled) {
          let newMovies = [];
          let newCategories = [];
          let newFeatured = [];

          if (Array.isArray(result)) {
            newMovies = result;
          } else {
            newMovies = result.movies || [];
            newCategories = result.categories || [];
            newFeatured = result.featuredMovies || [];
          }

          setMovies(newMovies);
          setCategories(newCategories);
          setFeaturedMovies(newFeatured);

          saveCatalogueCache({
            movies: newMovies,
            categories: newCategories,
            featuredMovies: newFeatured,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        if (!cancelled && (!initialCache || movies.length === 0)) {
          setError(err.message || "Unable to load movies.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMovies();

    return () => {
      cancelled = true;
    };
  }, []);

  return { movies, categories, featuredMovies, loading, error };
}
