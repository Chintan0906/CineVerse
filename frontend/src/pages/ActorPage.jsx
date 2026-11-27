import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Film, MapPin, Sparkles, Tv, User, Volume2, VolumeX } from "lucide-react";

import MovieCard from "../components/movie/MovieCard";
import Footer from "../components/layout/Footer";
import {
  DEFAULT_AVATAR,
  getActorById,
  getCachedActorById,
  getActorSpotlightVideo,
} from "../services/movieService";
import { useLibrary } from "../hooks/useLibrary";
import { useToast } from "../context/ToastContext";

function calculateAge(birthday, deathday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function ActorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pageRef = useRef(null);

  const { watchlist, toggleWatchlist } = useLibrary();
  const { showToast } = useToast();

  const preloaded = location.state?.actor || null;
  const initialCached = getCachedActorById(id);
  const [actor, setActor] = useState(() => {
    if (initialCached) return initialCached;
    if (preloaded) {
      return {
        id: preloaded.id || id,
        name: preloaded.name || "",
        profile: preloaded.profile || DEFAULT_AVATAR,
        knownForDepartment: preloaded.department || "Acting",
        biography: "",
        credits: [],
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !initialCached);
  const [creditFilter, setCreditFilter] = useState("all");
  const [bioExpanded, setBioExpanded] = useState(false);

  // Background acting moment video (YouTube clip/trailer)
  const [spotlightVideo, setSpotlightVideo] = useState(null);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const isVideoMutedRef = useRef(true);
  const isVideoVisibleRef = useRef(false);
  const isVideoLoopingRef = useRef(false);
  const videoMountTimerRef = useRef(null);
  const videoRevealTimerRef = useRef(null);
  const videoIframeRef = useRef(null);

  useEffect(() => {
    let active = true;
    window.scrollTo({ top: 0, behavior: "instant" });
    setBioExpanded(false);
    setCreditFilter("all");

    const cached = getCachedActorById(id);
    if (cached) {
      setActor(cached);
      setLoading(false);
      document.title = `${cached.name} | CineVerse`;
      return () => {
        active = false;
        document.title = "CineVerse | Beyond Entertainment";
      };
    }

    setLoading(true);
    getActorById(id)
      .then((data) => {
        if (!active) return;
        if (data) {
          setActor(data);
          document.title = `${data.name} | CineVerse`;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      document.title = "CineVerse | Beyond Entertainment";
    };
  }, [id]);

  // Fetch & play actor's iconic acting moment clip/trailer in the background
  useEffect(() => {
    let active = true;
    setSpotlightVideo(null);
    setIsVideoMounted(false);
    setIsVideoVisible(false);
    isVideoVisibleRef.current = false;
    isVideoLoopingRef.current = false;
    setIsVideoMuted(true);
    isVideoMutedRef.current = true;
    if (videoMountTimerRef.current) clearTimeout(videoMountTimerRef.current);
    if (videoRevealTimerRef.current) clearTimeout(videoRevealTimerRef.current);

    if (!actor?.id || !Array.isArray(actor?.credits) || actor.credits.length === 0) {
      return () => { active = false; };
    }

    getActorSpotlightVideo(actor).then((vid) => {
      if (!active || !vid?.key) return;
      setSpotlightVideo(vid);
      videoMountTimerRef.current = setTimeout(() => {
        if (active) setIsVideoMounted(true);
      }, 650);
    });

    return () => {
      active = false;
      if (videoMountTimerRef.current) clearTimeout(videoMountTimerRef.current);
      if (videoRevealTimerRef.current) clearTimeout(videoRevealTimerRef.current);
    };
  }, [actor?.id, actor?.credits?.length]);

  const sendYouTubeCommand = (func, args = []) => {
    try {
      if (videoIframeRef.current?.contentWindow) {
        videoIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      }
    } catch (_) {}
  };

  useEffect(() => {
    const handleMessage = (e) => {
      try {
        if (e.source !== videoIframeRef.current?.contentWindow) return;
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const stateCode =
          data?.event === "onStateChange"
            ? Number(data?.info)
            : data?.info?.playerState !== undefined
            ? Number(data?.info?.playerState)
            : null;

        if (stateCode === 1) {
          if (!isVideoMutedRef.current) {
            sendYouTubeCommand("unMute");
            sendYouTubeCommand("setVolume", [100]);
          }
          if (!videoRevealTimerRef.current && !isVideoVisibleRef.current) {
            const delay = isVideoLoopingRef.current ? 1800 : 3200;
            videoRevealTimerRef.current = setTimeout(() => {
              videoRevealTimerRef.current = null;
              isVideoLoopingRef.current = false;
              isVideoVisibleRef.current = true;
              setIsVideoVisible(true);
            }, delay);
          }
        }

        if (stateCode === 2) {
          if (videoRevealTimerRef.current) {
            clearTimeout(videoRevealTimerRef.current);
            videoRevealTimerRef.current = null;
          }
          isVideoLoopingRef.current = true;
          isVideoVisibleRef.current = false;
          setIsVideoVisible(false);
        }

        if (stateCode === 0) {
          if (videoRevealTimerRef.current) {
            clearTimeout(videoRevealTimerRef.current);
            videoRevealTimerRef.current = null;
          }
          isVideoLoopingRef.current = true;
          isVideoVisibleRef.current = false;
          setIsVideoVisible(false);
          sendYouTubeCommand("seekTo", [0, true]);
          sendYouTubeCommand("playVideo");
        }
      } catch (_) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleToggleMomentVoice = () => {
    if (!spotlightVideo?.key) return;
    const nextMuted = !isVideoMutedRef.current;
    isVideoMutedRef.current = nextMuted;
    setIsVideoMuted(nextMuted);

    if (!nextMuted) {
      if (videoMountTimerRef.current) clearTimeout(videoMountTimerRef.current);
      setIsVideoMounted(true);
      sendYouTubeCommand("unMute");
      sendYouTubeCommand("setVolume", [100]);
      sendYouTubeCommand("playVideo");
    } else {
      sendYouTubeCommand("mute");
    }
  };

  // Progressive scroll blur for actor backdrop
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return undefined;

    let rafId = 0;
    const updateScrollVars = () => {
      rafId = 0;
      const y = window.scrollY || 0;
      const vh = window.innerHeight || 900;
      const progress = Math.min(Math.max(y / (vh * 0.55), 0), 1);

      el.style.setProperty("--scroll-blur", `${(progress * 24).toFixed(2)}px`);
      el.style.setProperty("--scroll-brightness", `${(1 - progress * 0.52).toFixed(3)}`);
      el.style.setProperty("--scroll-scale", `${(1 + progress * 0.06).toFixed(4)}`);
      el.style.setProperty("--scroll-veil", `${(0.35 + progress * 0.55).toFixed(3)}`);
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateScrollVars);
    };

    updateScrollVars();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [actor?.id]);

  const handleGoBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/");
    }
  };

  const credits = actor?.credits || [];
  const movieCount = useMemo(
    () => credits.filter((c) => !(c.mediaType === "tv" || c.isTV)).length,
    [credits]
  );
  const tvCount = useMemo(
    () => credits.filter((c) => Boolean(c.mediaType === "tv" || c.isTV)).length,
    [credits]
  );

  const filteredCredits = useMemo(() => {
    if (creditFilter === "movie") {
      return credits.filter((c) => !(c.mediaType === "tv" || c.isTV));
    }
    if (creditFilter === "tv") {
      return credits.filter((c) => Boolean(c.mediaType === "tv" || c.isTV));
    }
    return credits;
  }, [credits, creditFilter]);

  const handleSelectMovie = (movie) => {
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    navigate(`/movie/${movie.id}${isTv ? "?type=tv" : ""}`, {
      state: {
        movie,
        mediaType: isTv ? "tv" : "movie",
        isTV: isTv,
        from: `/actor/${id}`,
      },
    });
  };

  const handlePlayMovie = (movie) => {
    const isTv = Boolean(movie.mediaType === "tv" || movie.isTV);
    navigate(
      `/movie/${movie.id}?play=true${isTv ? "&type=tv&season=1&episode=1" : ""}`,
      {
        state: {
          movie,
          mediaType: isTv ? "tv" : "movie",
          isTV: isTv,
          from: `/actor/${id}`,
        },
      }
    );
  };

  const handleToggleWatchlist = (movie) => {
    const alreadySaved = watchlist.some((s) => String(s.id || s.tmdbId) === String(movie.id));
    toggleWatchlist(movie);
    showToast(
      alreadySaved ? `Removed "${movie.title}" from My List` : `Added "${movie.title}" to My List`,
      { type: alreadySaved ? "info" : "success", onUndo: () => toggleWatchlist(movie) }
    );
  };

  const age = calculateAge(actor?.birthday, actor?.deathday);
  const bioText = actor?.biography?.trim() || "";
  const isLongBio = bioText.length > 380;
  const displayedBio = bioExpanded || !isLongBio ? bioText : `${bioText.slice(0, 380).trim()}...`;

  return (
    <div className="actor-page movie-details-page" ref={pageRef}>
      {/* Fixed Backdrop Canvas */}
      <div className="details-fixed-backdrop" aria-hidden="true">
        <div
          className={`details-hero-bg ${isVideoVisible && spotlightVideo?.key ? "has-trailer" : ""}`}
          style={{
            backgroundImage: actor?.backdrop
              ? `url("${actor.backdrop}")`
              : actor?.profile && actor.profile !== DEFAULT_AVATAR
              ? `url("${actor.profile}")`
              : "none",
          }}
        />
        {isVideoMounted && spotlightVideo?.key && (
          <div className={`details-hero-trailer-wrap ${isVideoVisible ? "visible" : ""}`}>
            <iframe
              ref={videoIframeRef}
              className="details-hero-trailer-iframe"
              src={`https://www.youtube.com/embed/${spotlightVideo.key}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&iv_load_policy=3&origin=${encodeURIComponent(window.location.origin)}`}
              title={`${actor?.name || "Actor"} Acting Moment`}
              allow="autoplay; encrypted-media; picture-in-picture"
              tabIndex="-1"
              onLoad={(e) => {
                try {
                  e.target?.contentWindow?.postMessage(
                    JSON.stringify({ event: "listening", id: "actor-moment" }),
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
                if (!isVideoMutedRef.current) {
                  sendYouTubeCommand("unMute");
                  sendYouTubeCommand("setVolume", [100]);
                }
              }}
            />
            <div className="details-hero-trailer-shield" />
          </div>
        )}
        <div className="details-hero-gradient-left" />
        <div className="details-hero-gradient-bottom" />
        <div className="details-hero-vignette" />
        <div className="details-scroll-veil" />
      </div>

      {/* Top Back Button */}
      <header className="details-header">
        <button
          type="button"
          className="btn-secondary back-btn details-home-back-btn"
          onClick={handleGoBack}
          aria-label="Go back"
          title="Go back"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="actor-page-main">
        {/* ACTOR HERO HEADER */}
        <section className="actor-hero-section">
          <div className="actor-portrait-frame glass-card">
            <img
              src={actor?.profile || DEFAULT_AVATAR}
              alt={actor?.name || "Actor"}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
          </div>

          <div className="actor-hero-info">
            <div className="badge-row">
              <span className="section-eyebrow">
                <Sparkles size={13} />
                {actor?.knownForDepartment ? `${actor.knownForDepartment.toUpperCase()} PROFILE` : "ACTOR PROFILE"}
              </span>
              {spotlightVideo?.key && (
                <button
                  type="button"
                  className={`btn-secondary trailer-voice-btn ${!isVideoMuted ? "voice-active" : ""}`}
                  onClick={handleToggleMomentVoice}
                  title={isVideoMuted ? "Unmute acting moment" : "Mute acting moment"}
                  style={{ marginLeft: "auto" }}
                >
                  {isVideoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span>
                    {isVideoMuted ? "Voice Off" : "Voice On"}
                    {spotlightVideo.title ? ` · ${spotlightVideo.title}` : ""}
                  </span>
                </button>
              )}
            </div>

            <h1 className="details-title actor-page-title">
              {actor?.name || (loading ? "Loading..." : "Actor Not Found")}
            </h1>

            <div className="details-meta-bar">
              {actor?.knownForDepartment && (
                <span className="meta-item">
                  <User size={14} />
                  {actor.knownForDepartment}
                </span>
              )}
              {actor?.birthday && (
                <span className="meta-item">
                  <Calendar size={14} />
                  {actor.birthday}
                  {age !== null && ` (${actor.deathday ? `Died age ${age}` : `Age ${age}`})`}
                </span>
              )}
              {actor?.placeOfBirth && (
                <span className="meta-item">
                  <MapPin size={14} />
                  {actor.placeOfBirth}
                </span>
              )}
            </div>

            {bioText ? (
              <div className="actor-bio-block">
                <p className="actor-bio-text">{displayedBio}</p>
                {isLongBio && (
                  <button
                    type="button"
                    className="btn-secondary actor-bio-toggle"
                    onClick={() => setBioExpanded((prev) => !prev)}
                  >
                    {bioExpanded ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            ) : !loading ? (
              <p className="actor-bio-text muted">
                No biography is available for {actor?.name || "this actor"} yet. Explore their filmography below.
              </p>
            ) : null}
          </div>
        </section>

        {/* FILMOGRAPHY SECTION */}
        <section className="actor-credits-section">
          <div className="actor-credits-header">
            <div className="tv-episodes-heading-left">
              <h2 className="section-title">Movies &amp; TV Shows</h2>
              <span className="episodes-count-tag">
                {loading && credits.length === 0
                  ? "Loading filmography..."
                  : `${filteredCredits.length} ${filteredCredits.length === 1 ? "Title" : "Titles"}`}
              </span>
            </div>

            {credits.length > 0 && (
              <div className="actor-credit-filters" role="tablist" aria-label="Filter credits">
                <button
                  type="button"
                  role="tab"
                  aria-selected={creditFilter === "all"}
                  className={`cv-ep-range-pill ${creditFilter === "all" ? "active" : ""}`}
                  onClick={() => setCreditFilter("all")}
                >
                  All ({credits.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={creditFilter === "movie"}
                  className={`cv-ep-range-pill ${creditFilter === "movie" ? "active" : ""}`}
                  onClick={() => setCreditFilter("movie")}
                >
                  <Film size={12} /> Movies ({movieCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={creditFilter === "tv"}
                  className={`cv-ep-range-pill ${creditFilter === "tv" ? "active" : ""}`}
                  onClick={() => setCreditFilter("tv")}
                >
                  <Tv size={12} /> TV Shows ({tvCount})
                </button>
              </div>
            )}
          </div>

          {loading && credits.length === 0 ? (
            <div className="actor-credits-grid">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={`actor-skel-${idx}`} className="cv-skeleton-card skeleton-shimmer" />
              ))}
            </div>
          ) : filteredCredits.length > 0 ? (
            <div className="actor-credits-grid">
              {filteredCredits.map((item) => (
                <MovieCard
                  key={`${item.mediaType || "m"}-${item.id}`}
                  movie={item}
                  onSelect={handleSelectMovie}
                  onPlay={handlePlayMovie}
                  isSaved={watchlist.some((s) => String(s.id || s.tmdbId) === String(item.id))}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              ))}
            </div>
          ) : (
            <p className="actor-bio-text muted">No titles found in this category.</p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default ActorPage;
