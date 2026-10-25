import "./CineVerseLogo.css";

export function CineVerseEmblem({ size = 32, className = "" }) {
  return (
    <svg
      className={`cv-logo-emblem ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cv-emblem-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="cv-emblem-c" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f4f4f5" />
          <stop offset="100%" stopColor="#a1a1aa" />
        </linearGradient>
        <linearGradient id="cv-emblem-prism" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d4d4d8" />
        </linearGradient>
        <filter id="cv-emblem-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cosmic Universe Orbit Ring */}
      <ellipse
        className="cv-orbit-ring"
        cx="32"
        cy="32"
        rx="27"
        ry="10"
        transform="rotate(-28 32 32)"
        stroke="url(#cv-emblem-orbit)"
        strokeWidth="1.6"
        strokeDasharray="65 12 25 8"
        opacity="0.8"
      />

      {/* Primary Cinema 'C' Arc */}
      <path
        d="M 46 16.5 C 39 10.5 28 10.5 19.5 17 C 9.5 24.5 9.5 39.5 19.5 47 C 28 53.5 39 53.5 46 47.5"
        stroke="url(#cv-emblem-c)"
        strokeWidth="5"
        strokeLinecap="round"
        filter="url(#cv-emblem-glow)"
      />

      {/* Streaming Play Prism Core */}
      <path
        d="M 28.5 23.5 L 43.5 32 L 28.5 40.5 Z"
        fill="url(#cv-emblem-prism)"
        stroke="url(#cv-emblem-prism)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        filter="url(#cv-emblem-glow)"
      />

      {/* Celestial Flare Star */}
      <circle cx="46" cy="16.5" r="1.8" fill="#ffffff" />
      <circle cx="43.5" cy="32" r="1.2" fill="#ffffff" />
    </svg>
  );
}

export function CineVerseLogo({
  variant = "full", // "full" | "icon" | "text"
  size = "md", // "sm" | "md" | "lg" | "xl"
  className = "",
  showDot = true,
}) {
  const pixelSizes = {
    sm: 22,
    md: 30,
    lg: 40,
    xl: 52,
  };

  const emblemSize = typeof size === "number" ? size : (pixelSizes[size] || 30);
  const sizeClass = typeof size === "string" ? `size-${size}` : "";

  return (
    <div className={`cineverse-logo-wrap ${sizeClass} ${className}`.trim()} aria-label="CineVerse">
      {(variant === "full" || variant === "icon") && (
        <CineVerseEmblem size={emblemSize} />
      )}

      {(variant === "full" || variant === "text") && (
        <span className="cv-wordmark">
          <span className="cv-wordmark-cine">CINE</span>
          <span className="cv-wordmark-verse">VERSE</span>
          {showDot && <span className="cv-wordmark-dot" />}
        </span>
      )}
    </div>
  );
}

export default CineVerseLogo;
