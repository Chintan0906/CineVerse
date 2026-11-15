import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Clapperboard, ExternalLink, Film, Info, LoaderCircle, ShieldAlert, Volume2, VolumeX } from "lucide-react";
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
  const [blockedVideos, setBlockedVideos] = useState(new Set());

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

  // Catch YouTube iframe player errors (e.g. 150 / 101: geo-restricted or embed blocked in region)
  useEffect(() => {
    function handlePlayerMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const isError =
          data?.event === "onError" ||
          data?.info === 150 ||
          data?.info === 101 ||
          data?.info === 100 ||
          data?.info === 2 ||
          data?.data === 150 ||
          data?.data === 101 ||
          data?.data === 100;

        if (isError) {
          const currentVideo = videos[activeIndex];
          if (currentVideo?.youtubeVideoId) {
            setBlockedVideos((prev) => new Set(prev).add(currentVideo.youtubeVideoId));
          }
        }
      } catch (_) {}
    }

    window.addEventListener("message", handlePlayerMessage);
    return () => window.removeEventListener("message", handlePlayerMessage);
  }, [activeIndex, videos]);

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
          const isBlocked = blockedVideos.has(video.youtubeVideoId);
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
                    video.isDirectVideo && video.videoUrl ? (
                      <video
                        src={video.videoUrl}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "24px"
                        }}
                      />
                    ) : (
                      <iframe ref={playerRef} src={playerSrc} title={`${video.movieTitle} ${categoryLabel.toLowerCase()}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
                    )
                  ) : (
                    <div className="reel-player-poster" style={{ backgroundImage: `url("${video.thumbnail || ""}")` }} />
                  )}
                  {isActive && !isBlocked && !video.isDirectVideo && <div className="reel-player-shield" aria-hidden="true" />}
                  {isBlocked && !video.isDirectVideo && (
                    <div className="reel-player-blocked" style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(10, 15, 17, 0.94)",
                      backdropFilter: "blur(18px)",
                      padding: "24px",
                      textAlign: "center",
                      zIndex: 10,
                      gap: "14px",
                      borderRadius: "24px"
                    }}>
                      <div style={{
                        width: "54px",
                        height: "54px",
                        borderRadius: "50%",
                        background: "rgba(255, 85, 85, 0.16)",
                        border: "1px solid rgba(255, 85, 85, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ff6b6b"
                      }}>
                        <ShieldAlert size={28} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#fff" }}>
                        Region-Locked by Uploader
                      </h3>
                      <p style={{ margin: 0, fontSize: "12px", color: "rgba(255, 255, 255, 0.72)", maxWidth: "340px", lineHeight: 1.5 }}>
                        The YouTube upload for this specific clip is restricted in your country.
                      </p>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "4px" }}>
                        <button
                          type="button"
                          onClick={() => scrollToVideo(activeIndex + 1)}
                          style={{
                            padding: "9px 18px",
                            borderRadius: "999px",
                            background: "var(--movie-reels-accent, #baffec)",
                            color: "#051310",
                            border: "none",
                            fontWeight: "750",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          Skip to Next Reel
                        </button>
                        <a
                          href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "9px 16px",
                            borderRadius: "999px",
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "#fff",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            fontWeight: "600",
                            fontSize: "12px",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <ExternalLink size={13} /> Open on YouTube
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="reel-caption movie-reels-caption">
                <div className="reel-type"><span className="reel-live-dot" /> {categoryLabel} <span className="movie-reels-source">· {video.source || "KINOCHECK"}</span></div>
                <h1>{video.movieTitle}</h1>
                <p className="reel-meta"><span>{video.language.toUpperCase()}</span>{video.views ? <><span>•</span> {Number(video.views) ? Number(video.views).toLocaleString() + " views" : video.views}</> : null}</p>
                <p className="reel-description">{video.title}</p>
                <div className="movie-reels-actions">
                  {detailsHref && <button className="reel-details-button" type="button" onClick={() => navigate(detailsHref)}><Info size={16} /> Explore title</button>}
                  {video.sourceUrl && <a className="movie-reels-source-link" href={video.sourceUrl} target="_blank" rel="noreferrer">{video.source === "GIPHY" ? "GIPHY source" : "KinoCheck source"}</a>}
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
