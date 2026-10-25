import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Plus,
  Check,
  Star,
  Info,
  Clock3,
  Film,
} from "lucide-react";

function MovieCard({
  movie,
  onSelect,
  onPlay,
  isSaved = false,
  onToggleWatchlist,
  rank,
}) {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  if (!movie) return null;

  const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(movie);
    }
  };

  const handleViewDetails = (event) => {
    event.stopPropagation();
    navigate(`/movie/${movie.id}${isTv ? "?type=tv" : ""}`, {
      state: { mediaType: isTv ? "tv" : "movie", isTV: isTv },
    });
  };

  const handleWatchlistClick = (event) => {
    event.stopPropagation();

    if (onToggleWatchlist) {
      onToggleWatchlist(movie);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  // Match score calculation
  const ratingNum = parseFloat(movie.rating) || 7.5;
  const matchPercent = Math.min(99, Math.max(85, Math.round(ratingNum * 8 + 24)));

  return (
    <div className={`movie-card-wrapper ${rank ? "top10-wrapper" : ""}`}>
      {/* Netflix Top 10 Giant Rank Number */}
      {rank && (
        <div className="netflix-rank-number" aria-label={`Rank ${rank}`}>
          {rank}
        </div>
      )}

      <article
        className={`movie-card ${rank ? "top10-card" : ""}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${movie.title}`}
      >
        {/* Movie Poster */}
        <div className="movie-poster">
          {!imageError && movie.poster ? (
            <img
              src={movie.poster}
              alt={`${movie.title} poster`}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="poster-fallback">
              <Film size={28} className="fallback-icon" />
              <span className="fallback-title">{movie.title}</span>
            </div>
          )}

          {/* Top Badges - Single Clean Priority Badge */}
          <div className="movie-card-badges">
            {rank ? (
              <span className="movie-badge top10-badge">
                TOP 10
              </span>
            ) : movie.isTV ? (
              <span className="movie-badge tv-badge">
                TV SERIES
              </span>
            ) : movie.trending ? (
              <span className="movie-badge trending-badge">
                TRENDING
              </span>
            ) : null}
          </div>

          {movie.progressPercent > 0 && !movie.completed && (
            <div
              className="movie-progress-track"
              aria-label={`${movie.progressPercent}% watched`}
            >
              <span style={{ width: `${Math.min(100, movie.progressPercent)}%` }} />
            </div>
          )}

          {/* Watchlist Button */}
          <button
            type="button"
            className={`watchlist-button ${
              isSaved ? "saved" : ""
            }`}
            onClick={handleWatchlistClick}
            aria-label={
              isSaved
                ? `Remove ${movie.title} from My List`
                : `Add ${movie.title} to My List`
            }
            title={isSaved ? "Remove from My List" : "Add to My List"}
          >
            {isSaved ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <Plus size={16} strokeWidth={2.5} />
            )}
          </button>

          {/* Hover Overlay */}
          <div className="card-overlay">
            <div className="card-overlay-content">
              <div className="overlay-top-row">
                <button
                  type="button"
                  className="card-play-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onPlay) onPlay(movie);
                    else handleCardClick();
                  }}
                  aria-label={`Play ${movie.title}`}
                  title="Play"
                >
                  <Play size={18} fill="currentColor" />
                </button>

                <button
                  type="button"
                  className={`card-add-button ${isSaved ? "active" : ""}`}
                  onClick={handleWatchlistClick}
                  aria-label={isSaved ? "Remove from List" : "Add to List"}
                >
                  {isSaved ? <Check size={16} /> : <Plus size={16} />}
                </button>
              </div>

              <h3 className="card-overlay-title">
                {movie.title}
              </h3>

              <div className="card-overlay-meta">
                <span className="match-score">{matchPercent}% Match</span>
                <span className="quality-pill">HD</span>
                {movie.year && <span>{movie.year}</span>}
              </div>

              {movie.genre && (
                <div className="card-overlay-genres">
                  <span>{movie.genre}</span>
                </div>
              )}

              {/* DEDICATED VIEW DETAILS OVAL BUTTON */}
              <button
                type="button"
                className="card-view-details-btn"
                onClick={handleViewDetails}
                title="View Full Movie Details Page"
              >
                <Info size={14} />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>

        {/* Movie Information Below Poster */}
        <div className="movie-card-info">
          <div className="movie-card-title-row">
            <h3 className="movie-card-title">
              {movie.title}
            </h3>

            {movie.rating && (
              <span className="movie-card-rating">
                <Star
                  size={12}
                  fill="currentColor"
                />
                {movie.rating}
              </span>
            )}
          </div>

          <div className="movie-card-meta">
            {movie.year && (
              <span>{movie.year}</span>
            )}

            {movie.duration && (
              <>
                <span className="meta-separator">•</span>
                <span className="movie-duration">
                  <Clock3 size={12} />
                  {movie.duration}
                </span>
              </>
            )}
          </div>

          {movie.genre && (
            <p className="movie-card-genre">
              {movie.genre}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

export default MovieCard;
