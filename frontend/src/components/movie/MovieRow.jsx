import { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import MovieCard from "./MovieCard";

function MovieRow({
  title,
  movies = [],
  onSelect,
  onPlay,
  watchlist = [],
  onToggleWatchlist,
  id,
  subtitle,
  showCount = false,
  isTop10 = false,
}) {
  const rowRef = useRef(null);

  // Scroll the movie row horizontally
  const scrollRow = (direction) => {
    if (!rowRef.current) return;

    const scrollAmount = Math.max(
      rowRef.current.clientWidth * 0.8,
      280
    );

    rowRef.current.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  };

  // Check whether a movie is already in the watchlist
  const isMovieSaved = (movie) => {
    return watchlist.some(
      (savedId) => savedId === movie.id || savedId?.id === movie.id
    );
  };

  // Handle an empty movie collection
  if (!movies.length) {
    return null;
  }

  return (
    <section
      className={`movie-section ${isTop10 ? "movie-section-top10" : ""}`}
      id={id}
      aria-label={title}
    >
      {/* Section Heading */}
      <div className="movie-section-header">
        <div className="movie-section-heading">
          <div>
            <h2 className="movie-section-title">
              {title}
            </h2>

            {subtitle && (
              <p className="movie-section-subtitle">
                {subtitle}
              </p>
            )}
          </div>

          {showCount && (
            <span className="movie-section-count">
              {movies.length} titles
            </span>
          )}
        </div>

        {/* Horizontal Scroll Controls */}
        <div className="movie-row-controls">
          <button
            type="button"
            className="movie-row-arrow"
            onClick={() => scrollRow(-1)}
            aria-label={`Scroll ${title} left`}
            title="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            className="movie-row-arrow"
            onClick={() => scrollRow(1)}
            aria-label={`Scroll ${title} right`}
            title="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Horizontal Movie Collection */}
      <div
        className={`movie-row ${isTop10 ? "movie-row-top10" : ""}`}
        ref={rowRef}
        role="list"
        aria-label={`${title} movies`}
      >
        {movies.map((movie, index) => (
          <div
            className={`movie-row-item ${isTop10 ? "movie-row-item-top10" : ""}`}
            key={movie.id || index}
            role="listitem"
          >
            <MovieCard
              movie={movie}
              onSelect={onSelect}
              onPlay={onPlay}
              isSaved={isMovieSaved(movie)}
              onToggleWatchlist={onToggleWatchlist}
              rank={isTop10 ? index + 1 : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default MovieRow;
