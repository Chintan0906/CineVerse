import { useState, useEffect, useRef } from "react";
import {
  RotateCcw,
  Sparkles,
  Wifi,
  ChevronRight,
  ShieldCheck,
  Tv,
  Film,
  Info,
  Maximize2,
} from "lucide-react";

// Disguised high-performance streaming servers (Real provider names are completely hidden)
const STREAM_SERVERS = [
  {
    id: "alpha",
    name: "Server Alpha",
    quality: "1080p / 4K UHD",
    speed: "Ultra Fast",
    badge: "Clean Stream",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://player.videasy.to/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://player.videasy.to/movie/${tmdbId}`;
    },
  },
  {
    id: "nova",
    name: "Server Nova",
    quality: "1080p Full HD",
    speed: "High Speed",
    badge: "Direct 1080p",
    getUrl: (tmdbId, isTv, season, episode, currentTime) => {
      const path = isTv
        ? `/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `/movie/${tmdbId}`;
      const params = new URLSearchParams({
        autoplay: "true",
        primaryColor: "ffffff",
        secondaryColor: "202020",
        iconColor: "ffffff",
        icons: "vid",
      });
      if (currentTime > 15) {
        params.set("startAt", String(Math.floor(currentTime)));
      }
      return `https://vidlink.pro${path}?${params.toString()}`;
    },
  },
  {
    id: "eclipse",
    name: "Server Eclipse",
    quality: "1080p FHD",
    speed: "Fast CDN",
    badge: "Fast Mirror",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://vidfast.vc/movie/${tmdbId}`;
    },
  },
  {
    id: "apex",
    name: "Server Apex",
    quality: "1080p HD",
    speed: "Stable Feed",
    badge: "Multi-Source",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidsrc.pm/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`
        : `https://vidsrc.pm/embed/movie?tmdb=${tmdbId}`;
    },
  },
  {
    id: "pulse",
    name: "Server Pulse",
    quality: "1080p Mirror",
    speed: "Buffer-Free",
    badge: "Cloud Feed",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidsrc.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://vidsrc.su/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "zenith",
    name: "Server Zenith",
    quality: "HD Stream",
    speed: "Express Mirror",
    badge: "Backup Mirror",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    },
  },
];

function VidLinkPlayer({ media, onProgress }) {
  const [activeServer, setActiveServer] = useState(STREAM_SERVERS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [isChanging, setIsChanging] = useState(false);

  const iframeRef = useRef(null);
  const screenBoxRef = useRef(null);
  const mediaRef = useRef(media);
  const onProgressRef = useRef(onProgress);

  mediaRef.current = media;
  onProgressRef.current = onProgress;

  const tmdbId = String(media?.tmdbId || media?.id || "");
  const isTv = Boolean(media?.mediaType === "tv" || media?.isTV);
  const season = media?.season || 1;
  const episode = media?.episode || 1;

  // Listen for playback events (VidLink telemetry)
  useEffect(() => {
    let lastSavedAt = 0;
    const handleMessage = (event) => {
      if (
        event.origin !== "https://vidlink.pro" ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }

      const playerEvent = event.data?.type === "PLAYER_EVENT" ? event.data.data : null;
      if (playerEvent?.event !== "timeupdate") return;
      if (Date.now() - lastSavedAt < 15000) return;

      const currentMedia = mediaRef.current;
      onProgressRef.current?.(
        currentMedia,
        playerEvent.currentTime,
        playerEvent.duration,
        { season: currentMedia.season, episode: currentMedia.episode }
      );
      lastSavedAt = Date.now();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSelectServer = (server) => {
    if (server.id === activeServer.id) return;
    setIsChanging(true);
    setActiveServer(server);
    setReloadKey((prev) => prev + 1);
    setTimeout(() => setIsChanging(false), 300);
  };

  const handleReload = () => {
    setIsChanging(true);
    setReloadKey((prev) => prev + 1);
    setTimeout(() => setIsChanging(false), 300);
  };

  const handleNextServer = () => {
    const currentIndex = STREAM_SERVERS.findIndex((s) => s.id === activeServer.id);
    const nextServer = STREAM_SERVERS[(currentIndex + 1) % STREAM_SERVERS.length];
    handleSelectServer(nextServer);
  };

  const handleFullscreen = () => {
    const el = screenBoxRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  };

  if (!tmdbId || !/^\d+$/.test(tmdbId)) {
    return (
      <div className="cine-stream-empty">
        <Film size={36} />
        <p>This title does not have a valid TMDB ID for playback.</p>
      </div>
    );
  }

  const embedUrl = activeServer.getUrl(
    tmdbId,
    isTv,
    season,
    episode,
    media?.currentTime || 0
  );

  return (
    <div className="cine-stream-container">
      {/* SERVER SELECTION BAR */}
      <div className="cine-server-bar-wrapper">
        <div className="cine-server-label">
          <Wifi size={14} className="server-icon-pulse" />
          <span>Select Streaming Server:</span>
        </div>

        <div className="cine-server-pills-scroll" role="tablist">
          {STREAM_SERVERS.map((server) => {
            const isActive = server.id === activeServer.id;
            return (
              <button
                key={server.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectServer(server)}
                className={`cine-server-pill ${isActive ? "active" : ""}`}
                title={`Switch to ${server.name} (${server.quality})`}
              >
                <span className="server-dot" />
                <span className="server-name">{server.name}</span>
                <span className="server-badge">{server.quality}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE STATUS BANNER */}
      <div className="cine-server-status-bar">
        <div className="cine-server-status-left">
          <span className="cine-status-dot-live" />
          <span className="cine-status-text">
            Streaming via <strong>{activeServer.name}</strong>
          </span>
          <span className="cine-status-chip">{activeServer.quality}</span>
          <span className="cine-status-chip speed-chip">{activeServer.speed}</span>
          {isTv && (
            <span className="cine-status-chip tv-chip">
              <Tv size={12} /> S{season}:E{episode}
            </span>
          )}
        </div>

        <div className="cine-server-status-actions">
          <button
            type="button"
            className="cine-server-action-btn"
            onClick={handleFullscreen}
            title="Full Screen Theater Mode"
          >
            <Maximize2 size={13} />
            <span>Fullscreen</span>
          </button>

          <button
            type="button"
            className="cine-server-action-btn"
            onClick={handleReload}
            title="Reload video stream"
          >
            <RotateCcw size={13} className={isChanging ? "spin-icon" : ""} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            className="cine-server-action-btn"
            onClick={handleNextServer}
            title="Switch to next server"
          >
            <span>Next Server</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 16:9 STREAM SCREEN FRAME (AUTOMATICALLY CONSTRAINED TO VIEWPORT HEIGHT) */}
      <div ref={screenBoxRef} className={`cine-screen-box ${isChanging ? "switching" : ""}`}>
        <iframe
          key={`${activeServer.id}-${reloadKey}-${tmdbId}-${isTv ? `${season}-${episode}` : "movie"}`}
          ref={iframeRef}
          className="cine-stream-iframe"
          src={embedUrl}
          title={`Cinema Stream - ${activeServer.name} (${media?.title || "Movie"})`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
        />
      </div>

      {/* STREAM FOOTER HINT & RESOLUTION TIP */}
      <div className="cine-stream-hint-bar">
        <div className="cine-hint-item">
          <ShieldCheck size={14} className="green-text" />
          <span>Optimal 1080p / 4K Connection Active</span>
        </div>
        <div className="cine-hint-item">
          <Info size={14} />
          <span>Quality Tip: Use the gear/settings icon inside player to select 1080p, 720p, or Auto.</span>
        </div>
        <div className="cine-hint-item">
          <Sparkles size={14} />
          <span>Buffering? Select another server above for instant alternate streaming.</span>
        </div>
      </div>
    </div>
  );
}

export default VidLinkPlayer;
