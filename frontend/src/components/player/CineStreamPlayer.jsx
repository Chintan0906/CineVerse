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
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";

// Robust SRT & WebVTT Subtitle Parser
function parseSubtitles(content) {
  if (!content) return [];
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.trim().split(/\n\n+/);
  const cues = [];

  const parseTime = (tStr) => {
    if (!tStr) return 0;
    const cleanStr = tStr.trim().replace(",", ".").split(" ")[0];
    const parts = cleanStr.split(":");
    if (parts.length === 3) {
      return (
        parseFloat(parts[0]) * 3600 +
        parseFloat(parts[1]) * 60 +
        parseFloat(parts[2])
      );
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
  };

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (
      lines[0].startsWith("WEBVTT") ||
      lines[0].startsWith("NOTE") ||
      lines[0].startsWith("STYLE")
    ) {
      continue;
    }

    let timeLineIndex = 0;
    if (!lines[0].includes("-->") && lines.length > 1) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes("-->")) continue;

    const [startStr, endStr] = timeLine.split("-->");
    const textLines = lines.slice(timeLineIndex + 1);

    const start = parseTime(startStr);
    const end = parseTime(endStr);
    const text = textLines.join("\n").replace(/<[^>]*>/g, ""); // Strip HTML/formatting

    if (!isNaN(start) && !isNaN(end) && text) {
      cues.push({ start, end, text });
    }
  }
  return cues;
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Disguised high-performance streaming servers (Server Eclipse is primary default)
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
    id: "ronin",
    name: "Server Ronin",
    quality: "1080p Anime / Sub & Dub",
    speed: "Ultra High-Speed",
    badge: "Anime God Tier",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://nontongo.win/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://nontongo.win/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "alpha",
    name: "Server Alpha",
    quality: "1080p / 4K UHD",
    speed: "High Speed CDN",
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
    badge: "Auto Subtitles",
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
        ds_lang: "en",
      });
      if (currentTime > 15) {
        params.set("startAt", String(Math.floor(currentTime)));
      }
      return `https://vidlink.pro${path}?${params.toString()}`;
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
        ? `https://vidsrc.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?ds_lang=en`
        : `https://vidsrc.su/embed/movie/${tmdbId}?ds_lang=en`;
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
        ? `https://vidsrc.pm/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}&ds_lang=en`
        : `https://vidsrc.pm/embed/movie?tmdb=${tmdbId}&ds_lang=en`;
    },
  },
  {
    id: "legacy",
    name: "Server Legacy",
    quality: "1080p Classic",
    speed: "Multi-Mirror Network",
    badge: "Deep Catalog",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    },
  },
];

// Internal mirror servers available within Server Legacy (2Embed Network)
const LEGACY_SUB_SERVERS = [
  {
    id: "hub",
    name: "Legacy Hub",
    badge: "Auto Player",
    quality: "1080p Dynamic",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    },
  },
  {
    id: "vsrc",
    name: "Mirror Vsrc",
    badge: "Fast HD",
    quality: "1080p Direct",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidsrc.buzz/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://vidsrc.buzz/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "videm",
    name: "Mirror Videm",
    badge: "Direct Stream",
    quality: "1080p Stable",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://videm.xyz/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://videm.xyz/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "vcr",
    name: "Mirror Vcr",
    badge: "Cloud Stream",
    quality: "1080p Cloud",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://streamsrcs.2embed.cc/vcr-tv?tmdb=${tmdbId}&s=${season || 1}&e=${episode || 1}`
        : `https://streamsrcs.2embed.cc/vcr?tmdb=${tmdbId}`;
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
  const [legacySubServer, setLegacySubServer] = useState(LEGACY_SUB_SERVERS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [showAudioSubModal, setShowAudioSubModal] = useState(false);
  const [audioSubTab, setAudioSubTab] = useState("customSub"); // "customSub" | "subtitles" | "audio"

  // Universal Custom Subtitle Engine State
  const [customCues, setCustomCues] = useState([]);
  const [customSubName, setCustomSubName] = useState("");
  const [subOffset, setSubOffset] = useState(0.0); // seconds offset
  const [subEnabled, setSubEnabled] = useState(true);
  const [subSize, setSubSize] = useState("normal"); // "normal" | "large" | "xlarge"
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [subPlaying, setSubPlaying] = useState(true);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const iframeRef = useRef(null);
  const screenBoxRef = useRef(null);
  const fileInputRef = useRef(null);
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

  // Handle custom subtitle file parsing
  const handleSubtitleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        const parsed = parseSubtitles(text);
        if (parsed.length > 0) {
          setCustomCues(parsed);
          setCustomSubName(file.name);
          setSubEnabled(true);
          setAudioSubTab("customSub");
          setShowAudioSubModal(true);
        } else {
          alert("Could not parse subtitle file. Please provide a standard .srt or .vtt file.");
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearSubtitles = () => {
    setCustomCues([]);
    setCustomSubName("");
    setSubOffset(0.0);
  };

  const handleOffsetChange = (delta) => {
    setSubOffset((prev) => parseFloat((prev + delta).toFixed(2)));
  };

  // Global window drag-and-drop listener so dropping files over the iframe works 100% of the time
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        dragCounter++;
        setIsDraggingFile(true);
      }
    };

    const handleDragLeave = (e) => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDraggingFile(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingFile(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleSubtitleFile(e.dataTransfer.files[0]);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Listen for playback events (VidLink telemetry and real-time video seconds)
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
      if (!playerEvent) return;

      if (playerEvent.event === "timeupdate" && typeof playerEvent.currentTime === "number") {
        setCurrentPlayTime(playerEvent.currentTime);
        setSubPlaying(true);
        if (Date.now() - lastSavedAt >= 15000) {
          const currentMedia = mediaRef.current;
          onProgressRef.current?.(
            currentMedia,
            playerEvent.currentTime,
            playerEvent.duration,
            { season: currSeason, episode: currEpisode }
          );
          lastSavedAt = Date.now();
        }
      } else if (playerEvent.event === "pause") {
        setSubPlaying(false);
      } else if (playerEvent.event === "play") {
        setSubPlaying(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currSeason, currEpisode]);

  // Fallback timer for custom subtitles on servers without postMessage
  useEffect(() => {
    if (!customCues.length || !subPlaying || activeServer.id === "nova") return undefined;
    const timer = setInterval(() => {
      setCurrentPlayTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [customCues.length, subPlaying, activeServer.id]);

  // Compute active subtitle line
  const effectiveTime = currentPlayTime + subOffset;
  const activeCue = customCues.find(
    (cue) => effectiveTime >= cue.start && effectiveTime <= cue.end
  );
  const activeSubtitleText = activeCue ? activeCue.text : "";

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

  const embedUrl = activeServer.id === "legacy"
    ? legacySubServer.getUrl(tmdbId, isTv, currSeason, currEpisode)
    : activeServer.getUrl(
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

      {/* LEGACY SUB-SERVER SWITCHER BAR */}
      {activeServer.id === "legacy" && (
        <div className="cine-subserver-bar-wrapper">
          <div className="cine-subserver-label">
            <Layers size={13} className="subserver-icon" />
            <span>Legacy Server Mirrors:</span>
          </div>
          <div className="cine-subserver-pills" role="tablist">
            {LEGACY_SUB_SERVERS.map((sub) => {
              const isSubActive = legacySubServer.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => {
                    setLegacySubServer(sub);
                    setReloadKey((prev) => prev + 1);
                  }}
                  className={`cine-subserver-pill ${isSubActive ? "active" : ""}`}
                  title={`Switch to ${sub.name} (${sub.quality})`}
                >
                  <span className="subserver-dot" />
                  <span className="subserver-name">{sub.name}</span>
                  <span className="subserver-badge">{sub.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
            {activeServer.id === "legacy" && (
              <span className="cine-status-subname"> &bull; {legacySubServer.name}</span>
            )}
          </span>
          <span className="cine-status-chip">
            {activeServer.id === "legacy" ? legacySubServer.quality : activeServer.quality}
          </span>
          <span className="cine-status-chip speed-chip">
            {activeServer.id === "legacy" ? legacySubServer.badge : activeServer.speed}
          </span>
          {isTv && (
            <span className="cine-status-chip tv-chip">
              <Layers size={12} /> S{currSeason} : E{currEpisode} · {currentEpTitle}
            </span>
          )}
        </div>

        <div className="cine-server-status-actions">
          <button
            type="button"
            className={`cine-server-action-btn ${customCues.length > 0 ? "active-sub" : ""}`}
            onClick={() => {
              setAudioSubTab("customSub");
              setShowAudioSubModal(true);
            }}
            title="Load Custom Subtitles (.srt / .vtt) or Adjust Timing"
          >
            <Captions size={13} />
            <span>{customCues.length > 0 ? "Subtitles: Active" : "Add Subtitles"}</span>
          </button>

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

      {/* 16:9 STREAM SCREEN FRAME (WITH DRAG & DROP & SUBTITLES OVERLAY) */}
      <div
        ref={screenBoxRef}
        className={`cine-screen-box ${isChanging ? "switching" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDraggingFile(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer?.files?.[0]) {
            handleSubtitleFile(e.dataTransfer.files[0]);
          }
        }}
      >
        {/* FLOATING QUICK-SUBTITLE ACTION PILL */}
        <div className="cine-floating-sub-controls">
          <button
            type="button"
            className={`cine-floating-sub-btn ${customCues.length > 0 ? "has-sub" : ""}`}
            onClick={() => {
              if (customCues.length > 0) {
                setAudioSubTab("customSub");
                setShowAudioSubModal(true);
              } else {
                fileInputRef.current?.click();
              }
            }}
            title={customCues.length > 0 ? "Adjust Custom Subtitles & Timing" : "Upload your downloaded .srt or .vtt subtitle file"}
          >
            <Captions size={14} />
            <span>{customCues.length > 0 ? "Subtitles: Active" : "Upload .SRT Subtitle"}</span>
          </button>
          {customCues.length > 0 && (
            <button
              type="button"
              className="cine-floating-sub-btn sub-settings-btn"
              onClick={() => {
                setAudioSubTab("customSub");
                setShowAudioSubModal(true);
              }}
              title="Subtitle Timing Offset & Settings"
            >
              <Sliders size={13} />
              <span>{subOffset >= 0 ? `+${subOffset.toFixed(1)}s` : `${subOffset.toFixed(1)}s`}</span>
            </button>
          )}
        </div>

        {/* DRAG & DROP HUD INDICATOR */}
        {isDraggingFile && (
          <div className="cine-drag-drop-hud">
            <Upload size={44} className="drag-icon-pulse" />
            <h4>Drop Subtitle File (.srt / .vtt) Here</h4>
            <p>Will load and synchronize over your stream immediately</p>
          </div>
        )}

        {/* CINEMATIC SUBTITLE TEXT OVERLAY */}
        {subEnabled && activeSubtitleText && (
          <div className={`cine-custom-subtitles-overlay size-${subSize}`}>
            <div className="cine-sub-pill">
              {activeSubtitleText.split("\n").map((line, idx) => (
                <span key={idx} className="cine-sub-line">{line}</span>
              ))}
            </div>
          </div>
        )}

        <iframe
          key={`${activeServer.id}-${activeServer.id === "legacy" ? legacySubServer.id : ""}-${reloadKey}-${tmdbId}-${isTv ? `${currSeason}-${currEpisode}` : "movie"}`}
          ref={iframeRef}
          className="cine-stream-iframe"
          src={embedUrl}
          title={`Cinema Stream - ${activeServer.name}${activeServer.id === "legacy" ? ` (${legacySubServer.name})` : ""} (${media?.title || "Movie"})`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
        />
      </div>

      {/* STREAM FOOTER HINT & SERVER SYNC TIP */}
      <div className="cine-stream-hint-bar">
        {activeServer.id === "eclipse" ? (
          <div
            className="cine-hint-item cine-hint-clickable"
            onClick={() => {
              const alphaServer = STREAM_SERVERS.find((s) => s.id === "alpha");
              if (alphaServer) handleSelectServer(alphaServer);
            }}
            title="Switch to Server Alpha for guaranteed working subtitles"
            style={{ color: "#ffffff", background: "rgba(255, 255, 255, 0.12)", border: "1px solid rgba(255, 255, 255, 0.25)" }}
          >
            <Sparkles size={14} className="accent-icon" />
            <span>Subtitles not appearing on Eclipse? <strong className="hint-strong">Click to switch to Server Alpha (Calibrated Subtitles)</strong></span>
          </div>
        ) : (
          <div
            className="cine-hint-item cine-hint-clickable"
            onClick={() => {
              setAudioSubTab("customSub");
              setShowAudioSubModal(true);
            }}
            title="Click to upload subtitles or adjust offset"
          >
            <Languages size={14} className="accent-icon" />
            <span>Need subtitles or audio tracks? <strong className="hint-strong">Click for Subtitle &amp; Audio tools</strong></span>
          </div>
        )}

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
                className={`cine-audiosub-tab-btn ${audioSubTab === "customSub" ? "active" : ""}`}
                onClick={() => setAudioSubTab("customSub")}
              >
                <Upload size={14} />
                <span>Custom Subtitles ({customCues.length ? "Active" : "Upload"})</span>
              </button>
              <button
                type="button"
                className={`cine-audiosub-tab-btn ${audioSubTab === "subtitles" ? "active" : ""}`}
                onClick={() => setAudioSubTab("subtitles")}
              >
                <Captions size={14} />
                <span>Fix Subtitle Timing</span>
              </button>
              <button
                type="button"
                className={`cine-audiosub-tab-btn ${audioSubTab === "audio" ? "active" : ""}`}
                onClick={() => setAudioSubTab("audio")}
              >
                <Volume2 size={14} />
                <span>Change Audio Track</span>
              </button>
            </div>

            <div className="cine-audiosub-body">
              {audioSubTab === "customSub" && (
                <div className="cine-custom-sub-panel">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".srt,.vtt,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleSubtitleFile(e.target.files[0]);
                      }
                    }}
                  />

                  {customCues.length === 0 ? (
                    <>
                      <div
                        className="cine-sub-uploader-box"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={32} />
                        <h4>Load .srt or .vtt Subtitles</h4>
                        <p>Click to browse your device or drag &amp; drop any subtitle file directly onto the player</p>
                      </div>

                      <div className="cine-info-callout" style={{ marginTop: "14px" }}>
                        <strong>Subtitles missing or out of sync on Season 2?</strong>
                        <p>
                          Download free, verified subtitles for <strong>{media?.title || "this title"} {isTv ? `(Season ${currSeason})` : ""}</strong> with 1 click, then select the downloaded file above:
                        </p>
                        <div className="cine-sub-search-links">
                          <a
                            href={`https://www.opensubtitles.org/en/search/sublanguageid-all/moviename-${encodeURIComponent(media?.title || "")}+season+${currSeason}`}
                            target="_blank"
                            rel="noreferrer"
                            className="cine-sub-search-btn"
                          >
                            <Search size={13} />
                            <span>Search OpenSubtitles</span>
                            <ExternalLink size={12} />
                          </a>
                          <a
                            href={`https://subdl.com/search/${encodeURIComponent(media?.title || "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="cine-sub-search-btn"
                          >
                            <Search size={13} />
                            <span>Search SubDL</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Active Subtitle Info Card */}
                      <div className="cine-sub-meta-card">
                        <div className="cine-sub-meta-info">
                          <FileText size={24} style={{ color: "#ffffff", flexShrink: 0 }} />
                          <div className="cine-sub-meta-texts">
                            <span className="cine-sub-meta-title" title={customSubName}>
                              {customSubName}
                            </span>
                            <span className="cine-sub-meta-details">
                              {customCues.length} dialogue lines loaded · Displaying over stream
                            </span>
                          </div>
                        </div>

                        <div className="cine-sub-actions-row">
                          <button
                            type="button"
                            className="cine-sub-btn-pill"
                            onClick={() => setSubEnabled(!subEnabled)}
                          >
                            <Check size={12} />
                            <span>{subEnabled ? "Visible" : "Hidden"}</span>
                          </button>
                          <button
                            type="button"
                            className="cine-sub-btn-pill"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload size={12} />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            className="cine-sub-btn-pill danger"
                            onClick={handleClearSubtitles}
                            title="Remove subtitle file"
                          >
                            <Trash2 size={12} />
                            <span>Clear</span>
                          </button>
                        </div>
                      </div>

                      {/* Timing Offset Controller */}
                      <div className="cine-sub-adjuster-card">
                        <div className="cine-adjuster-row">
                          <div className="cine-adjuster-label">
                            <strong>Subtitle Sync Offset</strong>
                            <span>Fix subtitles appearing too early or late</span>
                          </div>
                          <div className="cine-offset-btn-group">
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => handleOffsetChange(-2.0)}
                              title="Speed up by 2 seconds"
                            >
                              -2s
                            </button>
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => handleOffsetChange(-0.5)}
                              title="Speed up by 0.5 seconds"
                            >
                              -0.5s
                            </button>
                            <span className="cine-offset-current-val">
                              {subOffset > 0 ? `+${subOffset.toFixed(1)}s` : `${subOffset.toFixed(1)}s`}
                            </span>
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => handleOffsetChange(0.5)}
                              title="Delay by 0.5 seconds"
                            >
                              +0.5s
                            </button>
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => handleOffsetChange(2.0)}
                              title="Delay by 2 seconds"
                            >
                              +2s
                            </button>
                            {subOffset !== 0 && (
                              <button
                                type="button"
                                className="cine-offset-step-btn"
                                onClick={() => setSubOffset(0.0)}
                                title="Reset timing offset"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Font Size Selector */}
                        <div className="cine-adjuster-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                          <div className="cine-adjuster-label">
                            <strong>Subtitle Font Size</strong>
                            <span>Change text size on video</span>
                          </div>
                          <div className="cine-offset-btn-group">
                            {["normal", "large", "xlarge"].map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                className={`cine-offset-step-btn ${subSize === sz ? "active" : ""}`}
                                onClick={() => setSubSize(sz)}
                                style={{
                                  background: subSize === sz ? "rgba(255,255,255,0.25)" : undefined,
                                  borderColor: subSize === sz ? "#ffffff" : undefined,
                                }}
                              >
                                {sz === "normal" ? "Normal" : sz === "large" ? "Large" : "Extra Large"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Playback time status */}
                        <div className="cine-adjuster-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                          <div className="cine-adjuster-label">
                            <strong>Current Video Timestamp</strong>
                            <span>Subtitle clock: {formatSeconds(currentPlayTime)}</span>
                          </div>
                          <div className="cine-offset-btn-group">
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => setCurrentPlayTime((p) => Math.max(0, p - 5))}
                            >
                              -5s
                            </button>
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => setCurrentPlayTime((p) => Math.max(0, p - 1))}
                            >
                              -1s
                            </button>
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => setCurrentPlayTime((p) => p + 1)}
                            >
                              +1s
                            </button>
                            <button
                              type="button"
                              className="cine-offset-step-btn"
                              onClick={() => setCurrentPlayTime((p) => p + 5)}
                            >
                              +5s
                            </button>
                          </div>
                        </div>
                      </div>

                      {activeServer.id !== "nova" && (
                        <div className="cine-info-callout">
                          <strong>Want fully automatic video time synchronization?</strong>
                          <p>
                            Server Nova directly syncs with CineVerse to align custom subtitles frame-by-frame with zero manual adjustments.
                          </p>
                          <button
                            type="button"
                            className="cine-sub-btn-pill"
                            style={{ marginTop: "8px" }}
                            onClick={() => {
                              const s = STREAM_SERVERS.find((srv) => srv.id === "nova");
                              if (s) {
                                handleSelectServer(s);
                                setShowAudioSubModal(false);
                              }
                            }}
                          >
                            <Sparkles size={12} />
                            <span>Switch to Server Nova (Auto-Synced)</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
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
                          {STREAM_SERVERS.filter((s) => ["ronin", "alpha", "nova", "pulse", "legacy"].includes(s.id)).map((s) => (
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
                                  {s.id === "ronin"
                                    ? "Anime & Asian Soft Subtitles"
                                    : s.id === "alpha"
                                    ? "Auto-Calibrated (SubDL)"
                                    : s.id === "nova"
                                    ? "Direct Subtitle Stream"
                                    : s.id === "pulse"
                                    ? "Cloud Mirror Sync"
                                    : "Deep Catalog Subtitles"}
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
                          {STREAM_SERVERS.filter((s) => ["ronin", "alpha", "nova", "apex", "legacy"].includes(s.id)).map((s) => (
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
                                  {s.id === "ronin"
                                    ? "Anime Japanese Audio & Dubs"
                                    : s.id === "alpha"
                                    ? "4K / Multi-Language Audio"
                                    : s.id === "nova"
                                    ? "Direct Audio Master"
                                    : s.id === "apex"
                                    ? "Multi-Source Audio"
                                    : "Classic Stereo Master"}
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
