import MovieCard from "../movie/MovieCard";

function StreamRecommendations({
  movies = [],
  currentMovie,
  onPlay,
  isSaved,
  onToggleWatchlist,
}) {
  const currentId = String(currentMovie?.id || currentMovie?.tmdbId || "");
  const recommendations = movies
    .filter((movie) => movie && String(movie.id || movie.tmdbId) !== currentId)
    .filter((movie, index, list) =>
      list.findIndex((candidate) => String(candidate.id || candidate.tmdbId) === String(movie.id || movie.tmdbId)) === index
    )
    .slice(0, 6);

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
