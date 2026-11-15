import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Clapperboard, Info, LoaderCircle, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useMovies } from "../hooks/useMovies";
import "./ReelsPage.css";

function extractTrailerKey(movie) {
  if (movie?.trailerKey) return movie.trailerKey;
  const url = movie?.trailerUrl || movie?.trailer || "";
  return url.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1] ||
    null;
}

function ReelsPage() {
  const navigate = useNavigate();
  const { movies, featuredMovies, loading, error } = useMovies();
  const feedRef = useRef(null);
  const slideRefs = useRef([]);
  const playerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const reels = useMemo(() => {
    const seen = new Set();
    return [...(featuredMovies || []), ...(movies || [])]
      .map((movie) => ({ ...movie, resolvedTrailerKey: extractTrailerKey(movie) }))
      .filter((movie) => {
        const id = String(movie.id);
        if (!movie.resolvedTrailerKey || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 24);
  }, [featuredMovies, movies]);

  useEffect(() => {
    const priorTitle = document.title;
    document.title = "Movie Reels | CineVerse";
    return () => { document.title = priorTitle; };
  }, []);

  useEffect(() => {
    const root = feedRef.current;
    if (!root || !reels.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const nextIndex = Number(visible.target.dataset.reelIndex);
      if (Number.isInteger(nextIndex)) setActiveIndex(nextIndex);
    }, { root, threshold: [0.55, 0.72, 0.9] });

    slideRefs.current.forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [reels.length]);

  useEffect(() => {
    setIsMuted(true);
    setIsPlaying(true);
  }, [activeIndex]);

  const scrollToReel = useCallback((index) => {
    const bounded = Math.max(0, Math.min(index, reels.length - 1));
    slideRefs.current[bounded]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reels.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      )) return;

      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToReel(activeIndex + 1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToReel(activeIndex - 1);
      } else if (event.key === "Escape") {
        navigate("/");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, navigate, scrollToReel]);

  const sendPlayerCommand = useCallback((func, args = []) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }, []);

  const togglePlayback = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    sendPlayerCommand(nextPlaying ? "playVideo" : "pauseVideo");
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendPlayerCommand(nextMuted ? "mute" : "unMute");
    if (!nextMuted) sendPlayerCommand("setVolume", [100]);
  };

  if (loading) {
    return (
      <main className="reels-state-screen" aria-live="polite" aria-busy="true">
        <LoaderCircle size={28} className="reels-loading-icon" aria-hidden="true" />
        <span>Finding something to watch…</span>
      </main>
    );
  }

  if (error || !reels.length) {
    return (
      <main className="reels-state-screen">
        <button className="reels-back-button" type="button" onClick={() => navigate("/")} aria-label="Back to CineVerse">
          <ArrowLeft size={19} />
        </button>
        <Clapperboard size={34} aria-hidden="true" />
        <h1>{error ? "Reels are taking a break" : "No trailers available right now"}</h1>
        <p>{error ? "We couldn't load the trailer feed. Try again in a moment." : "Check back soon for official trailers and featured previews."}</p>
        <button className="reels-return-link" type="button" onClick={() => navigate("/")}>Back to CineVerse</button>
      </main>
    );
  }

  return (
    <main className="reels-page" aria-label="Movie reels">
      <div className="reels-feed" ref={feedRef}>
        {reels.map((reel, index) => {
          const isActive = index === activeIndex;
          const isTV = reel.mediaType === "tv" || reel.isTV;
          const detailsHref = `/movie/${reel.id}${isTV ? "?type=tv" : ""}`;
          const trailerSrc = `https://www.youtube-nocookie.com/embed/${reel.resolvedTrailerKey}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

          return (
            <section
              className="reel-slide"
              key={`${reel.id}-${reel.resolvedTrailerKey}`}
              data-reel-index={index}
              ref={(node) => { slideRefs.current[index] = node; }}
              aria-label={`${reel.title} trailer, ${index + 1} of ${reels.length}`}
              style={{ "--reel-backdrop": `url("${reel.backdrop || reel.poster || ""}")` }}
            >
              <div className="reel-backdrop" aria-hidden="true" />
              <div className="reel-shade" aria-hidden="true" />
              <header className="reels-header">
                <button className="reels-back-button" type="button" onClick={() => navigate("/")} aria-label="Back to CineVerse">
                  <ArrowLeft size={19} />
                </button>
                <div className="reels-wordmark"><Clapperboard size={18} /><span>CINEVERSE <b>REELS</b></span></div>
                <div className="reels-position" aria-label={`Reel ${index + 1} of ${reels.length}`}>
                  {String(index + 1).padStart(2, "0")} <span>/</span> {String(reels.length).padStart(2, "0")}
                </div>
              </header>

              <div className="reel-stage">
                <div className="reel-player-frame">
                  {isActive ? (
                    <iframe
                      ref={playerRef}
                      src={trailerSrc}
                      title={`${reel.title} official trailer`}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className="reel-player-poster" style={{ backgroundImage: `url("${reel.backdrop || reel.poster || ""}")` }} />
                  )}
                  {isActive && <div className="reel-player-shield" aria-hidden="true" />}
                </div>
              </div>

              <div className="reel-caption">
                <div className="reel-type"><span className="reel-live-dot" /> OFFICIAL TRAILER</div>
                <h1>{reel.title}</h1>
                <p className="reel-meta">
                  {reel.year || (reel.releaseDate || reel.firstAirDate || "").slice(0, 4)}
                  {Number.isFinite(Number(reel.rating)) && reel.rating ? <><span>•</span> ★ {Number(reel.rating).toFixed(1)}</> : null}
                  <span>•</span> {isTV ? "Series" : "Movie"}
                </p>
                {reel.description && <p className="reel-description">{reel.description}</p>}
                <button className="reel-details-button" type="button" onClick={() => navigate(detailsHref, { state: { mediaType: isTV ? "tv" : "movie", isTV } })}>
                  <Info size={16} /> Explore title
                </button>
              </div>

              <div className="reel-controls" aria-label="Trailer controls">
                <button type="button" onClick={togglePlayback} aria-label={isPlaying ? "Pause trailer" : "Play trailer"} title={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                </button>
                <button type="button" onClick={toggleMute} aria-label={isMuted ? "Turn sound on" : "Mute trailer"} title={isMuted ? "Turn sound on" : "Mute"}>
                  {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
              </div>

              <div className="reel-scroll-hint" aria-hidden="true">
                <ArrowUp size={14} /><span>SCROLL</span><ArrowDown size={14} />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

export default ReelsPage;
