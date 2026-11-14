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
  Play,
  Clock,
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
    id: "animeembed",
    name: "Server Kage",
    quality: "1080p Anime / Auto-Skip",
    speed: "Zero-Ad Feed",
    badge: "AnimeEmbed Pro",
    getUrl: (tmdbId, isTv, season, episode, currentTime, anilistId) => {
      const id = anilistId || "21701";
      return `https://www.animeembed.com/embed/ani/${id}/${episode || 1}?track=sub&autoSkip=1&accent=ffffff`;
    },
  },
  {
    id: "quantum",
    name: "Server Quantum",
    quality: "1080p Ultra HD / Auto-Skip",
    speed: "CineSrc VIP",
    badge: "VIP Mirror",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23ffffff&autoplay=true&autonext=true&autoskip=true`
        : `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ffffff&autoplay=true&autoskip=true`;
    },
  },
  {
    id: "framex",
    name: "Server FrameX",
    quality: "1080p / 4K Ultra HD",
    speed: "FrameX Multi-CDN",
    badge: "FrameX VIP",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://framextv.xyz/embed/${tmdbId}/${season || 1}/${episode || 1}?autoplay=1&muted=0`
        : `https://framextv.xyz/embed/${tmdbId}?autoplay=1&muted=0`;
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
        icons: "default",
        title: "false",
        poster: "false",
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
  {
    id: "wave",
    name: "Server Wave",
    quality: "1080p / 4K Ultra",
    speed: "EmbedWave Multi",
    badge: "Zero-Ad Pro",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://embedwave.cc/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?server=nxsha&autoplay=1&nobrand=1`
        : `https://embedwave.cc/embed/movie/${tmdbId}?server=nxsha&autoplay=1&nobrand=1`;
    },
  },
  {
    id: "rive",
    name: "Server Rive",
    quality: "1080p Ultra HD",
    speed: "Zero-Ad CDN",
    badge: "RiveStream Pro",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://www.rivestream.app/embed?type=tv&id=${tmdbId}&season=${season || 1}&episode=${episode || 1}`
        : `https://www.rivestream.app/embed?type=movie&id=${tmdbId}`;
    },
  },
];

// Internal extraction providers available within Server FrameX (FrameX Multi-Tier Pipeline)
const FRAMEX_SUB_SERVERS = [
  {
    id: "barbarian",
    name: "Barbarian I",
    badge: "Multi-Sub",
    quality: "Ultra-Fast HLS & Subtitles",
    provider: "barbarian",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://framextv.xyz/embed/${tmdbId}/${season || 1}/${episode || 1}?server=barbarian&autoplay=1&muted=0`
        : `https://framextv.xyz/embed/${tmdbId}?server=barbarian&autoplay=1&muted=0`;
    },
  },
  {
    id: "archer",
    name: "Archer II",
    badge: "4K UHD",
    quality: "Multi-Audio Tracks & 4K UHD",
    provider: "archer",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://framextv.xyz/embed/${tmdbId}/${season || 1}/${episode || 1}?server=archer&autoplay=1&muted=0`
        : `https://framextv.xyz/embed/${tmdbId}?server=archer&autoplay=1&muted=0`;
    },
  },
  {
    id: "goblin",
    name: "Goblin III",
    badge: "Fast Mirror",
    quality: "Automatic Stream Mirror",
    provider: "goblin",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://framextv.xyz/embed/${tmdbId}/${season || 1}/${episode || 1}?server=goblin&autoplay=1&muted=0`
        : `https://framextv.xyz/embed/${tmdbId}?server=goblin&autoplay=1&muted=0`;
    },
  },
  {
    id: "pekka",
    name: "P.E.K.K.A IV",
    badge: "1080p Pure",
    quality: "1080p Uncompressed High-Bitrate",
    provider: "pekka",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://framextv.xyz/embed/${tmdbId}/${season || 1}/${episode || 1}?server=pekka&autoplay=1&muted=0`
        : `https://framextv.xyz/embed/${tmdbId}?server=pekka&autoplay=1&muted=0`;
    },
  },
];

// Internal mirror servers available within Server Quantum (CineSrc Cluster)
const QUANTUM_SUB_SERVERS = [
  {
    id: "cinesrc-auto",
    name: "CineSrc Pro",
    badge: "Auto-Skip",
    quality: "1080p Ultra HD / Auto-Skip",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23ffffff&autoplay=true&autonext=true&autoskip=true`
        : `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ffffff&autoplay=true&autoskip=true`;
    },
  },
  {
    id: "cinesrc-fast",
    name: "CineSrc Fast CDN",
    badge: "Fast Stream",
    quality: "1080p Ultra Fast CDN",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23ffffff&autoplay=true&autonext=true&prioritize=true`
        : `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ffffff&autoplay=true&prioritize=true`;
    },
  },
  {
    id: "cinesrc-uncut",
    name: "CineSrc Cinema",
    badge: "Uncut Intro",
    quality: "1080p Full Experience",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://cinesrc.st/embed/tv/${tmdbId}?s=${season || 1}&e=${episode || 1}&color=%23ffffff&autoplay=true&autonext=true&autoskip=false`
        : `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ffffff&autoplay=true&autoskip=false`;
    },
  },
];

// Internal mirror servers available within Server Wave (EmbedWave Cluster)
const WAVE_SUB_SERVERS = [
  {
    id: "nxsha",
    name: "Wave Multi HD",
    badge: "Multi HD",
    quality: "1080p Multi-HD",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://embedwave.cc/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?server=nxsha&autoplay=1&nobrand=1`
        : `https://embedwave.cc/embed/movie/${tmdbId}?server=nxsha&autoplay=1&nobrand=1`;
    },
  },
  {
    id: "cinesrc",
    name: "Wave CineSrc",
    badge: "CineSrc",
    quality: "1080p CineSrc Route",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://embedwave.cc/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?server=cinesrc&autoplay=1&nobrand=1`
        : `https://embedwave.cc/embed/movie/${tmdbId}?server=cinesrc&autoplay=1&nobrand=1`;
    },
  },
  {
    id: "videasy",
    name: "Wave 4K Ultra",
    badge: "4K UHD",
    quality: "4K UHD Route",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://embedwave.cc/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?server=videasy&autoplay=1&nobrand=1`
        : `https://embedwave.cc/embed/movie/${tmdbId}?server=videasy&autoplay=1&nobrand=1`;
    },
  },
];

// Dedicated anime sub-tracks for AnimeEmbed (Server Kage)
const ANIMEEMBED_SUB_SERVERS = [
  {
    id: "sub",
    name: "Japanese Sub",
    badge: "Auto-Skip",
    quality: "1080p Original Sub",
    getUrl: (aniId, episode) =>
      `https://www.animeembed.com/embed/ani/${aniId}/${episode || 1}?track=sub&autoSkip=1&accent=ffffff`,
  },
  {
    id: "dub",
    name: "English Dub",
    badge: "English Audio",
    quality: "1080p English Dub",
    getUrl: (aniId, episode) =>
      `https://www.animeembed.com/embed/ani/${aniId}/${episode || 1}?track=dub&autoSkip=1&accent=ffffff`,
  },
  {
    id: "uncut",
    name: "Full Opening (Sub)",
    badge: "Full Song",
    quality: "1080p Uncut Intro",
    getUrl: (aniId, episode) =>
      `https://www.animeembed.com/embed/ani/${aniId}/${episode || 1}?track=sub&autoSkip=0&accent=ffffff`,
  },
];

// Internal mirror servers available within Server Eclipse (VidFast High-Speed Cluster)
const ECLIPSE_SUB_SERVERS = [
  {
    id: "auto",
    name: "Eclipse Auto",
    badge: "Auto Stream",
    quality: "1080p / 4K UHD",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://vidfast.vc/movie/${tmdbId}`;
    },
  },
  {
    id: "vrapid",
    name: "vRapid",
    badge: "4K UHD",
    quality: "4K UHD / Original Audio",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}?server=vrapid`
        : `https://vidfast.vc/movie/${tmdbId}?server=vrapid`;
    },
  },
  {
    id: "vblaze",
    name: "vBlaze",
    badge: "4K Fast",
    quality: "4K Fast / Ultra Stream",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}?server=vblaze`
        : `https://vidfast.vc/movie/${tmdbId}?server=vblaze`;
    },
  },
  {
    id: "cobra",
    name: "Cobra",
    badge: "Direct HD",
    quality: "1080p Direct / Original Audio",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}?server=cobra`
        : `https://vidfast.vc/movie/${tmdbId}?server=cobra`;
    },
  },
  {
    id: "cine",
    name: "Cine",
    badge: "Multi-Audio",
    quality: "1080p Multiple Audio",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}?server=cine`
        : `https://vidfast.vc/movie/${tmdbId}?server=cine`;
    },
  },
  {
    id: "bravo",
    name: "Bravo",
    badge: "Fast CDN",
    quality: "1080p Fast CDN / Original Audio",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}?server=bravo`
        : `https://vidfast.vc/movie/${tmdbId}?server=bravo`;
    },
  },
  {
    id: "horizon",
    name: "Horizon",
    badge: "Cloud Mirror",
    quality: "1080p Cloud / Original Audio",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${season || 1}/${episode || 1}?server=horizon`
        : `https://vidfast.vc/movie/${tmdbId}?server=horizon`;
    },
  },
];

// Internal mirror servers available within Server Legacy (High-Performance CDN Cluster)
const LEGACY_SUB_SERVERS = [
  {
    id: "prime",
    name: "Legacy Prime",
    badge: "Auto Stream",
    quality: "1080p Dynamic",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    },
  },
  {
    id: "velocity",
    name: "Mirror Velocity",
    badge: "Fast HD",
    quality: "1080p Direct",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://vidsrc.buzz/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://vidsrc.buzz/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "prism",
    name: "Mirror Prism",
    badge: "Direct Stream",
    quality: "1080p Stable",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://videm.xyz/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `https://videm.xyz/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "flux",
    name: "Mirror Flux",
    badge: "Cloud Stream",
    quality: "1080p Cloud",
    getUrl: (tmdbId, isTv, season, episode) => {
      return isTv
        ? `https://streamsrcs.2embed.cc/vcr-tv?tmdb=${tmdbId}&s=${season || 1}&e=${episode || 1}`
        : `https://streamsrcs.2embed.cc/vcr?tmdb=${tmdbId}`;
    },
  },
];

const STORAGE_KEYS = {
  ACTIVE_SERVER: "cineverse_active_server_v5",
  FRAMEX_SUB: "cineverse_framex_sub_id",
  ECLIPSE_SUB: "cineverse_eclipse_sub_id",
  QUANTUM_SUB: "cineverse_quantum_sub_id",
  WAVE_SUB: "cineverse_wave_sub_id",
  ANIME_SUB: "cineverse_anime_sub_id",
  LEGACY_SUB: "cineverse_legacy_sub_id",
};

function CineStreamPlayer({
  media,
  onProgress,
  seasons = [],
  episodes = [],
  onSeasonChange,
  onEpisodeChange,
}) {
  const [activeServer, setActiveServer] = useState(() => {
    if (media?.resumePlayback && Number(media.currentTime) >= 15) {
      const resumeServer = STREAM_SERVERS.find((server) => server.id === "nova");
      if (resumeServer) return resumeServer;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlServer = urlParams.get("server");
      const savedId =
        urlServer ||
        localStorage.getItem(STORAGE_KEYS.ACTIVE_SERVER) ||
        sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SERVER);
      if (savedId) {
        const found = STREAM_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {
      // ignore
    }
    return STREAM_SERVERS[0];
  });

  const [eclipseSubServer, setEclipseSubServer] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.ECLIPSE_SUB);
      if (savedId) {
        const found = ECLIPSE_SUB_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return ECLIPSE_SUB_SERVERS[0];
  });

  const [framexSubServer, setFramexSubServer] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.FRAMEX_SUB);
      if (savedId) {
        const found = FRAMEX_SUB_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return FRAMEX_SUB_SERVERS[0];
  });

  const [quantumSubServer, setQuantumSubServer] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.QUANTUM_SUB);
      if (savedId) {
        const found = QUANTUM_SUB_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return QUANTUM_SUB_SERVERS[0];
  });

  const [waveSubServer, setWaveSubServer] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.WAVE_SUB);
      if (savedId) {
        const found = WAVE_SUB_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return WAVE_SUB_SERVERS[0];
  });

  const [animeEmbedSubServer, setAnimeEmbedSubServer] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.ANIME_SUB);
      if (savedId) {
        const found = ANIMEEMBED_SUB_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return ANIMEEMBED_SUB_SERVERS[0];
  });

  const [legacySubServer, setLegacySubServer] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.LEGACY_SUB);
      if (savedId) {
        const found = LEGACY_SUB_SERVERS.find((s) => s.id === savedId);
        if (found) return found;
      }
    } catch {}
    return LEGACY_SUB_SERVERS[0];
  });
  const [anilistId, setAnilistId] = useState(null);
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

  // Dynamic AniList ID resolution for AnimeEmbed (Server Kage)
  useEffect(() => {
    if (!media?.title) return;
    const cleanTitle = media.title
      .replace(/\s*\(?\d{4}\)?$/g, "")
      .replace(/:\s*Season\s*\d+/gi, "")
      .trim();

    const cacheKey = `cine_ani_id_${cleanTitle.toLowerCase()}_s${currSeason}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setAnilistId(cached);
        return;
      }
    } catch {
      // ignore
    }

    let active = true;
    let searchTitle = cleanTitle;
    if (currSeason > 1 && !searchTitle.toLowerCase().includes("season")) {
      searchTitle = `${cleanTitle} Season ${currSeason}`;
    }

    const fetchAni = (term) => {
      return fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query ($search: String) {
            Media (search: $search, type: ANIME) {
              id
            }
          }`,
          variables: { search: term },
        }),
      }).then((res) => res.json());
    };

    fetchAni(searchTitle)
      .then((json) => {
        if (!active) return;
        const id = json?.data?.Media?.id;
        if (id) {
          setAnilistId(String(id));
          try {
            sessionStorage.setItem(cacheKey, String(id));
          } catch {}
        } else if (searchTitle !== cleanTitle) {
          return fetchAni(cleanTitle).then((res2) => {
            if (!active) return;
            const fallbackId = res2?.data?.Media?.id;
            if (fallbackId) {
              setAnilistId(String(fallbackId));
              try {
                sessionStorage.setItem(cacheKey, String(fallbackId));
              } catch {}
            }
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [media?.title, currSeason]);

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

  // Listen for playback events (Real-time telemetry and video playback seconds)
  useEffect(() => {
    let lastSavedAt = 0;
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      // 1. VidLink.pro & VidFast (Server Eclipse) messages
      if (
        event.origin === "https://vidlink.pro" ||
        event.origin?.includes("vidfast") ||
        event.data?.type === "PLAYER_EVENT"
      ) {
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
        } else if (playerEvent.event === "seeked" && typeof playerEvent.currentTime === "number") {
          setCurrentPlayTime(playerEvent.currentTime);
        }
      }

      // 2. CineSrc (cinesrc.st) postMessage API
      if (event.origin === "https://cinesrc.st") {
        const eventData = event.data;
        if (!eventData || typeof eventData !== "object") return;
        const type = eventData.type;

        if (type === "cinesrc:play") {
          setSubPlaying(true);
        } else if (type === "cinesrc:pause") {
          setSubPlaying(false);
        } else if (type === "cinesrc:timeupdate") {
          const { currentTime, duration } = eventData;
          if (typeof currentTime === "number") {
            setCurrentPlayTime(currentTime);
            setSubPlaying(true);
            if (Date.now() - lastSavedAt >= 15000) {
              const currentMedia = mediaRef.current;
              onProgressRef.current?.(
                currentMedia,
                currentTime,
                duration,
                { season: currSeason, episode: currEpisode }
              );
              lastSavedAt = Date.now();
            }
          }
        } else if (type === "cinesrc:nextepisode") {
          const nextEp = Number(eventData.episode);
          const nextSeason = Number(eventData.season);
          if (nextSeason && nextSeason !== currSeason) {
            handleSeasonSelect(nextSeason);
          }
          if (nextEp && nextEp !== currEpisode) {
            if (eventData.internalNavigation) {
              setCurrEpisode(nextEp);
              if (onEpisodeChange) onEpisodeChange(nextEp);
            } else {
              handleEpisodeSelect(nextEp);
            }
          }
        }
      }

      // 3. FrameXTV (framextv.xyz) postMessage API
      if (event.origin?.includes("framextv") || event.data?.event?.startsWith("frameXTV:")) {
        const eventData = event.data;
        if (!eventData || typeof eventData !== "object") return;
        const ev = eventData.event;

        if (ev === "frameXTV:timeupdate") {
          const currentTime = Number(eventData.currentTime || 0);
          const duration = Number(eventData.duration || 0);
          if (currentTime > 0) {
            setCurrentPlayTime(currentTime);
            setSubPlaying(true);
            if (Date.now() - lastSavedAt >= 15000) {
              const currentMedia = mediaRef.current;
              onProgressRef.current?.(
                currentMedia,
                currentTime,
                duration,
                { season: currSeason, episode: currEpisode }
              );
              lastSavedAt = Date.now();
            }
          }
        } else if (ev === "frameXTV:play") {
          setSubPlaying(true);
        } else if (ev === "frameXTV:pause") {
          setSubPlaying(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currSeason, currEpisode, onEpisodeChange, onSeasonChange]);

  // Fallback timer for custom subtitles on servers without postMessage
  useEffect(() => {
    if (!customCues.length || !subPlaying || activeServer.id === "nova" || activeServer.id === "quantum") return undefined;
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
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SERVER, server.id);
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SERVER, server.id);
      const url = new URL(window.location.href);
      url.searchParams.set("server", server.id);
      window.history.replaceState({}, "", url.toString());
    } catch {}
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

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        )
      );
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  const handleFullscreen = () => {
    const el = screenBoxRef.current;
    if (!el) return;

    const fsElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (fsElement || isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } else {
      const requestFn =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;

      if (typeof requestFn === "function") {
        requestFn.call(el).catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
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
    : activeServer.id === "eclipse"
    ? eclipseSubServer.getUrl(tmdbId, isTv, currSeason, currEpisode)
    : activeServer.id === "quantum"
    ? quantumSubServer.getUrl(tmdbId, isTv, currSeason, currEpisode)
    : activeServer.id === "wave"
    ? waveSubServer.getUrl(tmdbId, isTv, currSeason, currEpisode)
    : activeServer.id === "animeembed"
    ? animeEmbedSubServer.getUrl(anilistId || "21701", currEpisode)
    : activeServer.id === "framex"
    ? framexSubServer.getUrl(tmdbId, isTv, currSeason, currEpisode)
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

      {/* ECLIPSE SUB-SERVER SWITCHER BAR */}
      {activeServer.id === "eclipse" && (
        <div className="cine-subserver-bar-wrapper eclipse-theme">
          <div className="cine-subserver-label">
            <Layers size={13} className="subserver-icon" />
            <span>Eclipse Server Mirrors:</span>
          </div>
          <div className="cine-subserver-pills" role="tablist">
            {ECLIPSE_SUB_SERVERS.map((sub) => {
              const isSubActive = eclipseSubServer.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => {
                    setEclipseSubServer(sub);
                    try { localStorage.setItem(STORAGE_KEYS.ECLIPSE_SUB, sub.id); } catch {}
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

      {/* ANIMEEMBED (SERVER KAGE) SUB-SERVER SWITCHER BAR */}
      {activeServer.id === "animeembed" && (
        <div className="cine-subserver-bar-wrapper animeembed-theme">
          <div className="cine-subserver-label">
            <Layers size={13} className="subserver-icon" />
            <span>AnimeEmbed Track:</span>
          </div>
          <div className="cine-subserver-pills" role="tablist">
            {ANIMEEMBED_SUB_SERVERS.map((sub) => {
              const isSubActive = animeEmbedSubServer.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => {
                    setAnimeEmbedSubServer(sub);
                    try { localStorage.setItem(STORAGE_KEYS.ANIME_SUB, sub.id); } catch {}
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

      {/* FRAMEX (FRAMEXTV) EXTRACTION PROVIDERS SWITCHER BAR */}
      {activeServer.id === "framex" && (
        <div className="cine-subserver-bar-wrapper framex-theme">
          <div className="cine-subserver-label">
            <Layers size={13} className="subserver-icon" />
            <span>FrameX Extraction Providers:</span>
          </div>
          <div className="cine-subserver-pills" role="tablist">
            {FRAMEX_SUB_SERVERS.map((sub) => {
              const isSubActive = framexSubServer.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => {
                    setFramexSubServer(sub);
                    try { localStorage.setItem(STORAGE_KEYS.FRAMEX_SUB, sub.id); } catch {}
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

      {/* QUANTUM (CINESRC) SUB-SERVER SWITCHER BAR */}
      {activeServer.id === "quantum" && (
        <div className="cine-subserver-bar-wrapper quantum-theme">
          <div className="cine-subserver-label">
            <Layers size={13} className="subserver-icon" />
            <span>CineSrc VIP Mirrors:</span>
          </div>
          <div className="cine-subserver-pills" role="tablist">
            {QUANTUM_SUB_SERVERS.map((sub) => {
              const isSubActive = quantumSubServer.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => {
                    setQuantumSubServer(sub);
                    try { localStorage.setItem(STORAGE_KEYS.QUANTUM_SUB, sub.id); } catch {}
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

      {/* WAVE (EMBEDWAVE) SUB-SERVER SWITCHER BAR */}
      {activeServer.id === "wave" && (
        <div className="cine-subserver-bar-wrapper wave-theme">
          <div className="cine-subserver-label">
            <Layers size={13} className="subserver-icon" />
            <span>EmbedWave Routes:</span>
          </div>
          <div className="cine-subserver-pills" role="tablist">
            {WAVE_SUB_SERVERS.map((sub) => {
              const isSubActive = waveSubServer.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => {
                    setWaveSubServer(sub);
                    try { localStorage.setItem(STORAGE_KEYS.WAVE_SUB, sub.id); } catch {}
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
                    try { localStorage.setItem(STORAGE_KEYS.LEGACY_SUB, sub.id); } catch {}
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

      {/* ACTIVE STATUS BANNER */}
      <div className="cine-server-status-bar">
        <div className="cine-server-status-left">
          <span className="cine-status-dot-live" />
          <span className="cine-status-text">
            Streaming via <strong>{activeServer.name}</strong>
            {activeServer.id === "legacy" && (
              <span className="cine-status-subname"> &bull; {legacySubServer.name}</span>
            )}
            {activeServer.id === "eclipse" && (
              <span className="cine-status-subname eclipse"> &bull; {eclipseSubServer.name}</span>
            )}
            {activeServer.id === "quantum" && (
              <span className="cine-status-subname quantum"> &bull; {quantumSubServer.name}</span>
            )}
            {activeServer.id === "wave" && (
              <span className="cine-status-subname wave"> &bull; {waveSubServer.name}</span>
            )}
            {activeServer.id === "animeembed" && (
              <span className="cine-status-subname animeembed"> &bull; {animeEmbedSubServer.name}</span>
            )}
          </span>
          <span className="cine-status-chip">
            {activeServer.id === "legacy"
              ? legacySubServer.quality
              : activeServer.id === "eclipse"
              ? eclipseSubServer.quality
              : activeServer.id === "quantum"
              ? quantumSubServer.quality
              : activeServer.id === "wave"
              ? waveSubServer.quality
              : activeServer.id === "animeembed"
              ? animeEmbedSubServer.quality
              : activeServer.quality}
          </span>
          <span className="cine-status-chip speed-chip">
            {activeServer.id === "legacy"
              ? legacySubServer.badge
              : activeServer.id === "eclipse"
              ? eclipseSubServer.badge
              : activeServer.id === "quantum"
              ? quantumSubServer.badge
              : activeServer.id === "wave"
              ? waveSubServer.badge
              : activeServer.id === "animeembed"
              ? animeEmbedSubServer.badge
              : activeServer.speed}
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
            className={`cine-server-action-btn ${isFullscreen ? "active-subs" : ""}`}
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Player"}
          >
            <Maximize2 size={13} />
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>
          <button
            type="button"
            className={`cine-server-action-btn ${customCues.length ? "active-subs" : ""}`}
            onClick={() => {
              setAudioSubTab(customCues.length ? "subtitles" : "customSub");
              setShowAudioSubModal(true);
            }}
            title="Upload custom subtitle file (.srt / .vtt) or adjust timing offset"
          >
            <Captions size={13} />
            <span>{customCues.length ? "Subtitles: Active" : "Subtitles"}</span>
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
        className={`cine-screen-box ${isChanging ? "switching" : ""} ${isFullscreen ? "is-fullscreen" : ""}`}
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
          key={`${activeServer.id}-${activeServer.id === "legacy" ? legacySubServer.id : activeServer.id === "eclipse" ? eclipseSubServer.id : activeServer.id === "quantum" ? quantumSubServer.id : activeServer.id === "wave" ? waveSubServer.id : activeServer.id === "animeembed" ? `${animeEmbedSubServer.id}-${anilistId}` : ""}-${reloadKey}-${tmdbId}-${isTv ? `${currSeason}-${currEpisode}` : "movie"}`}
          ref={iframeRef}
          className="cine-stream-iframe"
          src={embedUrl}
          title={`Cinema Stream - ${activeServer.name}${activeServer.id === "legacy" ? ` (${legacySubServer.name})` : activeServer.id === "eclipse" ? ` (${eclipseSubServer.name})` : activeServer.id === "quantum" ? ` (${quantumSubServer.name})` : activeServer.id === "wave" ? ` (${waveSubServer.name})` : activeServer.id === "animeembed" ? ` (${animeEmbedSubServer.name})` : ""} (${media?.title || "Movie"})`}
          allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *; display-capture *; accelerometer *; gyroscope *"
          allowFullScreen={true}
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          referrerPolicy="origin-when-cross-origin"
        />
      </div>

      {/* SERIES EPISODES & SEASONS NAVIGATION CONTAINER (BEFORE MORE LIKE THIS) */}
      {isTv && (
        <section className="cine-series-nav-container">
          <div className="cine-series-nav-header">
            <div className="cine-series-nav-title-group">
              <span className="cine-series-nav-eyebrow">
                <Tv size={14} /> Series Episodes
              </span>
              <h3 className="cine-series-nav-title">
                {media?.title || "Series"} · {currentSeasonObj?.name || `Season ${currSeason}`}
              </h3>
            </div>

            {/* BUTTONS TO SELECT SEASON */}
            <div className="cine-season-buttons-row" role="tablist" aria-label="Select Season">
              {seasonList.map((s) => {
                const isActive = Number(s.season_number) === Number(currSeason);
                return (
                  <button
                    key={s.id || s.season_number}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSeasonSelect(s.season_number)}
                    className={`cine-season-pill-btn ${isActive ? "active" : ""}`}
                  >
                    <span>{s.name || `Season ${s.season_number}`}</span>
                    {s.episode_count ? <span className="season-ep-count">({s.episode_count})</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* EPISODE CARDS GRID */}
          <div className="cine-episodes-cards-grid">
            {episodeList.map((ep) => {
              const isCurrent = Number(ep.episodeNumber) === Number(currEpisode);
              const stillUrl = ep.still || media?.backdrop || media?.poster;
              return (
                <article
                  key={ep.id || ep.episodeNumber}
                  className={`cine-player-episode-card ${isCurrent ? "active-episode" : ""}`}
                  onClick={() => handleEpisodeSelect(ep.episodeNumber)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play Episode ${ep.episodeNumber}: ${ep.name || `Episode ${ep.episodeNumber}`}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEpisodeSelect(ep.episodeNumber);
                    }
                  }}
                >
                  <div className="cine-ep-thumb-wrap">
                    {stillUrl ? (
                      <img
                        src={stillUrl}
                        alt={ep.name || `Episode ${ep.episodeNumber}`}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = media?.poster || "";
                        }}
                      />
                    ) : (
                      <div className="cine-ep-thumb-fallback">
                        <Film size={26} />
                      </div>
                    )}
                    <div className="cine-ep-play-overlay">
                      <Play size={22} fill="#ffffff" />
                    </div>
                    <span className="cine-ep-num-badge">
                      EP {String(ep.episodeNumber).padStart(2, "0")}
                    </span>
                    {isCurrent && (
                      <span className="cine-ep-now-playing-badge">NOW PLAYING</span>
                    )}
                  </div>

                  <div className="cine-ep-details">
                    <div className="cine-ep-title-row">
                      <h4 className="cine-ep-title">
                        {ep.episodeNumber}. {ep.name || `Episode ${ep.episodeNumber}`}
                      </h4>
                      {ep.runtime > 0 && (
                        <span className="cine-ep-runtime">
                          <Clock size={12} />
                          {ep.runtime}m
                        </span>
                      )}
                    </div>
                    <p className="cine-ep-overview">
                      {ep.overview || "No episode summary available."}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
                <span>Upload (.srt/.vtt)</span>
              </button>
              <button
                type="button"
                className={`cine-audiosub-tab-btn ${audioSubTab === "subtitles" ? "active" : ""}`}
                onClick={() => setAudioSubTab("subtitles")}
              >
                <Captions size={14} />
                <span>Fix Timing Offset</span>
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
                          {STREAM_SERVERS.filter((s) => ["quantum", "eclipse", "animeembed", "framex", "ronin", "nova", "pulse", "legacy", "wave", "rive"].includes(s.id)).map((s) => (
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
                                  {s.id === "framex"
                                    ? "FrameX Multi-Subtitles HLS"
                                    : s.id === "ronin"
                                    ? "Anime & Asian Soft Subtitles"
                                    : s.id === "nova"
                                    ? "Direct Subtitle Stream"
                                    : s.id === "pulse"
                                    ? "Cloud Mirror Sync"
                                    : s.id === "quantum"
                                    ? "Auto-Skip / Subtitles"
                                    : s.id === "eclipse"
                                    ? "Ultra-Fast CDN Stream"
                                    : s.id === "animeembed"
                                    ? "Anime Sub / Dub Stream"
                                    : s.id === "wave"
                                    ? "Multi-Route Subtitles"
                                    : s.id === "rive"
                                    ? "Fast CDN Subtitles"
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
                          {STREAM_SERVERS.filter((s) => ["quantum", "eclipse", "framex", "ronin", "nova", "apex", "legacy", "wave", "rive"].includes(s.id)).map((s) => (
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
                                  {s.id === "framex"
                                    ? "FrameX Archer Multi-Audio & 4K UHD"
                                    : s.id === "ronin"
                                    ? "Anime Japanese Audio & Dubs"
                                    : s.id === "nova"
                                    ? "Direct Audio Master"
                                    : s.id === "apex"
                                    ? "Multi-Source Audio"
                                    : s.id === "quantum"
                                    ? "Multi-Audio / Auto-Skip"
                                    : s.id === "eclipse"
                                    ? "Ultra-Fast Full HD"
                                    : s.id === "wave"
                                    ? "Multi-Audio / 4K UHD Feed"
                                    : s.id === "rive"
                                    ? "Fast CDN Multi-Audio"
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
