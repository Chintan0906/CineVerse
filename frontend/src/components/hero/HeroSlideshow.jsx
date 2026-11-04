import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Info, Plus, Check, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CineVerseEmblem } from "../common/CineVerseLogo";
import { getMovieById, getTVShowById } from "../../services/movieService";

function HeroSlideshow({ featuredMovies = [], watchlist = [], onToggleWatchlist, onPlay }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [trailerKeys, setTrailerKeys] = useState({});

  const trailerTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const trailerIframeRef = useRef(null);

  const currentMovie = featuredMovies[currentIndex];
  const activeTrailerKey =
    currentMovie?.trailerKey ||
    (currentMovie?.id ? trailerKeys[currentMovie.id] : null) ||
    (currentMovie?.trailerUrl ? currentMovie.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] : null);

  // Lazy fetch trailer key if not provided by backend
  useEffect(() => {
    if (!currentMovie || activeTrailerKey) return;
    const isTv = Boolean(currentMovie.mediaType === "tv" || currentMovie.isTV);
    const fetcher = isTv ? getTVShowById(currentMovie.id) : getMovieById(currentMovie.id);
    fetcher
      .then((data) => {
        const key =
          data?.trailerKey ||
          (data?.trailerUrl ? data.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] : null);
        if (key) {
          setTrailerKeys((prev) => ({ ...prev, [currentMovie.id]: key }));
        }
      })
      .catch(() => {});
  }, [currentIndex, currentMovie, activeTrailerKey]);

  // Show poster image for 12 seconds, then start trailer. Auto-advance after 38s unless paused or unmuted.
  useEffect(() => {
    setIsTrailerPlaying(false);
    setIsMuted(true);
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

    if (featuredMovies.length <= 1) return;

    // Start trailer after 12s
    trailerTimerRef.current = setTimeout(() => {
      setIsTrailerPlaying(true);
    }, 12000);

    // Auto-advance to next slide after trailer preview unless unmuted or user is hovering
    if (!isPaused && isMuted) {
      advanceTimerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
      }, 38000);
    }

    return () => {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [currentIndex, isPaused, isMuted, featuredMovies.length]);

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

    if (!isTrailerPlaying) {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      setIsTrailerPlaying(true);
      setIsMuted(false);
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
      className="hero-slideshow notranslate"
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
            (movie.trailerUrl ? movie.trailerUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] : null);

          return (
            <div
              key={movie.id}
              className={`hero-slide-item ${isActive ? "active" : ""}`}
              aria-hidden={!isActive}
            >
              {/* Slide Background Image */}
              <div
                className={`hero-slideshow-bg ${isActive ? "active" : ""} ${isActive && isTrailerPlaying && slideTrailerKey ? "has-trailer" : ""}`}
                style={{
                  backgroundImage: `url("${movie.backdrop || movie.poster}")`,
                }}
              />

              {/* Active Slide Background Trailer Video */}
              {isActive && isTrailerPlaying && slideTrailerKey && (
                <div className="hero-trailer-wrap">
                  <iframe
                    ref={trailerIframeRef}
                    className="hero-trailer-iframe"
                    src={`https://www.youtube-nocookie.com/embed/${slideTrailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${slideTrailerKey}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&modestbranding=1&enablejsapi=1`}
                    title={`${movie.title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    tabIndex="-1"
                    onLoad={() => {
                      if (!isMuted) {
                        sendYouTubeCommand("unMute");
                        sendYouTubeCommand("setVolume", [100]);
                      }
                    }}
                  />
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
