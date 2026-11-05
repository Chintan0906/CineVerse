import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Info, Plus, Check, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CineVerseEmblem } from "../common/CineVerseLogo";
import { getMovieById, getTVShowById } from "../../services/movieService";

function HeroSlideshow({ featuredMovies = [], watchlist = [], onToggleWatchlist, onPlay }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTrailerMounted, setIsTrailerMounted] = useState(false);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [trailerKeys, setTrailerKeys] = useState({});

  const trailerTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const trailerIframeRef = useRef(null);

  const currentMovie = featuredMovies[currentIndex];
  const activeTrailerKey =
    currentMovie?.trailerKey ||
    (currentMovie?.id ? trailerKeys[currentMovie.id] : null) ||
    (currentMovie?.trailerUrl
      ? currentMovie.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
        currentMovie.trailerUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ||
        currentMovie.trailerUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1]
      : null);

  // Lazy fetch trailer key if not provided by backend
  useEffect(() => {
    if (!currentMovie || activeTrailerKey) return;
    const isTv = Boolean(currentMovie.mediaType === "tv" || currentMovie.isTV);
    const fetcher = isTv ? getTVShowById(currentMovie.id) : getMovieById(currentMovie.id);
    fetcher
      .then((data) => {
        const key =
          data?.trailerKey ||
          (data?.trailerUrl
            ? data.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
              data.trailerUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ||
              data.trailerUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1]
            : null);
        if (key) {
          setTrailerKeys((prev) => ({ ...prev, [currentMovie.id]: key }));
        }
      })
      .catch(() => {});
  }, [currentIndex, currentMovie, activeTrailerKey]);

  // 1. Mount trailer in background at 600ms, cross-fade in at 4.8s
  useEffect(() => {
    setIsTrailerMounted(false);
    setIsTrailerVisible(false);
    setIsMuted(true);
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

    if (featuredMovies.length === 0) return;

    trailerTimerRef.current = setTimeout(() => {
      setIsTrailerMounted(true);
    }, 600);

    revealTimerRef.current = setTimeout(() => {
      setIsTrailerVisible(true);
    }, 4800);

    return () => {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [currentIndex, featuredMovies.length]);

  // 2. Auto-advance to next slide after trailer preview unless paused or unmuted
  useEffect(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

    if (featuredMovies.length <= 1 || isPaused || !isMuted) return;

    advanceTimerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 30000);

    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [currentIndex, isPaused, isMuted, featuredMovies.length]);

  // 3. Listen for video start and loop seamlessly without playlist UI
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube sends info: 1 (PLAYING)
        if ((data?.event === "onStateChange" && data?.info === 1) || data?.info?.playerState === 1) {
          // Wait 2400ms for YouTube's play/pause bezel animation to finish and vanish completely
          if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
          revealTimerRef.current = setTimeout(() => {
            setIsTrailerVisible(true);
          }, 2400);
        }
        // YouTube sends info: 0 (ENDED) -> loop
        if ((data?.event === "onStateChange" && data?.info === 0) || data?.info?.playerState === 0) {
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

  const handleToggleSound = (e) => {
    e?.stopPropagation?.();
    if (!activeTrailerKey) return;

    if (!isTrailerVisible) {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      setIsTrailerMounted(true);
      setIsMuted(false);
      revealTimerRef.current = setTimeout(() => {
        setIsTrailerVisible(true);
      }, 2400);
      return;
    }

    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendYouTubeCommand(nextMuted ? "mute" : "unMute");
    if (!nextMuted) {
      sendYouTubeCommand("setVolume", [100]);
    }
  };

  const handleNext = useCallback(() => {
    if (featuredMovies.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
  }, [featuredMovies.length]);

  const handlePrev = useCallback(() => {
    if (featuredMovies.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
  }, [featuredMovies.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Touch gesture support for mobile swiping
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  const handleTouchStart = (e) => {
    if (e.targetTouches?.[0]) {
      setTouchStartX(e.targetTouches[0].clientX);
      setTouchEndX(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (e.targetTouches?.[0]) {
      setTouchEndX(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  if (!featuredMovies || featuredMovies.length === 0) return null;

  return (
    <section
      className={`hero-slideshow notranslate ${isTrailerVisible && activeTrailerKey ? "trailer-playing" : ""}`}
      translate="no"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Showcase"
    >
      {/* Individual Self-Contained Slides (Guarantees titles never stack) */}
      <div className="hero-slideshow-track">
        {featuredMovies.map((movie, index) => {
          const isActive = index === currentIndex;
          const isSaved = watchlist.some(
            (saved) => (typeof saved === "object" ? saved.id : saved) === movie?.id
          );
          const slideTrailerKey =
            movie.trailerKey ||
            trailerKeys[movie.id] ||
            (movie.trailerUrl
              ? movie.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
                movie.trailerUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ||
                movie.trailerUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1]
              : null);

          return (
            <div
              key={movie.id}
              className={`hero-slide-item ${isActive ? "active" : ""}`}
              aria-hidden={!isActive}
            >
              {/* Slide Background Image */}
              <div
                className={`hero-slideshow-bg ${isActive ? "active" : ""} ${isActive && isTrailerVisible && slideTrailerKey ? "has-trailer" : ""}`}
                style={{
                  backgroundImage: `url("${movie.backdrop || movie.poster}")`,
                }}
              />

              {/* Active Slide Background Trailer Video */}
              {isActive && isTrailerMounted && slideTrailerKey && (
                <div className={`hero-trailer-wrap ${isTrailerVisible ? "visible" : ""}`}>
                  <iframe
                    ref={trailerIframeRef}
                    className="hero-trailer-iframe"
                    src={`https://www.youtube.com/embed/${slideTrailerKey}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&iv_load_policy=3`}
                    title={`${movie.title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    tabIndex="-1"
                    onLoad={(e) => {
                      try {
                        e.target?.contentWindow?.postMessage(
                          JSON.stringify({ event: "listening", id: "hero-trailer" }),
                          "*"
                        );
                      } catch (_) {}
                      if (!isMuted) {
                        sendYouTubeCommand("unMute");
                        sendYouTubeCommand("setVolume", [100]);
                      }
                    }}
                  />
                  {/* Transparent mouse shield that stops all mouse hovering/clicking from reaching YouTube */}
                  <div className="hero-trailer-shield" />
                </div>
              )}

              {/* Gradient Overlays */}
              <div className="hero-slideshow-gradient-left" />
              <div className="hero-slideshow-gradient-bottom" />
              <div className="hero-slideshow-vignette" />

              {/* Content Container (Layered per slide) */}
              <div className="hero-slideshow-content">
                {/* Top Badge */}
                <div className="hero-slideshow-badge">
                  <CineVerseEmblem size={15} />
                  <span>SPOTLIGHT</span>
                </div>

                {/* Rank Badge */}
                <div className="hero-slideshow-rank">
                  <span className="rank-number">#{index + 1}</span>
                  <span className="rank-text">TRENDING NOW</span>
                </div>

                {/* Title */}
                <h1 className="hero-slideshow-title">
                  {movie.title}
                </h1>

                {/* Movie Meta */}
                <div className="hero-slideshow-meta">
                  <span className="meta-year">{movie.year}</span>
                  <span className="meta-separator">•</span>
                  <span className="meta-rating">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {movie.rating}
                  </span>
                  <span className="meta-separator">•</span>
                  <span className="meta-duration">{movie.duration}</span>
                  <span className="meta-quality">4K</span>
                  <span className="meta-audio">HDR</span>
                </div>

                {/* Description */}
                <p className="hero-slideshow-description">
                  {movie.description}
                </p>

                {/* Genre Tags */}
                <div className="hero-slideshow-genres">
                  {movie.genres?.slice(0, 3).map((genre) => (
                    <span key={genre} className="genre-tag">{genre}</span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="hero-slideshow-actions">
                  <button
                    className="hero-btn-play"
                    onClick={() => onPlay(movie)}
                  >
                    <Play size={20} fill="currentColor" />
                    <span>Play</span>
                  </button>

                  <button
                    className="hero-btn-info"
                    onClick={() => {
                      const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
                      navigate(`/movie/${movie.id}${isTv ? "?type=tv" : ""}`, {
                        state: { mediaType: isTv ? "tv" : "movie", isTV: isTv },
                      });
                    }}
                  >
                    <Info size={18} />
                    <span>More Info</span>
                  </button>

                  <button
                    className="hero-btn-list"
                    onClick={() => onToggleWatchlist(movie.id)}
                    title={isSaved ? "Remove from list" : "Add to list"}
                  >
                    {isSaved ? (
                      <Check size={20} strokeWidth={2.5} />
                    ) : (
                      <Plus size={20} strokeWidth={2.5} />
                    )}
                  </button>

                  <button
                    className={`hero-btn-sound ${!isMuted ? "voice-active" : ""}`}
                    onClick={handleToggleSound}
                    title={isMuted ? "Open trailer voice (Unmute)" : "Close trailer voice (Mute)"}
                    aria-label={isMuted ? "Open trailer voice" : "Close trailer voice"}
                  >
                    {isMuted ? (
                      <VolumeX size={20} />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {featuredMovies.length > 1 && (
        <>
          <button
            className="hero-nav-arrow hero-nav-prev"
            onClick={handlePrev}
            aria-label="Previous movie"
          >
            <ChevronLeft size={32} strokeWidth={2} />
          </button>

          <button
            className="hero-nav-arrow hero-nav-next"
            onClick={handleNext}
            aria-label="Next movie"
          >
            <ChevronRight size={32} strokeWidth={2} />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {featuredMovies.length > 1 && (
        <div className="hero-slideshow-indicators">
          {featuredMovies.map((movie, index) => (
            <button
              key={movie.id}
              className={`indicator ${index === currentIndex ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to ${movie.title}`}
            >
              <span className="indicator-progress" />
            </button>
          ))}
        </div>
      )}

      {/* Maturity Rating Badge */}
      <div className="hero-maturity-badge">
        18+
      </div>
    </section>
  );
}

export default HeroSlideshow;
