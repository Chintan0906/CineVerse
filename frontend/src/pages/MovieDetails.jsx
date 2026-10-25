import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Plus,
  Check,
  Star,
  Clock,
  Film,
  Sparkles,
  Calendar,
  DollarSign,
  TrendingUp,
  X,
} from "lucide-react";

import { getMovieById, getTVSeasonEpisodes } from "../services/movieService";
import MovieCard from "../components/movie/MovieCard";
import VidLinkPlayer from "../components/player/VidLinkPlayer";
import StreamRecommendations from "../components/player/StreamRecommendations";
import { useLibrary } from "../hooks/useLibrary";

function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    watchlist,
    toggleWatchlist: updateWatchlist,
    recordPlay,
    saveProgress,
  } = useLibrary();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeStreamMovie, setActiveStreamMovie] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLoading(true);
    setError("");
    setShowPlayer(false);
    setActiveStreamMovie(null);
    setShowTrailer(false);

    getMovieById(id)
      .then((data) => {
        setMovie(data);
        if (data.mediaType === "tv") {
          const seasons = (data.seasons || []).filter((season) => season.season_number >= 0);
          setSelectedSeason(
            seasons.find((season) => season.season_number > 0)?.season_number ??
            seasons[0]?.season_number ?? 1
          );
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load movie details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!movie || movie.mediaType !== "tv") {
      setEpisodes([]);
      return undefined;
    }

    let active = true;
    getTVSeasonEpisodes(movie.id, selectedSeason)
      .then((data) => {
        if (!active) return;
        setEpisodes(data);
        setSelectedEpisode((current) =>
          data.some((episode) => episode.episodeNumber === current)
            ? current
            : data[0]?.episodeNumber || 1
        );
      })
      .catch(() => {
        if (active) setEpisodes([]);
      });

    return () => { active = false; };
  }, [movie?.id, movie?.mediaType, selectedSeason]);

  const toggleWatchlist = (media) => updateWatchlist(media);
  const handlePlayerProgress = useCallback((media, currentTime, duration, episode) => {
    saveProgress(media, currentTime, duration, episode);
  }, [saveProgress]);

  const isSaved = movie
    ? watchlist.some((saved) => String(saved.id) === String(movie.id))
    : false;
  const playerMedia = movie?.mediaType === "tv"
    ? { ...movie, season: selectedSeason, episode: selectedEpisode }
    : movie;
  const streamMedia = activeStreamMovie || playerMedia;

  function playRecommendation(recommendedMovie) {
    const media = recommendedMovie.mediaType === "tv" || recommendedMovie.isTV
      ? { ...recommendedMovie, season: 1, episode: 1 }
      : recommendedMovie;
    recordPlay(media, { season: media.season, episode: media.episode });
    setActiveStreamMovie(media);
  }

  if (loading) {
    return (
      <div className="app-shell loading-screen">
        <div className="loading-spinner" />
        <h2>Loading Movie Details...</h2>
        <p>Fetching international cinematic archives.</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="app-shell error-screen">
        <Film size={44} />
        <h2>Movie Not Found</h2>
        <p>{error || "Unable to retrieve the requested film."}</p>
        <button
          className="btn-primary"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} />
          Back to Catalogue
        </button>
      </div>
    );
  }

  const availableSeasons = (movie.seasons || []).filter((season) => season.season_number >= 0);

  return (
    <div className="movie-details-page">
      {/* GLASS HEADER BAR */}
      <header className="details-header">
        <button
          className="btn-secondary back-btn"
          onClick={() => navigate("/")}
          aria-label="Back to Browse"
        >
          <ArrowLeft size={18} />
          Back to Browse
        </button>

        <Link className="brand" to="/">
          CINE<span>VERSE</span>
          <span className="brand-dot">.</span>
        </Link>

        <button
          className="btn-secondary"
          onClick={() => toggleWatchlist(movie)}
        >
          {isSaved ? <Check size={18} /> : <Plus size={18} />}
          {isSaved ? "Saved in List" : "Add to List"}
        </button>
      </header>

      {/* GIANT BACKDROP BILLBOARD */}
      <section
        className="details-hero"
        style={{
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(8, 9, 13, 0.3) 0%,
              rgba(8, 9, 13, 0.7) 60%,
              rgba(8, 9, 13, 1) 100%
            ),
            linear-gradient(
              90deg,
              rgba(8, 9, 13, 0.95) 0%,
              rgba(8, 9, 13, 0.7) 35%,
              rgba(8, 9, 13, 0.3) 100%
            ),
            url("${movie.backdrop || movie.poster}")
          `,
        }}
      >
        <div className="details-hero-container">
          <div className="details-hero-info">
            <div className="badge-row">
              <span className="section-eyebrow">
                <Sparkles size={13} />
                WORLDWIDE CINEMA
              </span>
              <span className="quality-pill">4K ULTRA HD</span>
              <span className="quality-pill">DOLBY ATMOS</span>
            </div>

            <h1 className="details-title">{movie.title}</h1>

            {movie.tagline && (
              <p className="details-tagline">“{movie.tagline}”</p>
            )}

            {/* METADATA BAR */}
            <div className="details-meta-bar">
              <span className="meta-item">
                <Calendar size={14} />
                {movie.year}
              </span>
              <span className="meta-divider" />
              <span className="meta-item">
                <Clock size={14} />
                {movie.duration}
              </span>
              <span className="meta-divider" />
              <span className="meta-item rating-meta">
                <Star size={14} fill="currentColor" />
                {movie.rating} / 10
              </span>
              {movie.voteCount > 0 && (
                <span className="vote-count">({movie.voteCount.toLocaleString()} votes)</span>
              )}
            </div>

            {/* GENRES */}
            <div className="details-genres">
              {(movie.genres || [movie.genre]).map((genre) => (
                <span key={genre} className="glass-tag">
                  {genre}
                </span>
              ))}
            </div>

            {movie.mediaType === "tv" && availableSeasons.length > 0 && (
              <div className="episode-picker" aria-label="Choose a TV episode">
                <label>
                  <span>Season</span>
                  <select
                    value={selectedSeason}
                    onChange={(event) => setSelectedSeason(Number(event.target.value))}
                  >
                    {availableSeasons.map((season) => (
                      <option key={season.id} value={season.season_number}>
                        {season.name || `Season ${season.season_number}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Episode</span>
                  <select
                    value={selectedEpisode}
                    onChange={(event) => setSelectedEpisode(Number(event.target.value))}
                    disabled={!episodes.length}
                  >
                    {episodes.map((episode) => (
                      <option key={episode.id} value={episode.episodeNumber}>
                        {String(episode.episodeNumber).padStart(2, "0")} · {episode.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* OVAL ACTION BUTTONS */}
            <div className="details-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  recordPlay(playerMedia, { season: playerMedia.season, episode: playerMedia.episode });
                  setActiveStreamMovie(playerMedia);
                  setShowPlayer(true);
                }}
              >
                <Play size={18} fill="currentColor" />
                Watch Now
              </button>

              {movie.trailerUrl && (
                <button
                  className="btn-secondary"
                  onClick={() => setShowTrailer(true)}
                >
                  <Film size={18} />
                  Watch Trailer
                </button>
              )}

              <button
                className="btn-secondary"
                onClick={() => toggleWatchlist(movie)}
              >
                {isSaved ? <Check size={18} /> : <Plus size={18} />}
                {isSaved ? "In My List" : "Add to My List"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT SECTION */}
      <div className="details-body-container">
        {/* STORYLINE & FINANCIAL STATS */}
        <div className="details-grid">
          <div className="details-overview-col">
            <h2 className="section-title">Storyline</h2>
            <p className="details-overview-text">
              {movie.description || "No overview available for this title."}
            </p>
          </div>

          <div className="details-facts-card glass-card">
            <h3>Film Details</h3>
            <div className="fact-row">
              <span className="fact-label">Status</span>
              <span className="fact-value">{movie.status || "Released"}</span>
            </div>
            {movie.budget && (
              <div className="fact-row">
                <span className="fact-label">
                  <DollarSign size={13} />
                  Budget
                </span>
                <span className="fact-value">{movie.budget}</span>
              </div>
            )}
            {movie.revenue && (
              <div className="fact-row">
                <span className="fact-label">
                  <TrendingUp size={13} />
                  Revenue
                </span>
                <span className="fact-value">{movie.revenue}</span>
              </div>
            )}
            <div className="fact-row">
              <span className="fact-label">TMDB Reference</span>
              <span className="fact-value">#{movie.id}</span>
            </div>
          </div>
        </div>

        {/* WEBSERIES EPISODES & SEASONS GRID */}
        {movie.mediaType === "tv" && availableSeasons.length > 0 && (
          <section className="tv-episodes-section">
            <div className="tv-episodes-header">
              <div className="tv-episodes-heading-left">
                <h2 className="section-title">Episodes</h2>
                <span className="episodes-count-tag">
                  {episodes.length} {episodes.length === 1 ? "Episode" : "Episodes"}
                </span>
              </div>

              {/* Season Selection Pill */}
              <div className="season-select-wrapper">
                <select
                  className="season-dropdown-pill"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                >
                  {availableSeasons.map((season) => (
                    <option key={season.id || season.season_number} value={season.season_number}>
                      {season.name || `Season ${season.season_number}`} {season.episode_count ? `(${season.episode_count} eps)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Episodes List / Cards Grid */}
            <div className="episodes-grid">
              {episodes.map((ep) => {
                const isCurrent = ep.episodeNumber === selectedEpisode;
                return (
                  <div
                    key={ep.id || ep.episodeNumber}
                    className={`episode-card glass-card ${isCurrent ? "active-episode" : ""}`}
                    onClick={() => {
                      setSelectedEpisode(ep.episodeNumber);
                      const playMedia = {
                        ...movie,
                        season: selectedSeason,
                        episode: ep.episodeNumber,
                        episodeTitle: ep.name,
                      };
                      recordPlay(playMedia, { season: selectedSeason, episode: ep.episodeNumber });
                      setActiveStreamMovie(playMedia);
                      setShowPlayer(true);
                    }}
                  >
                    <div className="episode-thumbnail-wrap">
                      <img
                        src={ep.still || movie.backdrop || movie.poster}
                        alt={ep.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = movie.poster;
                        }}
                      />
                      <div className="episode-play-overlay">
                        <Play size={20} fill="#ffffff" />
                      </div>
                      <span className="episode-num-badge">
                        E{String(ep.episodeNumber).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="episode-details">
                      <div className="episode-title-row">
                        <h4 className="episode-title">
                          {ep.episodeNumber}. {ep.name}
                        </h4>
                        {ep.runtime > 0 && (
                          <span className="episode-runtime">
                            <Clock size={12} />
                            {ep.runtime}m
                          </span>
                        )}
                      </div>
                      <p className="episode-overview">
                        {ep.overview || "No episode summary available."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TOP CAST & CREW */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="cast-section">
            <h2 className="section-title">Top Cast & Crew</h2>
            <div className="cast-grid">
              {movie.cast.map((actor) => (
                <div key={actor.id} className="actor-card glass-card">
                  <div className="actor-image-wrap">
                    <img
                      src={actor.profile}
                      alt={actor.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80";
                      }}
                    />
                  </div>
                  <div className="actor-info">
                    <h4 className="actor-name">{actor.name}</h4>
                    <p className="actor-role">{actor.character || "Cast"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SIMILAR MOVIES / RECOMMENDATIONS */}
        {movie.similar && movie.similar.length > 0 && (
          <section className="similar-section">
            <h2 className="section-title">More Like This</h2>
            <div className="similar-grid">
              {movie.similar.slice(0, 8).map((simMovie) => (
                <MovieCard
                  key={simMovie.id}
                  movie={simMovie}
                  onSelect={() => navigate(`/movie/${simMovie.id}`)}
                  isSaved={watchlist.some((saved) => String(saved.id) === String(simMovie.id))}
                  onToggleWatchlist={() => toggleWatchlist(simMovie)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FULL-SCREEN VIDEO PLAYER */}
      {showPlayer && (
        <div className="player-overlay">
          <div className="player-header">
            <div>
              <span className="section-eyebrow">NOW PLAYING</span>
              <h2>{streamMedia.title}</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setShowPlayer(false)}
              aria-label="Close video player"
            >
              <X size={24} />
            </button>
          </div>
          <div className="player-content">
            <div className="player-window">
              <VidLinkPlayer
                media={streamMedia}
                onProgress={handlePlayerProgress}
                seasons={availableSeasons}
                episodes={episodes}
                onSeasonChange={(newSeason) => {
                  setSelectedSeason(newSeason);
                  const updatedMedia = {
                    ...streamMedia,
                    season: newSeason,
                    episode: 1,
                  };
                  recordPlay(updatedMedia, { season: newSeason, episode: 1 });
                  setActiveStreamMovie(updatedMedia);
                }}
                onEpisodeChange={(newEpisode) => {
                  setSelectedEpisode(newEpisode);
                  const updatedMedia = {
                    ...streamMedia,
                    season: selectedSeason,
                    episode: newEpisode,
                  };
                  recordPlay(updatedMedia, { season: selectedSeason, episode: newEpisode });
                  setActiveStreamMovie(updatedMedia);
                }}
              />
            </div>
            <StreamRecommendations
              movies={movie.similar || []}
              currentMovie={streamMedia}
              onPlay={playRecommendation}
              isSaved={(mediaId) => watchlist.some((saved) => String(saved.id) === String(mediaId))}
              onToggleWatchlist={toggleWatchlist}
            />
          </div>
        </div>
      )}

      {/* TRAILER MODAL */}
      {showTrailer && movie.trailerUrl && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowTrailer(false);
          }}
        >
          <div className="trailer-modal glass-card">
            <button
              className="modal-close glass-button"
              onClick={() => setShowTrailer(false)}
              aria-label="Close trailer"
            >
              <X size={20} />
            </button>
            <div className="trailer-iframe-wrap">
              <iframe
                src={movie.trailerUrl}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MovieDetails;
