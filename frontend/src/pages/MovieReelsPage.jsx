import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Clapperboard, Film, Info, LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { getKinoCheckMovieReels } from "../services/movieService";
import "./ReelsPage.css";
import "./MovieReelsPage.css";

const CATEGORIES = [
  { id: "all", label: "All videos" },
  { id: "trailers", label: "Trailers" },
  { id: "moments", label: "Movie moments" },
];

function MovieReelsPage() {
  const navigate = useNavigate();
  const feedRef = useRef(null);
  const slideRefs = useRef([]);
  const playerRef = useRef(null);
  const requestLockRef = useRef(false);
  const requestIdRef = useRef(0);
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feed, setFeed] = useState("trending");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState("en");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const priorTitle = document.title;
    document.title = "Movie Reels | CineVerse";
    return () => { document.title = priorTitle; };
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    requestLockRef.current = true;
    setLoading(true);
    setLoadingMore(true);
    setError("");
    setVideos([]);
    setPage(0);
    setTotalPages(1);
    setHasMore(true);
    setActiveIndex(0);
    setIsMuted(true);
    if (feedRef.current) feedRef.current.scrollTop = 0;

    getKinoCheckMovieReels({ feed, page: 1, limit: 12, category, language, signal: controller.signal })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setVideos(result.videos);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasMore(result.hasMore);
        if (!result.videos.length && !result.hasMore) setError("No clips were found for this selection. Try another category or feed.");
      })
      .catch((fetchError) => {
        if (requestId === requestIdRef.current && fetchError.name !== "AbortError") {
          setError(fetchError.message || "Unable to load Movie Reels.");
          setHasMore(false);
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          requestLockRef.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return () => {
      controller.abort();
      if (requestId === requestIdRef.current) {
        requestIdRef.current += 1;
        requestLockRef.current = false;
      }
    };
  }, [feed, category, language]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root || !videos.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const nextIndex = Number(visible.target.dataset.reelIndex);
      if (Number.isInteger(nextIndex)) setActiveIndex(nextIndex);
    }, { root, threshold: [0.55, 0.75, 0.92] });

    slideRefs.current.forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [videos.length]);

  useEffect(() => {
    setIsMuted(true);
    if (!hasMore || requestLockRef.current || activeIndex < videos.length - 3 || page >= totalPages) return;

    const requestId = requestIdRef.current;
    const nextPage = page + 1;
    requestLockRef.current = true;
    setLoadingMore(true);

    getKinoCheckMovieReels({ feed, page: nextPage, limit: 12, category, language })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setVideos((current) => {
          const seen = new Set(current.map((video) => video.youtubeVideoId));
          const newVideos = result.videos.filter((video) => {
            if (seen.has(video.youtubeVideoId)) return false;
            seen.add(video.youtubeVideoId);
            return true;
          });
          return [...current, ...newVideos];
        });
        setPage(result.page);
        setTotalPages(result.totalPages);
        setHasMore(result.hasMore);
        if (!result.videos.length && !result.hasMore && videos.length === 0) {
          setError("No clips were found for this selection. Try another category or feed.");
        }
      })
      .catch((fetchError) => {
        if (requestId === requestIdRef.current && fetchError.name !== "AbortError") {
          setHasMore(false);
          setError("More clips could not be loaded. You can keep watching the clips already here.");
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          requestLockRef.current = false;
          setLoadingMore(false);
        }
      });

  }, [activeIndex, category, feed, hasMore, language, loadingMore, page, totalPages, videos.length]);

  const scrollToVideo = useCallback((index) => {
    const bounded = Math.max(0, Math.min(index, videos.length - 1));
    slideRefs.current[bounded]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [videos.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToVideo(activeIndex + 1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToVideo(activeIndex - 1);
      } else if (event.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, navigate, scrollToVideo]);

  const sendPlayerCommand = useCallback((func, args = []) => {
    playerRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendPlayerCommand(nextMuted ? "mute" : "unMute");
    if (!nextMuted) sendPlayerCommand("setVolume", [100]);
  };

  if (loading) {
    return <main className="reels-state-screen" aria-live="polite" aria-busy="true"><LoaderCircle size={28} className="reels-loading-icon" /><span>Finding movie trailers and moments…</span></main>;
  }

  if (error && !videos.length) {
    return (
      <main className="reels-state-screen movie-reels-error">
        <button className="reels-back-button" type="button" onClick={() => navigate("/")} aria-label="Back to CineVerse"><ArrowLeft size={19} /></button>
        <Film size={34} aria-hidden="true" />
        <h1>Movie Reels is taking a break</h1>
        <p>{error}</p>
        <button className="reels-return-link" type="button" onClick={() => navigate("/reels")}>Open original Reels</button>
      </main>
    );
  }

  return (
    <main className="reels-page movie-reels-page" aria-label="Movie Reels">
      <div className="reels-feed" ref={feedRef}>
        {videos.map((video, index) => {
          const isActive = index === activeIndex;
          const categoryLabel = video.categories.length ? video.categories.join(" · ").toUpperCase() : "MOVIE PREVIEW";
          const detailsHref = video.tmdbId ? `/movie/${video.tmdbId}${video.mediaType === "tv" ? "?type=tv" : ""}` : null;
          const playerSrc = `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

          return (
            <section
              className="reel-slide"
              key={video.youtubeVideoId}
              data-reel-index={index}
              ref={(node) => { slideRefs.current[index] = node; }}
              aria-label={`${video.movieTitle}, ${categoryLabel.toLowerCase()}, reel ${index + 1}`}
              style={{ "--reel-backdrop": `url("${video.thumbnail || ""}")` }}
            >
              <div className="reel-backdrop" aria-hidden="true" />
              <div className="reel-shade" aria-hidden="true" />
              <header className="reels-header movie-reels-header">
                <button className="reels-back-button" type="button" onClick={() => navigate("/")} aria-label="Back to CineVerse"><ArrowLeft size={19} /></button>
                <div className="reels-wordmark"><Clapperboard size={18} /><span>MOVIE <b>REELS</b></span></div>
                <div className="movie-reels-filters" aria-label="Movie Reels filters">
                  <div className="movie-reels-feed-switch" aria-label="Choose feed">
                    {[["trending", "Trending"], ["latest", "Latest"]].map(([id, label]) => (
                      <button key={id} type="button" className={feed === id ? "selected" : ""} aria-pressed={feed === id} onClick={() => setFeed(id)}>{label}</button>
                    ))}
                  </div>
                  <div className="movie-reels-category-switch" aria-label="Filter video type">
                    {CATEGORIES.map((item) => (
                      <button key={item.id} type="button" className={category === item.id ? "selected" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>
                    ))}
                  </div>
                  <label className="movie-reels-language">
                    <span className="sr-only">Video language</span>
                    <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Video language">
                      <option value="en">EN</option><option value="de">DE</option>
                    </select>
                  </label>
                  <button className="movie-reels-original-button" type="button" onClick={() => navigate("/reels")} aria-label="Open original Reels page"><Film size={15} /><span>Original Reels</span></button>
                </div>
                <div className="reels-position" aria-label={`Clip ${index + 1}${hasMore ? ", more clips load as you scroll" : ` of ${videos.length}`}`}>
                  {String(index + 1).padStart(2, "0")} <span>/</span> {hasMore ? "∞" : String(videos.length).padStart(2, "0")}
                </div>
              </header>

              <div className="reel-stage">
                <div className="reel-player-frame">
                  {isActive ? (
                    <iframe ref={playerRef} src={playerSrc} title={`${video.movieTitle} ${categoryLabel.toLowerCase()}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
                  ) : (
                    <div className="reel-player-poster" style={{ backgroundImage: `url("${video.thumbnail || ""}")` }} />
                  )}
                  {isActive && <div className="reel-player-shield" aria-hidden="true" />}
                </div>
              </div>

              <div className="reel-caption movie-reels-caption">
                <div className="reel-type"><span className="reel-live-dot" /> {categoryLabel} <span className="movie-reels-source">· KINOCHECK</span></div>
                <h1>{video.movieTitle}</h1>
                <p className="reel-meta"><span>{video.language.toUpperCase()}</span>{video.views ? <><span>•</span> {Number(video.views).toLocaleString()} views</> : null}</p>
                <p className="reel-description">{video.title}</p>
                <div className="movie-reels-actions">
                  {detailsHref && <button className="reel-details-button" type="button" onClick={() => navigate(detailsHref)}><Info size={16} /> Explore title</button>}
                  {video.sourceUrl && <a className="movie-reels-source-link" href={video.sourceUrl} target="_blank" rel="noreferrer">KinoCheck source</a>}
                </div>
              </div>

              <div className="reel-controls" aria-label="Movie reel controls">
                <button type="button" onClick={toggleMute} aria-label={isMuted ? "Turn sound on" : "Mute trailer"} title={isMuted ? "Turn sound on" : "Mute trailer"}>{isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
              </div>
              <div className="reel-scroll-hint" aria-hidden="true"><ArrowUp size={14} /><span>SCROLL</span><ArrowDown size={14} /></div>
            </section>
          );
        })}
        {(loadingMore || error) && <div className="movie-reels-status" aria-live="polite">{loadingMore ? <><LoaderCircle size={17} className="reels-loading-icon" /> Loading more clips…</> : error}</div>}
      </div>
    </main>
  );
}

export default MovieReelsPage;
