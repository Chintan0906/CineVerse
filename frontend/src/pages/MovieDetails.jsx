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
  Loader2,
  Volume2,
  VolumeX,
  Home,
  Compass,
  Bookmark,
} from "lucide-react";

import { getMovieById, getTVShowById, getTVSeasonEpisodes } from "../services/movieService";
import MovieCard from "../components/movie/MovieCard";
import CineStreamPlayer from "../components/player/CineStreamPlayer";
import StreamRecommendations from "../components/player/StreamRecommendations";
import CineVerseLogo from "../components/common/CineVerseLogo";
import { useLibrary } from "../hooks/useLibrary";

function MovieDetailsSkeleton({ onBack }) {
  return (
    <div className="movie-details-page details-skeleton-root" aria-busy="true" aria-label="Loading movie details">
      <header className="details-header">
        <button className="btn-secondary back-btn" onClick={onBack} aria-label="Back to Browse">
          <ArrowLeft size={18} />
          Back to Browse
        </button>
        <Link className="brand-logo-link" to="/" aria-label="CineVerse home">
          <CineVerseLogo size="md" />
        </Link>
        <div className="skeleton-pill-box" />
      </header>
      <div className="skeleton-hero-backdrop">
        <div className="skeleton-hero-inner">
          <div className="skeleton-poster-box" />
          <div className="skeleton-info-stack">
            <div className="skeleton-shimmer skeleton-title-bar" />
            <div className="skeleton-shimmer skeleton-meta-bar" />
            <div className="skeleton-shimmer skeleton-desc-line" />
            <div className="skeleton-shimmer skeleton-desc-line short" />
            <div className="skeleton-btn-row">
              <div className="skeleton-shimmer skeleton-action-btn" />
              <div className="skeleton-shimmer skeleton-action-btn" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRestoredPlayRef = useRef(false);
  const isPlayerClosedByUserRef = useRef(false);

  const {
    watchlist,
    history,
    toggleWatchlist: updateWatchlist,
    recordPlay,
    saveProgress,
  } = useLibrary();

  const savedHistory = (history || []).find(
    (item) => String(item.tmdbId || item.id) === String(id)
  );

  const isStreamingQuery = searchParams.get("play") === "true";
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPlayer, setShowPlayer] = useState(() => isStreamingQuery);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isTrailerMounted, setIsTrailerMounted] = useState(false);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [isTrailerMuted, setIsTrailerMuted] = useState(true);
  const trailerTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const trailerIframeRef = useRef(null);
  const prevShowTrailerRef = useRef(showTrailer);

  const trailerKey =
    movie?.trailerKey ||
    (movie?.trailerUrl
      ? movie.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
        movie.trailerUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ||
        movie.trailerUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1]
      : null) ||
    null;
  const heroGlowImage = isTrailerVisible && trailerKey
    ? `https://i.ytimg.com/vi/${trailerKey}/hqdefault.jpg`
    : movie?.backdrop || movie?.poster || "";

  // Pre-mount trailer behind the poster, then cross-fade smoothly once playback starts
  useEffect(() => {
    setIsTrailerMounted(false);
    setIsTrailerVisible(false);
    setIsTrailerMuted(true);
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;

    if (!movie || showPlayer || !trailerKey) return;

    // 1. Mount iframe in background (masked at opacity: 0 behind poster) early at 600ms
    trailerTimerRef.current = setTimeout(() => {
      setIsTrailerMounted(true);
    }, 600);

    return () => {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [movie?.id, trailerKey, showPlayer]);

  // Listen for video start and loop seamlessly without playlist UI
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        if (e.source !== trailerIframeRef.current?.contentWindow) return;
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube sends info: 1 (PLAYING)
        if (
          (data?.event === "onStateChange" && Number(data?.info) === 1) ||
          Number(data?.info?.playerState) === 1
        ) {
          // Keep the backdrop over the player through YouTube's longer startup bezel animation.
          if (!revealTimerRef.current) {
            revealTimerRef.current = setTimeout(() => {
              revealTimerRef.current = null;
              setIsTrailerVisible(true);
            }, 7500);
          }
        }
        // YouTube sends info: 0 (ENDED) -> loop
        if (
          (data?.event === "onStateChange" && Number(data?.info) === 0) ||
          Number(data?.info?.playerState) === 0
        ) {
          sendYouTubeCommand("seekTo", [0, true]);
          sendYouTubeCommand("playVideo");
        }
      } catch (_) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendYouTubeCommand = (func, args = []) => {
    try {
      if (trailerIframeRef.current?.contentWindow) {
        trailerIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      }
    } catch (_) {}
  };

  const handleToggleTrailerVoice = () => {
    if (!trailerKey) return;

    if (!isTrailerVisible) {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
      setIsTrailerMounted(true);
      setIsTrailerMuted(false);
      sendYouTubeCommand("unMute");
      sendYouTubeCommand("setVolume", [100]);
      sendYouTubeCommand("playVideo");
      return;
    }

    const nextMuted = !isTrailerMuted;
    setIsTrailerMuted(nextMuted);
    sendYouTubeCommand(nextMuted ? "mute" : "unMute");
    if (!nextMuted) {
      sendYouTubeCommand("setVolume", [100]);
    }
  };

  // When trailer modal opens, pause background trailer; resume when closed
  useEffect(() => {
    if (prevShowTrailerRef.current === showTrailer) return;
    prevShowTrailerRef.current = showTrailer;

    if (showTrailer && isTrailerMounted) {
      sendYouTubeCommand("pauseVideo");
    } else if (!showTrailer && isTrailerMounted) {
      sendYouTubeCommand("playVideo");
    }
  }, [showTrailer, isTrailerMounted]);
  const [activeStreamMovie, setActiveStreamMovie] = useState(() => {
    if (isStreamingQuery) {
      try {
        const cached = sessionStorage.getItem("cineverse_current_stream");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (String(parsed.id) === String(id)) return parsed;
        }
      } catch {
        // ignore
      }
      const s = Number(searchParams.get("season") || 1);
      const e = Number(searchParams.get("episode") || 1);
      const isTv = searchParams.get("type") === "tv" || location.state?.mediaType === "tv" || location.state?.isTV;
      return {
        id,
        title: location.state?.title || "Now Playing",
        season: s,
        episode: e,
        isTV: isTv,
        mediaType: isTv ? "tv" : "movie",
      };
    }
    return null;
  });
  const [selectedSeason, setSelectedSeason] = useState(() => Number(searchParams.get("season") || 1));
  const [selectedEpisode, setSelectedEpisode] = useState(() => Number(searchParams.get("episode") || 1));
  const [episodes, setEpisodes] = useState([]);

  // Detect whether this is a TV series from navigation or query parameter
  const queryType = searchParams.get("type");
  const stateType = location.state?.mediaType || (location.state?.isTV ? "tv" : null);
  const requestedType = queryType || stateType || null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLoading(true);
    setError("");
    if (!isStreamingQuery) {
      setShowPlayer(false);
      setActiveStreamMovie(null);
    }
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
          const urlSeason = Number(searchParams.get("season"));
          const urlEpisode = Number(searchParams.get("episode"));
          const stateSeason = Number(location.state?.season);
          const stateEpisode = Number(location.state?.episode);

          // Priority: 1. URL searchParams, 2. location.state, 3. savedHistory (where user left off), 4. firstSeason
          const resolvedSeason =
            urlSeason > 0
              ? urlSeason
              : stateSeason > 0
              ? stateSeason
              : savedHistory?.season > 0
              ? Number(savedHistory.season)
              : firstSeason;

          const resolvedEpisode =
            urlEpisode > 0
              ? urlEpisode
              : stateEpisode > 0
              ? stateEpisode
              : savedHistory?.episode > 0
              ? Number(savedHistory.episode)
              : 1;

          setSelectedSeason(resolvedSeason);
          setSelectedEpisode(resolvedEpisode);
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
      if (searchParams.get("play") === "true" && !isPlayerClosedByUserRef.current) {
        const isTv = Boolean(
          movie.mediaType === "tv" ||
          movie.isTV ||
          (movie.seasons && movie.seasons.length > 0) ||
          requestedType === "tv"
        );
        const s = Number(searchParams.get("season")) || selectedSeason || 1;
        const e = Number(searchParams.get("episode")) || selectedEpisode || 1;
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
  }, [loading, movie, searchParams, requestedType, selectedSeason, selectedEpisode, recordPlay]);

  // Fetch episodes when selectedSeason changes for a TV show
  useEffect(() => {
    const isTv = Boolean(
      movie?.mediaType === "tv" ||
      movie?.isTV ||
      (movie?.seasons && movie.seasons.length > 0) ||
      requestedType === "tv"
    );
    if (!id || !isTv) {
      setEpisodes([]);
      return undefined;
    }

    let active = true;
    getTVSeasonEpisodes(id, selectedSeason)
      .then((data) => {
        if (!active) return;
        if (data && data.length > 0) {
          setEpisodes(data);
          const urlEp = Number(searchParams.get("episode"));
          setSelectedEpisode((current) => {
            const candidate = current || urlEp || 1;
            return data.some((ep) => ep.episodeNumber === candidate)
              ? candidate
              : data[0]?.episodeNumber || 1;
          });
        } else {
          // Provide fallback episodes so user can still play any episode
          const currentSeasonObj = (movie?.seasons || []).find((s) => s.season_number === selectedSeason);
          const urlEp = Number(searchParams.get("episode"));
          const epCount = Math.max(currentSeasonObj?.episode_count || 12, urlEp || 12);
          const fallbackList = Array.from({ length: epCount }, (_, i) => ({
            id: `s${selectedSeason}e${i + 1}`,
            name: `Episode ${i + 1}`,
            episodeNumber: i + 1,
            seasonNumber: selectedSeason,
            overview: `Episode ${i + 1} of Season ${selectedSeason}.`,
            still: movie?.backdrop || movie?.poster,
            rating: movie?.rating || 8.0,
            runtime: 45,
          }));
          setEpisodes(fallbackList);
          setSelectedEpisode((current) => (urlEp > 0 ? urlEp : current || 1));
        }
      })
      .catch(() => {
        if (!active) return;
        const currentSeasonObj = (movie?.seasons || []).find((s) => s.season_number === selectedSeason);
        const urlEp = Number(searchParams.get("episode"));
        const epCount = Math.max(currentSeasonObj?.episode_count || 12, urlEp || 12);
        const fallbackList = Array.from({ length: epCount }, (_, i) => ({
          id: `s${selectedSeason}e${i + 1}`,
          name: `Episode ${i + 1}`,
          episodeNumber: i + 1,
          seasonNumber: selectedSeason,
          overview: `Episode ${i + 1} of Season ${selectedSeason}.`,
          still: movie?.backdrop || movie?.poster,
          rating: movie?.rating || 8.0,
          runtime: 45,
        }));
        setEpisodes(fallbackList);
        setSelectedEpisode((current) => (urlEp > 0 ? urlEp : current || 1));
      });

    return () => { active = false; };
  }, [id, movie?.seasons, movie?.backdrop, movie?.poster, movie?.rating, requestedType, selectedSeason, searchParams]);

  const toggleWatchlist = (media) => updateWatchlist(media);
  const handlePlayerProgress = useCallback((media, currentTime, duration, episode) => {
    saveProgress(media, currentTime, duration, episode);
  }, [saveProgress]);

  const isSaved = movie
    ? watchlist.some((saved) => String(saved.id) === String(movie.id))
    : false;

  const isTvShow = Boolean(
    movie?.mediaType === "tv" ||
    movie?.isTV ||
    (movie?.seasons && movie.seasons.length > 0) ||
    requestedType === "tv" ||
    searchParams.get("type") === "tv"
  );

  const rawSeasons = ((movie?.seasons) || []).filter((season) => season.season_number >= 0);
  const availableSeasons = rawSeasons.length > 0
    ? rawSeasons
    : isTvShow
    ? [{ id: 1, season_number: selectedSeason || 1, name: `Season ${selectedSeason || 1}`, episode_count: Math.max(12, selectedEpisode || 10) }]
    : [];

  // Ensure current episode and season are correctly bound
  const playerMedia = (movie || activeStreamMovie) ? {
    ...(movie || {}),
    ...(activeStreamMovie || {}),
    id: (movie?.id || activeStreamMovie?.id || id),
    season: selectedSeason,
    episode: selectedEpisode,
    isTV: isTvShow,
    mediaType: isTvShow ? "tv" : "movie",
  } : null;

  const streamMedia = playerMedia;

  const handleStartPlay = (s = selectedSeason, e = selectedEpisode) => {
    isPlayerClosedByUserRef.current = false;
    const isMatchingEpisode =
      !isTvShow ||
      (Number(savedHistory?.season) === Number(s) &&
        Number(savedHistory?.episode) === Number(e));
    const resumeTime = isMatchingEpisode ? Number(savedHistory?.currentTime) || 0 : 0;

    const playMedia = {
      ...(movie || activeStreamMovie || {}),
      id: (movie?.id || activeStreamMovie?.id || id),
      season: s,
      episode: e,
      isTV: isTvShow,
      mediaType: isTvShow ? "tv" : "movie",
      currentTime: resumeTime,
    };
    recordPlay(playMedia, { season: s, episode: e });
    setActiveStreamMovie(playMedia);
    setShowPlayer(true);
    try {
      sessionStorage.setItem("cineverse_current_stream", JSON.stringify(playMedia));
    } catch {
      // ignore
    }
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
    isPlayerClosedByUserRef.current = true;
    hasRestoredPlayRef.current = true;
    setShowPlayer(false);
    setActiveStreamMovie(null);
    try {
      sessionStorage.removeItem("cineverse_current_stream");
    } catch {
      // ignore
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("play");
      next.delete("season");
      next.delete("episode");
      return next;
    }, { replace: true });
  };

  function playRecommendation(recommendedMovie) {
    isPlayerClosedByUserRef.current = false;
    const isRecTv = Boolean(recommendedMovie.mediaType === "tv" || recommendedMovie.isTV);
    const media = isRecTv
      ? { ...recommendedMovie, season: 1, episode: 1, isTV: true, mediaType: "tv" }
      : recommendedMovie;
    recordPlay(media, { season: media.season, episode: media.episode });
    setActiveStreamMovie(media);
    setShowPlayer(true);
    try {
      sessionStorage.setItem("cineverse_current_stream", JSON.stringify(media));
    } catch {
      // ignore
    }
  }

  if (loading) {
    if (showPlayer && streamMedia && !isPlayerClosedByUserRef.current) {
      return (
        <div className="movie-details-page">
          <div className="player-overlay">
            <div className="player-header">
              <div>
                <span className="section-eyebrow">NOW PLAYING</span>
                <h2>{streamMedia.title || "Now Playing"}</h2>
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
            </div>
          </div>
        </div>
      );
    }
    if (showPlayer && !isPlayerClosedByUserRef.current) {
      return (
        <div className="player-overlay">
          <div className="player-header">
            <div>
              <span className="section-eyebrow">NOW PLAYING</span>
              <h2>Resuming playback...</h2>
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
            <div className="player-window player-stream-restoring">
              <Loader2 size={40} className="cv-spin-loader" />
              <h3>Resuming playback...</h3>
              <p>Connecting to secure stream servers</p>
            </div>
          </div>
        </div>
      );
    }
    return <MovieDetailsSkeleton onBack={() => navigate("/")} />;
  }

  if (!movie) {
    if (error) {
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
    return <MovieDetailsSkeleton onBack={() => navigate("/")} />;
  }

  return (
    <div className="movie-details-page">
      {/* Compact home control over the movie backdrop */}
      <header className="details-header">
        <button
          className="btn-secondary back-btn details-home-back-btn"
          onClick={() => navigate("/")}
          aria-label="Back to home"
          title="Back to home"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      </header>

      {/* GIANT BACKDROP BILLBOARD */}
      <section className="details-hero">
        {/* Background Backdrop Image */}
        <div
          className={`details-hero-bg ${isTrailerVisible && trailerKey ? "has-trailer" : ""}`}
          style={{
            backgroundImage: `url("${movie.backdrop || movie.poster}")`,
          }}
        />

        {/* Background Trailer Video */}
        {isTrailerMounted && trailerKey && !showPlayer && (
          <div className={`details-hero-trailer-wrap ${isTrailerVisible ? "visible" : ""}`}>
            <iframe
              ref={trailerIframeRef}
              className="details-hero-trailer-iframe"
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&iv_load_policy=3&origin=${encodeURIComponent(window.location.origin)}`}
              title={`${movie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              tabIndex="-1"
              onLoad={(e) => {
                try {
                  e.target?.contentWindow?.postMessage(
                    JSON.stringify({ event: "listening", id: "details-trailer" }),
                    "*"
                  );
                  e.target?.contentWindow?.postMessage(
                    JSON.stringify({
                      event: "command",
                      func: "addEventListener",
                      args: ["onStateChange"],
                    }),
                    "*"
                  );
                } catch (_) {}
                if (!isTrailerMuted) {
                  sendYouTubeCommand("unMute");
                  sendYouTubeCommand("setVolume", [100]);
                }
              }}
            />
            {/* Transparent mouse shield that stops all mouse hovering/clicking from reaching YouTube */}
            <div className="details-hero-trailer-shield" />
          </div>
        )}

        {/* Gradient Overlays */}
        <div className="details-hero-gradient-left" />
        <div className="details-hero-gradient-bottom" />
        <div className="details-hero-vignette" />
        <div className="details-hero-live-glass" aria-hidden="true" />

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
                className="btn-primary details-btn-watch"
                onClick={() => handleStartPlay()}
              >
                <Play size={16} fill="currentColor" />
                <span>
                  {savedHistory && !savedHistory.completed
                    ? isTvShow
                      ? selectedSeason === Number(savedHistory.season) && selectedEpisode === Number(savedHistory.episode)
                        ? `Continue Watching (S${selectedSeason}:E${selectedEpisode})`
                        : `Play S${selectedSeason}:E${selectedEpisode}`
                      : "Continue Watching"
                    : isTvShow
                    ? `Watch S${selectedSeason}:E${selectedEpisode}`
                    : "Watch Now"}
                </span>
              </button>

              <div className="details-actions-secondary">
                {movie.trailerUrl && (
                  <button
                    className="btn-secondary"
                    onClick={() => setShowTrailer(true)}
                  >
                    <Film size={16} />
                    <span>Watch Trailer</span>
                  </button>
                )}

                <button
                  className="btn-secondary"
                  onClick={() => toggleWatchlist(movie)}
                >
                  {isSaved ? <Check size={16} /> : <Plus size={16} />}
                  <span>{isSaved ? "In My List" : "Add to List"}</span>
                </button>

                {trailerKey && (
                  <button
                    className={`btn-secondary trailer-voice-btn ${!isTrailerMuted ? "voice-active" : ""}`}
                    onClick={handleToggleTrailerVoice}
                    title={isTrailerMuted ? "Open trailer voice (Unmute)" : "Close trailer voice (Mute)"}
                    aria-label={isTrailerMuted ? "Open trailer voice" : "Close trailer voice"}
                  >
                    {isTrailerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    <span>{isTrailerMuted ? "Voice Off" : "Voice On"}</span>
                  </button>
                )}
              </div>
            </div>

            {savedHistory?.progressPercent > 0 && !savedHistory.completed && (
              <div className="details-resume-progress">
                <div className="details-resume-track">
                  <span style={{ width: `${Math.min(100, savedHistory.progressPercent)}%` }} />
                </div>
                <span className="details-resume-label">
                  Left off at {isTvShow ? `S${savedHistory.season || 1}:E${savedHistory.episode || 1} • ` : ""}
                  {Math.round(savedHistory.progressPercent)}% completed
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div
        className={`details-hero-color-bleed ${isTrailerVisible && trailerKey ? "trailer-active" : ""}`}
        style={{ "--details-hero-art": `url("${heroGlowImage}")` }}
        aria-hidden="true"
      />

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
      {showPlayer && !isPlayerClosedByUserRef.current && streamMedia && (
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
              movies={movie?.similar || []}
              currentMovie={streamMedia}
              onPlay={playRecommendation}
              isSaved={(mediaId) => watchlist.some((saved) => String(saved.id) === String(mediaId))}
              onToggleWatchlist={toggleWatchlist}
            />
          </div>
        </div>
      )}

      {/* TRAILER MODAL */}
      {showTrailer && movie?.trailerUrl && (
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
                title={`${movie?.title || "Movie"} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* FRAMEXTV SIGNATURE FIXED MOBILE BOTTOM NAVIGATION */}
      <nav className="framex-bottom-nav" aria-label="Mobile navigation">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="framex-nav-tab"
          aria-label="Home"
        >
          <Home size={18} strokeWidth={1.8} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="framex-nav-tab"
          aria-label="Discover Movies"
        >
          <Compass size={18} strokeWidth={1.8} />
          <span>Movies</span>
        </button>

        <button
          type="button"
          onClick={() => handleStartPlay()}
          className="framex-nav-tab framex-nav-play-tab"
          aria-label="Watch Now"
        >
          <Play size={18} fill="currentColor" />
          <span>Play</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (movie.trailerUrl) setShowTrailer(true);
            else handleToggleTrailerVoice();
          }}
          className="framex-nav-tab"
          aria-label="Watch Trailer"
        >
          <Film size={18} strokeWidth={1.8} />
          <span>Trailer</span>
        </button>

        <button
          type="button"
          onClick={() => toggleWatchlist(movie)}
          className={`framex-nav-tab ${isSaved ? "active" : ""}`}
          aria-label="My Watchlist"
        >
          <Bookmark size={18} strokeWidth={isSaved ? 2.4 : 1.8} />
          <span>{isSaved ? "Saved" : "My List"}</span>
        </button>
      </nav>
    </div>
  );
}

export default MovieDetails;
