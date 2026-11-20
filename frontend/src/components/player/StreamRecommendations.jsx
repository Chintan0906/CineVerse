import { useMemo } from "react";
import MovieCard from "../movie/MovieCard";
import { movies as fallbackMovies } from "../../data/movies";

function getCatalogueBackup() {
  try {
    const raw =
      sessionStorage.getItem("cineverse_catalogue_cache") ||
      localStorage.getItem("cineverse_catalogue_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.movies) && parsed.movies.length > 0) {
        return parsed.movies;
      }
    }
  } catch (_) {}
  return fallbackMovies;
}

function StreamRecommendations({
  movies = [],
  currentMovie,
  onPlay,
  isSaved,
  onToggleWatchlist,
}) {
  const currentId = String(currentMovie?.id || currentMovie?.tmdbId || "");

  const recommendations = useMemo(() => {
    const list = Array.isArray(movies) && movies.length > 0 ? movies : [];
    let filtered = list
      .filter((movie) => movie && String(movie.id || movie.tmdbId) !== currentId)
      .filter((movie, index, arr) =>
        arr.findIndex((c) => String(c.id || c.tmdbId) === String(movie.id || movie.tmdbId)) === index
      );

    if (filtered.length === 0) {
      const backup = getCatalogueBackup();
      filtered = backup
        .filter((movie) => movie && String(movie.id || movie.tmdbId) !== currentId)
        .filter((movie, index, arr) =>
          arr.findIndex((c) => String(c.id || c.tmdbId) === String(movie.id || movie.tmdbId)) === index
        );
    }

    return filtered.slice(0, 6);
  }, [movies, currentId]);

  if (!recommendations.length) return null;

  return (
    <section className="stream-recommendations" aria-label="Similar movies and shows">
      <div className="stream-recommendations-heading">
        <div>
          <span className="section-eyebrow">KEEP EXPLORING</span>
          <h3>More Like This</h3>
        </div>
        <span className="stream-recommendations-count">{recommendations.length} picks</span>
      </div>
      <div className="stream-recommendations-grid">
        {recommendations.map((movie) => (
          <MovieCard
            key={movie.id || movie.tmdbId}
            movie={movie}
            onSelect={() => onPlay?.(movie)}
            onPlay={onPlay}
            isSaved={isSaved?.(movie.id || movie.tmdbId) || false}
            onToggleWatchlist={onToggleWatchlist}
          />
        ))}
      </div>
    </section>
  );
}

export default StreamRecommendations;
