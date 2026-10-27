import "./CinematicSplashScreen.css";

export function CinematicSplashScreen({
  status = "Connecting to global cinematic archive...",
  fadeOut = false,
}) {
  return (
    <div
      className={`cine-splash-overlay ${fadeOut ? "fade-out" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading CineVerse"
    >
      <div className="cine-splash-ambient-glow" />

      <div className="cine-splash-core">
        {/* Animated CineVerse Emblem */}
        <div className="cine-splash-emblem-wrap">
          <svg
            className="cine-splash-emblem-svg"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="splash-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="splash-c" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f4f4f5" />
                <stop offset="100%" stopColor="#a1a1aa" />
              </linearGradient>
              <linearGradient id="splash-prism" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e4e4e7" />
              </linearGradient>
              <filter id="splash-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Orbit Cosmic Ring */}
            <ellipse
              className="cine-splash-orbit"
              cx="32"
              cy="32"
              rx="27"
              ry="10"
              stroke="url(#splash-orbit)"
              strokeWidth="2"
              strokeDasharray="60 14 26 8"
            />

            {/* Cinema 'C' Arc */}
            <path
              d="M 46 16.5 C 39 10.5 28 10.5 19.5 17 C 9.5 24.5 9.5 39.5 19.5 47 C 28 53.5 39 53.5 46 47.5"
              stroke="url(#splash-c)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#splash-glow)"
            />

            {/* Play Prism Core */}
            <path
              className="cine-splash-prism"
              d="M 28.5 23.5 L 43.5 32 L 28.5 40.5 Z"
              fill="url(#splash-prism)"
              stroke="url(#splash-prism)"
              strokeWidth="1.8"
              strokeLinejoin="round"
              filter="url(#splash-glow)"
            />

            <circle cx="46" cy="16.5" r="2.2" fill="#ffffff" />
            <circle cx="43.5" cy="32" r="1.5" fill="#ffffff" />
          </svg>
        </div>

        {/* Wordmark with Light Sweep Shimmer */}
        <div className="cine-splash-brand">
          <span className="cine-splash-brand-cine">CINE</span>
          <span className="cine-splash-brand-verse">VERSE</span>
          <span className="cine-splash-brand-dot" />
          <div className="cine-splash-shimmer" />
        </div>

        {/* Audio / Cinema Equalizer Wave */}
        <div className="cine-splash-soundwave" aria-hidden="true">
          <div className="cine-splash-bar" />
          <div className="cine-splash-bar" />
          <div className="cine-splash-bar" />
          <div className="cine-splash-bar" />
          <div className="cine-splash-bar" />
        </div>

        {/* Status Line */}
        <div className="cine-splash-tagline">{status}</div>

        {/* Progress slide track */}
        <div className="cine-splash-track">
          <div className="cine-splash-progress" />
        </div>
      </div>
    </div>
  );
}

export default CinematicSplashScreen;
