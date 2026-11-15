const API_BASE = "https://sub.wyzie.io";
const CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();
const pendingSearches = new Map();

function requireApiKey() {
  const key = process.env.WYZIE_API_KEY;
  if (!key) {
    const error = new Error("Wyzie subtitle search is not configured on the server.");
    error.statusCode = 503;
    throw error;
  }
  return key;
}

function validateSubtitleId(id) {
  const value = String(id || "").trim();
  if (!/^\d{1,12}$/.test(value) && !/^tt\d{5,12}$/i.test(value)) {
    const error = new Error("A valid TMDB or IMDb ID is required.");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

async function searchWyzieSubtitles({ id, season, episode, language = "en" }) {
  const key = requireApiKey();
  const mediaId = validateSubtitleId(id);
  const languageFilter = String(language || "en").toLowerCase();
  if (!/^[a-z]{2}(?:,[a-z]{2}){0,5}$/.test(languageFilter)) {
    const error = new Error("Choose one or more supported subtitle languages.");
    error.statusCode = 400;
    throw error;
  }

  const hasSeason = season !== undefined && season !== "";
  const hasEpisode = episode !== undefined && episode !== "";
  if (hasSeason !== hasEpisode) {
    const error = new Error("Both season and episode are required for a TV episode search.");
    error.statusCode = 400;
    throw error;
  }

  const numericSeason = hasSeason ? Number(season) : null;
  const numericEpisode = hasEpisode ? Number(episode) : null;
  if (hasSeason && (!Number.isInteger(numericSeason) || numericSeason < 0 || numericSeason > 100 || !Number.isInteger(numericEpisode) || numericEpisode < 1 || numericEpisode > 500)) {
    const error = new Error("The selected season or episode is invalid.");
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = `${mediaId}:${hasSeason ? numericSeason : ""}:${hasEpisode ? numericEpisode : ""}:${languageFilter}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
  if (pendingSearches.has(cacheKey)) return pendingSearches.get(cacheKey);

  const params = new URLSearchParams({ id: mediaId, language: languageFilter, format: "srt,vtt", encoding: "utf-8", key });
  if (hasSeason) {
    params.set("season", String(numericSeason));
    params.set("episode", String(numericEpisode));
  }

  const request = (async () => {
    const response = await fetch(`${API_BASE}/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const rejectedKey = response.status === 401 || response.status === 403;
      const error = new Error(response.status === 429
        ? "Wyzie's daily request limit has been reached. Try again later."
        : rejectedKey
          ? "Wyzie rejected the server API key. Check the backend environment setting."
          : "Wyzie could not find subtitles right now.");
      error.statusCode = response.status === 429 ? 429 : 502;
      throw error;
    }

    const payload = await response.json();
    const rawTracks = Array.isArray(payload)
      ? payload
      : payload.subtitles || payload.results || payload.data || (payload.subtitle ? [payload.subtitle] : []);
    const tracks = (Array.isArray(rawTracks) ? rawTracks : [])
      .filter((track) => track && typeof track.url === "string" && track.url.startsWith(`${API_BASE}/c/`))
      .slice(0, 60)
      .map((track) => ({
        id: String(track.id || track.url),
        url: track.url,
        display: String(track.display || track.language || "Subtitle"),
        language: String(track.language || ""),
        format: String(track.format || "srt").toLowerCase(),
        source: String(track.source || "Subtitle source"),
        release: String(track.matchedRelease || track.release || ""),
        hearingImpaired: Boolean(track.isHearingImpaired),
        media: String(track.media || ""),
      }));

    searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
    if (searchCache.size > 300) searchCache.delete(searchCache.keys().next().value);
    return tracks;
  })().finally(() => pendingSearches.delete(cacheKey));

  pendingSearches.set(cacheKey, request);
  return request;
}

async function fetchWyzieSubtitleFile(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ""));
  } catch {
    const error = new Error("This subtitle link is invalid.");
    error.statusCode = 400;
    throw error;
  }

  if (url.protocol !== "https:" || url.hostname !== "sub.wyzie.io" || !url.pathname.startsWith("/c/")) {
    const error = new Error("This subtitle link is not supported.");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    const error = new Error("The subtitle file could not be downloaded.");
    error.statusCode = 502;
    throw error;
  }
  const content = await response.text();
  if (content.length > 4_000_000) {
    const error = new Error("This subtitle file is too large to load.");
    error.statusCode = 413;
    throw error;
  }
  return content;
}

module.exports = { searchWyzieSubtitles, fetchWyzieSubtitleFile };
