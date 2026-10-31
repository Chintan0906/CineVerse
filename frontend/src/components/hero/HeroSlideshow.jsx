import { useState, useEffect, useCallback } from "react";
import { Play, Info, Plus, Check, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CineVerseEmblem } from "../common/CineVerseLogo";

function HeroSlideshow({ featuredMovies, watchlist, onToggleWatchlist, onPlay }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const currentMovie = featuredMovies[currentIndex];
  const isSaved = watchlist.some(
    (saved) => (typeof saved === "object" ? saved.id : saved) === currentMovie?.id
  );

  // Auto-advance slideshow every 6 seconds
  useEffect(() => {
    if (isPaused || featuredMovies.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, featuredMovies.length]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning, featuredMovies.length]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning, featuredMovies.length]);

  const goToSlide = (index) => {
    if (index === currentIndex || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 700);
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

  if (!currentMovie) return null;

  return (
    <section
      className="hero-slideshow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Images with Fade Transition */}
      <div className="hero-slideshow-backgrounds">
        {featuredMovies.map((movie, index) => (
          <div
            key={movie.id}
            className={`hero-slideshow-bg ${index === currentIndex ? 'active' : ''}`}
            style={{
              backgroundImage: `url("${movie.backdrop || movie.poster}")`
            }}
          />
        ))}
      </div>

      {/* Gradient Overlays */}
      <div className="hero-slideshow-gradient-left" />
      <div className="hero-slideshow-gradient-bottom" />
      <div className="hero-slideshow-vignette" />

      {/* Content Container */}
      <div className="hero-slideshow-content">
        {/* Top Badge */}
        <div className="hero-slideshow-badge">
          <CineVerseEmblem size={15} />
          <span>SPOTLIGHT</span>
        </div>

        {/* Rank Badge */}
        <div className="hero-slideshow-rank">
          <span className="rank-number">#{currentIndex + 1}</span>
          <span className="rank-text">TRENDING NOW</span>
        </div>

        {/* Title with Fade Animation */}
        <h1
          className={`hero-slideshow-title ${isTransitioning ? 'fade-out' : 'fade-in'}`}
          key={currentMovie.id}
        >
          {currentMovie.title}
        </h1>

        {/* Movie Meta */}
        <div className="hero-slideshow-meta">
          <span className="meta-year">{currentMovie.year}</span>
          <span className="meta-separator">•</span>
          <span className="meta-rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {currentMovie.rating}
          </span>
          <span className="meta-separator">•</span>
          <span className="meta-duration">{currentMovie.duration}</span>
          <span className="meta-quality">4K</span>
          <span className="meta-audio">HDR</span>
        </div>

        {/* Description */}
        <p
          className={`hero-slideshow-description ${isTransitioning ? 'fade-out' : 'fade-in'}`}
          key={currentMovie.id}
        >
          {currentMovie.description}
        </p>

        {/* Genre Tags */}
        <div className="hero-slideshow-genres">
          {currentMovie.genres?.slice(0, 3).map((genre) => (
            <span key={genre} className="genre-tag">{genre}</span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="hero-slideshow-actions">
          <button
            className="hero-btn-play"
            onClick={() => onPlay(currentMovie)}
          >
            <Play size={20} fill="currentColor" />
            <span>Play</span>
          </button>

          <button
            className="hero-btn-info"
            onClick={() => {
              const isTv = Boolean(currentMovie.mediaType === "tv" || currentMovie.isTV);
              navigate(`/movie/${currentMovie.id}${isTv ? "?type=tv" : ""}`, {
                state: { mediaType: isTv ? "tv" : "movie", isTV: isTv },
              });
            }}
          >
            <Info size={18} />
            <span>More Info</span>
          </button>

          <button
            className="hero-btn-list"
            onClick={() => onToggleWatchlist(currentMovie.id)}
            title={isSaved ? "Remove from list" : "Add to list"}
          >
            {isSaved ? (
              <Check size={20} strokeWidth={2.5} />
            ) : (
              <Plus size={20} strokeWidth={2.5} />
            )}
          </button>

          <button
            className="hero-btn-sound"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {featuredMovies.length > 1 && (
        <>
          <button
            className="hero-nav-arrow hero-nav-prev"
            onClick={handlePrev}
            disabled={isTransitioning}
            aria-label="Previous movie"
          >
            <ChevronLeft size={32} strokeWidth={2} />
          </button>

          <button
            className="hero-nav-arrow hero-nav-next"
            onClick={handleNext}
            disabled={isTransitioning}
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
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
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
