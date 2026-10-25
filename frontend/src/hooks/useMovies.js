import { useEffect, useState } from "react";
import { getMovies } from "../services/movieService";

export function useMovies() {
  const [movies, setMovies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMovies() {
      try {
        setLoading(true);
        setError("");

        const result = await getMovies();

        if (!cancelled) {
          // Handle both array or object with categories
          if (Array.isArray(result)) {
            setMovies(result);
          } else {
            setMovies(result.movies || []);
            setCategories(result.categories || []);
            setFeaturedMovies(result.featuredMovies || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
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