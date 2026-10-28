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
  Languages,
  Captions,
  Volume2,
  X,
  Sliders,
  Check,
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
    id: "titan",
    name: "Server Titan",
    quality: "1080p Multi-Source",
    speed: "Auto-Failover",
    badge: "Multi-Host",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://autoembed.me/tv/tmdb/${tmdbId}-${season || 1}-${episode || 1}`
        : `https://autoembed.me/movie/tmdb/${tmdbId}`;
    },
  },
];

function CineStreamPlayer({
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
  const [showAudioSubModal, setShowAudioSubModal] = useState(false);
  const [audioSubTab, setAudioSubTab] = useState("subtitles"); // "subtitles" | "audio"

  const iframeRef = useRef(null);
  const screenBoxRef = useRef(null);
  const mediaRef = useRef(media);
  const onProgressRef = useRef(onProgress);

  mediaRef.current = media;
  onProgressRef.current = onProgress;

  const tmdbId = String(media?.tmdbId || media?.id || "");
  const isTv = Boolean(media?.mediaType === "tv" || media?.isTV);
  const propSeason = Number(media?.season || 1);
  const propEpisode = Number(media?.episode || 1);

  const [currSeason, setCurrSeason] = useState(propSeason);
  const [currEpisode, setCurrEpisode] = useState(propEpisode);

  useEffect(() => {
    setCurrSeason(propSeason);
  }, [propSeason]);

  useEffect(() => {
    setCurrEpisode(propEpisode);
  }, [propEpisode]);

  // Available seasons list
  const rawSeasons = (seasons?.length ? seasons : media?.seasons || media?.availableSeasons || [])
    .filter((s) => s.season_number >= 0);
  const seasonList = rawSeasons.length > 0
    ? rawSeasons
    : [{ season_number: currSeason, name: `Season ${currSeason}` }];

  // Fallback episodes if TMDB episode list is still fetching or empty
  const currentSeasonObj = seasonList.find((s) => s.season_number === currSeason);
  const epCount = currentSeasonObj?.episode_count || 10;
  const fallbackEpisodes = Array.from({ length: epCount }, (_, i) => ({
    episodeNumber: i + 1,
    name: `Episode ${i + 1}`,
  }));

  const episodeList = episodes?.length > 0 ? episodes : fallbackEpisodes;

  // Current episode title
  const currentEpData = episodeList.find((e) => e.episodeNumber === currEpisode);
  const currentEpTitle = currentEpData?.name || media?.episodeTitle || `Episode ${currEpisode}`;

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
        { season: currSeason, episode: currEpisode }
      );
      lastSavedAt = Date.now();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currSeason, currEpisode]);

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

  const handleSeasonSelect = (newSeason) => {
    setCurrSeason(newSeason);
    setCurrEpisode(1);
    setReloadKey((prev) => prev + 1);
    if (onSeasonChange) {
      onSeasonChange(newSeason);
    }
  };

  const handleEpisodeSelect = (newEpisode) => {
    setCurrEpisode(newEpisode);
    setReloadKey((prev) => prev + 1);
    if (onEpisodeChange) {
      onEpisodeChange(newEpisode);
    }
  };

  const handlePrevEpisode = () => {
    if (currEpisode <= 1) return;
    handleEpisodeSelect(currEpisode - 1);
  };

  const handleNextEpisode = () => {
    const maxEp = episodeList.length
      ? Math.max(...episodeList.map((e) => e.episodeNumber))
      : currEpisode + 1;
    if (currEpisode >= maxEp) return;
    handleEpisodeSelect(currEpisode + 1);
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
    currSeason,
    currEpisode,
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
                value={currSeason}
                onChange={(e) => handleSeasonSelect(Number(e.target.value))}
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
                value={currEpisode}
                onChange={(e) => handleEpisodeSelect(Number(e.target.value))}
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
              disabled={currEpisode <= 1}
              onClick={handlePrevEpisode}
              title="Previous Episode"
            >
              <ChevronLeft size={14} />
              <span>Prev Ep</span>
            </button>

            <button
              type="button"
              className="cine-tv-step-btn"
              disabled={episodeList.length ? currEpisode >= Math.max(...episodeList.map((e) => e.episodeNumber)) : false}
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
              <Layers size={12} /> S{currSeason} : E{currEpisode} · {currentEpTitle}
            </span>
          )}
        </div>

        <div className="cine-server-status-actions">
          <button
            type="button"
            className="cine-server-action-btn cine-audiosub-btn"
            onClick={() => {
              setAudioSubTab("subtitles");
              setShowAudioSubModal(true);
            }}
            title="Fix Subtitle Timing Offset & Change Audio Track Language"
          >
            <Languages size={13} />
            <span>Audio & Subtitles</span>
          </button>

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
          key={`${activeServer.id}-${reloadKey}-${tmdbId}-${isTv ? `${currSeason}-${currEpisode}` : "movie"}`}
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
        <div
          className="cine-hint-item cine-hint-clickable"
          onClick={() => {
            setAudioSubTab("subtitles");
            setShowAudioSubModal(true);
          }}
          title="Click to fix early/late subtitles or switch audio language"
        >
          <Languages size={14} className="accent-icon" />
          <span>Subtitles ahead of speech or need another Audio Track? <strong className="hint-strong">Click for Audio & Subtitle tools</strong></span>
        </div>

        <div className="cine-hint-item">
          <ShieldCheck size={14} className="green-text" />
          <span>Optimal 1080p / 4K Connection Active</span>
        </div>
        <div className="cine-hint-item">
          <Info size={14} />
          <span>Quality Tip: Use the gear/settings icon inside player to select 1080p, 720p, or Auto.</span>
        </div>
      </div>

      {/* AUDIO & SUBTITLES HELPER MODAL */}
      {showAudioSubModal && (
        <div
          className="cine-audiosub-modal-backdrop"
          onClick={() => setShowAudioSubModal(false)}
        >
          <div
            className="cine-audiosub-modal glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audiosub-modal-title"
          >
            <div className="cine-audiosub-header">
              <div className="cine-audiosub-title-row">
                <Languages size={18} className="audiosub-header-icon" />
                <h3 id="audiosub-modal-title">Audio & Subtitles Assistant</h3>
              </div>
              <button
                type="button"
                className="cine-audiosub-close-btn"
                onClick={() => setShowAudioSubModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="cine-audiosub-nav">
              <button
                type="button"
                className={`cine-audiosub-tab-btn ${audioSubTab === "subtitles" ? "active" : ""}`}
                onClick={() => setAudioSubTab("subtitles")}
              >
                <Captions size={15} />
                <span>Fix Subtitle Timing</span>
              </button>
              <button
                type="button"
                className={`cine-audiosub-tab-btn ${audioSubTab === "audio" ? "active" : ""}`}
                onClick={() => setAudioSubTab("audio")}
              >
                <Volume2 size={15} />
                <span>Change Audio Track</span>
              </button>
            </div>

            <div className="cine-audiosub-body">
              {audioSubTab === "subtitles" ? (
                <div className="cine-sub-panel">
                  <div className="cine-info-callout">
                    <strong>Why do subtitles appear before the words are said?</strong>
                    <p>
                      Movies are released in multiple editions (Theatrical cuts with long 15-second studio logos vs Digital Web cuts starting at 2 seconds). If a theatrical subtitle track is loaded on a Web rip, the text runs 5–10 seconds ahead of speech.
                    </p>
                  </div>

                  <div className="cine-steps-list">
                    <div className="cine-step-item">
                      <span className="step-num">1</span>
                      <div className="step-content">
                        <h4>Switch to Alternative Subtitle Track (Quickest)</h4>
                        <p>
                          Inside the video player's bottom control bar, click the <strong>CC (Subtitles)</strong> icon. Most movies include multiple English tracks: <strong>English (1)</strong>, <strong>English (2)</strong>, and <strong>English (SDH)</strong>. Switching to track 2 or 3 usually selects the perfectly synchronized track!
                        </p>
                      </div>
                    </div>

                    <div className="cine-step-item">
                      <span className="step-num">2</span>
                      <div className="step-content">
                        <h4>Adjust Subtitle Delay / Timing Offset</h4>
                        <p>
                          Inside the player controls, click the <strong>Gear (Settings)</strong> icon &rarr; look for <strong>Subtitle Offset / Timing</strong> &rarr; add <strong>+1.0s, +2.0s</strong> to delay the text so it matches the voices precisely.
                        </p>
                      </div>
                    </div>

                    <div className="cine-step-item">
                      <span className="step-num">3</span>
                      <div className="step-content">
                        <h4>Switch to an Auto-Synced Mirror Server</h4>
                        <p>
                          Different servers scrape independent subtitle databases (SubDL &amp; OpenSubtitles) with pre-calibrated timings. Click to switch instantly:
                        </p>
                        <div className="cine-quick-servers">
                          {STREAM_SERVERS.filter((s) => ["alpha", "nova", "pulse"].includes(s.id)).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className={`cine-quick-server-btn ${activeServer.id === s.id ? "current" : ""}`}
                              onClick={() => {
                                handleSelectServer(s);
                                setShowAudioSubModal(false);
                              }}
                            >
                              <div className="s-info">
                                <span className="s-name">{s.name}</span>
                                <span className="s-badge">{s.id === "alpha" ? "Auto-Calibrated (SubDL)" : s.id === "nova" ? "Direct Subtitle Stream" : "Cloud Mirror Sync"}</span>
                              </div>
                              {activeServer.id === s.id ? (
                                <span className="s-status active-status"><Check size={12} /> Active</span>
                              ) : (
                                <span className="s-status switch-status">Switch &rarr;</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cine-audio-panel">
                  <div className="cine-info-callout">
                    <strong>How to Change Audio Language &amp; Dubs:</strong>
                    <p>
                      When movies and web series have dual-audio or multi-language audio tracks available (e.g., English, Hindi, Spanish, French, Japanese, or Original Audio), you can switch tracks inside the player controls or choose our dedicated Multi-Audio servers.
                    </p>
                  </div>

                  <div className="cine-steps-list">
                    <div className="cine-step-item">
                      <span className="step-num">1</span>
                      <div className="step-content">
                        <h4>Select Audio Track in Player Controls</h4>
                        <p>
                          Inside the bottom control bar of the video player, click the <strong>Gear (Settings)</strong> icon or the <strong>Speaker / Audio Track</strong> icon &rarr; select <strong>Audio Track / Language</strong> &rarr; pick your desired audio feed.
                        </p>
                      </div>
                    </div>

                    <div className="cine-step-item">
                      <span className="step-num">2</span>
                      <div className="step-content">
                        <h4>Best Multi-Audio &amp; Dubbed Servers (Click to Switch)</h4>
                        <p>
                          These servers specifically index and stream multi-language master feeds with dual-audio and international dubs:
                        </p>
                        <div className="cine-quick-servers">
                          {STREAM_SERVERS.filter((s) => ["alpha", "titan", "nova"].includes(s.id)).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className={`cine-quick-server-btn ${activeServer.id === s.id ? "current" : ""}`}
                              onClick={() => {
                                handleSelectServer(s);
                                setShowAudioSubModal(false);
                              }}
                            >
                              <div className="s-info">
                                <span className="s-name">{s.name}</span>
                                <span className="s-badge">
                                  {s.id === "alpha"
                                    ? "4K / Multi-Language Audio"
                                    : s.id === "titan"
                                    ? "Auto-Failover Multi-Host"
                                    : "Direct Audio Master"}
                                </span>
                              </div>
                              {activeServer.id === s.id ? (
                                <span className="s-status active-status"><Check size={12} /> Active</span>
                              ) : (
                                <span className="s-status switch-status">Switch &rarr;</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CineStreamPlayer;
