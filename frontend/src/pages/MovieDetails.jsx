import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
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

import { getMovieById, getTVShowById, getTVSeasonEpisodes } from "../services/movieService";
import MovieCard from "../components/movie/MovieCard";
import CineStreamPlayer from "../components/player/CineStreamPlayer";
import StreamRecommendations from "../components/player/StreamRecommendations";
import CineVerseLogo from "../components/common/CineVerseLogo";
import CinematicSplashScreen from "../components/common/CinematicSplashScreen";
import { useLibrary } from "../hooks/useLibrary";

function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRestoredPlayRef = useRef(false);

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

  // Detect whether this is a TV series from navigation or query parameter
  const queryType = searchParams.get("type");
  const stateType = location.state?.mediaType || (location.state?.isTV ? "tv" : null);
  const requestedType = queryType || stateType || null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLoading(true);
    setError("");
    setShowPlayer(false);
    setActiveStreamMovie(null);
    setShowTrailer(false);

    const fetcher = requestedType === "tv" ? getTVShowById(id) : getMovieById(id, requestedType);

    fetcher
      .then((data) => {
        const isTv = Boolean(
          requestedType === "tv" ||
          data.mediaType === "tv" ||
          data.isTV ||
          (data.seasons && data.seasons.length > 0) ||
          data.numberOfSeasons > 0
        );

        const normalizedData = {
          ...data,
          mediaType: isTv ? "tv" : "movie",
          isTV: isTv,
        };

        setMovie(normalizedData);

        if (isTv) {
          const validSeasons = (normalizedData.seasons || []).filter((s) => s.season_number >= 0);
          const firstSeason =
            validSeasons.find((s) => s.season_number > 0)?.season_number ??
            validSeasons[0]?.season_number ??
            1;
          setSelectedSeason(firstSeason);
          setSelectedEpisode(1);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load movie details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, requestedType]);

  // Automatic playback restoration on page reload
  useEffect(() => {
    if (!loading && movie && !hasRestoredPlayRef.current) {
      hasRestoredPlayRef.current = true;
      if (searchParams.get("play") === "true") {
        const isTv = Boolean(
          movie.mediaType === "tv" ||
          movie.isTV ||
          (movie.seasons && movie.seasons.length > 0)
        );
        const s = Number(searchParams.get("season") || selectedSeason || 1);
        const e = Number(searchParams.get("episode") || selectedEpisode || 1);
        if (s) setSelectedSeason(s);
        if (e) setSelectedEpisode(e);

        const playMedia = {
          ...movie,
          season: s,
          episode: e,
          isTV: isTv,
          mediaType: isTv ? "tv" : "movie",
        };
        recordPlay(playMedia, { season: s, episode: e });
        setActiveStreamMovie(playMedia);
        setShowPlayer(true);
      }
    }
  }, [loading, movie, searchParams]);

  // Fetch episodes when selectedSeason changes for a TV show
  useEffect(() => {
    const isTv = Boolean(movie?.mediaType === "tv" || movie?.isTV || (movie?.seasons && movie.seasons.length > 0));
    if (!movie || !isTv) {
      setEpisodes([]);
      return undefined;
    }

    let active = true;
    getTVSeasonEpisodes(movie.id, selectedSeason)
      .then((data) => {
        if (!active) return;
        if (data && data.length > 0) {
          setEpisodes(data);
          setSelectedEpisode((current) =>
            data.some((ep) => ep.episodeNumber === current)
              ? current
              : data[0]?.episodeNumber || 1
          );
        } else {
          // Provide fallback episodes so user can still play any episode
          const currentSeasonObj = (movie.seasons || []).find((s) => s.season_number === selectedSeason);
          const epCount = currentSeasonObj?.episode_count || 10;
          const fallbackList = Array.from({ length: epCount }, (_, i) => ({
            id: `s${selectedSeason}e${i + 1}`,
            name: `Episode ${i + 1}`,
            episodeNumber: i + 1,
            seasonNumber: selectedSeason,
            overview: `Episode ${i + 1} of Season ${selectedSeason}.`,
            still: movie.backdrop || movie.poster,
            rating: movie.rating || 8.0,
            runtime: 45,
          }));
          setEpisodes(fallbackList);
          setSelectedEpisode(1);
        }
      })
      .catch(() => {
        if (!active) return;
        const currentSeasonObj = (movie.seasons || []).find((s) => s.season_number === selectedSeason);
        const epCount = currentSeasonObj?.episode_count || 10;
        const fallbackList = Array.from({ length: epCount }, (_, i) => ({
          id: `s${selectedSeason}e${i + 1}`,
          name: `Episode ${i + 1}`,
          episodeNumber: i + 1,
          seasonNumber: selectedSeason,
          overview: `Episode ${i + 1} of Season ${selectedSeason}.`,
          still: movie.backdrop || movie.poster,
          rating: movie.rating || 8.0,
          runtime: 45,
        }));
        setEpisodes(fallbackList);
        setSelectedEpisode(1);
      });

    return () => { active = false; };
  }, [movie?.id, movie?.mediaType, movie?.isTV, selectedSeason]);

  const toggleWatchlist = (media) => updateWatchlist(media);
  const handlePlayerProgress = useCallback((media, currentTime, duration, episode) => {
    saveProgress(media, currentTime, duration, episode);
  }, [saveProgress]);

  const isSaved = movie
    ? watchlist.some((saved) => String(saved.id) === String(movie.id))
    : false;

  const isTvShow = Boolean(movie?.mediaType === "tv" || movie?.isTV || (movie?.seasons && movie.seasons.length > 0));

  // Ensure current episode and season are correctly bound
  const playerMedia = {
    ...movie,
    ...(activeStreamMovie || {}),
    season: selectedSeason,
    episode: selectedEpisode,
    isTV: isTvShow,
    mediaType: isTvShow ? "tv" : "movie",
  };

  const streamMedia = playerMedia;

  const handleStartPlay = (s = selectedSeason, e = selectedEpisode) => {
    const playMedia = {
      ...movie,
      season: s,
      episode: e,
      isTV: isTvShow,
      mediaType: isTvShow ? "tv" : "movie",
    };
    recordPlay(playMedia, { season: s, episode: e });
    setActiveStreamMovie(playMedia);
    setShowPlayer(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("play", "true");
      if (isTvShow) {
        next.set("season", String(s));
        next.set("episode", String(e));
      }
      return next;
    }, { replace: true });
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("play");
      next.delete("season");
      next.delete("episode");
      return next;
    }, { replace: true });
  };

  function playRecommendation(recommendedMovie) {
    const isRecTv = Boolean(recommendedMovie.mediaType === "tv" || recommendedMovie.isTV);
    const media = isRecTv
      ? { ...recommendedMovie, season: 1, episode: 1, isTV: true, mediaType: "tv" }
      : recommendedMovie;
    recordPlay(media, { season: media.season, episode: media.episode });
    setActiveStreamMovie(media);
  }

  if (loading) {
    return (
      <CinematicSplashScreen status="Loading cinematic details..." />
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

  const rawSeasons = (movie.seasons || []).filter((season) => season.season_number >= 0);
  const availableSeasons = rawSeasons.length > 0
    ? rawSeasons
    : isTvShow
    ? [{ id: 1, season_number: 1, name: "Season 1", episode_count: 10 }]
    : [];

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

        <Link className="brand-logo-link" to="/" aria-label="CineVerse home">
          <CineVerseLogo size="md" />
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

            {isTvShow && availableSeasons.length > 0 && (
              <div className="episode-picker" aria-label="Choose a TV episode">
                <label>
                  <span>Season</span>
                  <select
                    value={selectedSeason}
                    onChange={(event) => {
                      const s = Number(event.target.value);
                      setSelectedSeason(s);
                      setSelectedEpisode(1);
                    }}
                  >
                    {availableSeasons.map((season) => (
                      <option key={season.id || season.season_number} value={season.season_number}>
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
                      <option key={episode.id || episode.episodeNumber} value={episode.episodeNumber}>
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
                onClick={() => handleStartPlay()}
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
        {isTvShow && availableSeasons.length > 0 && (
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
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setSelectedSeason(s);
                    setSelectedEpisode(1);
                  }}
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
                    onClick={() => handleStartPlay(selectedSeason, ep.episodeNumber)}
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
              onClick={handleClosePlayer}
              aria-label="Close video player"
            >
              <X size={24} />
            </button>
          </div>
          <div className="player-content">
            <div className="player-window">
              <CineStreamPlayer
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
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("season", String(newSeason));
                    next.set("episode", "1");
                    return next;
                  }, { replace: true });
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
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("episode", String(newEpisode));
                    return next;
                  }, { replace: true });
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
