import { useState, useEffect, useRef } from "react";
import {
  RotateCcw,
  Sparkles,
  Wifi,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Tv,
  Film,
  Info,
  Maximize2,
  Layers,
} from "lucide-react";

// Disguised high-performance streaming servers (Real provider names are completely hidden)
const STREAM_SERVERS = [
  {
    id: "eclipse",
    name: "Server Eclipse",
    quality: "1080p Full HD",
    speed: "Ultra Fast CDN",
    badge: "Recommended",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://vidfast.vc/movie/${tmdbId}`;
    },
  },
  {
    id: "alpha",
    name: "Server Alpha",
    quality: "1080p / 4K UHD",
    speed: "High Speed",
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
    speed: "Direct Feed",
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

function VidLinkPlayer({
  media,
  onProgress,
  seasons = [],
  episodes = [],
  onSeasonChange,
  onEpisodeChange,
}) {
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
  const season = Number(media?.season || 1);
  const episode = Number(media?.episode || 1);

  // Available seasons list
  const seasonList = seasons?.length
    ? seasons
    : media?.availableSeasons?.length
    ? media.availableSeasons
    : [{ season_number: season, name: `Season ${season}` }];

  // Available episodes list
  const episodeList = episodes?.length
    ? episodes
    : media?.episodes?.length
    ? media.episodes
    : [{ episodeNumber: episode, name: `Episode ${episode}` }];

  // Current episode title
  const currentEpData = episodeList.find((e) => e.episodeNumber === episode);
  const currentEpTitle = currentEpData?.name || media?.episodeTitle || `Episode ${episode}`;

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

  const handlePrevEpisode = () => {
    if (episode <= 1) return;
    if (onEpisodeChange) {
      onEpisodeChange(episode - 1);
    }
  };

  const handleNextEpisode = () => {
    const maxEp = episodeList.length ? Math.max(...episodeList.map((e) => e.episodeNumber)) : episode + 1;
    if (episode >= maxEp) return;
    if (onEpisodeChange) {
      onEpisodeChange(episode + 1);
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

      {/* WEBSERIES EPISODE & SEASON SWITCHER BAR */}
      {isTv && (
        <div className="cine-tv-control-bar">
          <div className="cine-tv-control-left">
            <span className="cine-tv-indicator">
              <Tv size={14} />
              <span>Series Navigation:</span>
            </span>

            {/* Season Selector */}
            <div className="cine-tv-select-wrap">
              <label htmlFor="player-season-select" className="sr-only">Season</label>
              <select
                id="player-season-select"
                className="cine-tv-select"
                value={season}
                onChange={(e) => onSeasonChange && onSeasonChange(Number(e.target.value))}
              >
                {seasonList.map((s) => (
                  <option key={s.id || s.season_number} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Episode Selector */}
            <div className="cine-tv-select-wrap">
              <label htmlFor="player-episode-select" className="sr-only">Episode</label>
              <select
                id="player-episode-select"
                className="cine-tv-select episode-select"
                value={episode}
                onChange={(e) => onEpisodeChange && onEpisodeChange(Number(e.target.value))}
              >
                {episodeList.map((ep) => (
                  <option key={ep.id || ep.episodeNumber} value={ep.episodeNumber}>
                    {String(ep.episodeNumber).padStart(2, "0")} · {ep.name || `Episode ${ep.episodeNumber}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cine-tv-control-right">
            <button
              type="button"
              className="cine-tv-step-btn"
              disabled={episode <= 1}
              onClick={handlePrevEpisode}
              title="Previous Episode"
            >
              <ChevronLeft size={14} />
              <span>Prev Ep</span>
            </button>

            <button
              type="button"
              className="cine-tv-step-btn"
              disabled={episodeList.length ? episode >= Math.max(...episodeList.map((e) => e.episodeNumber)) : false}
              onClick={handleNextEpisode}
              title="Next Episode"
            >
              <span>Next Ep</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

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
              <Layers size={12} /> S{season} : E{episode} · {currentEpTitle}
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
