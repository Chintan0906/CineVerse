const BASE_URL = "https://api.kinocheck.com";
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map();
const inFlightRequests = new Map();

const CATEGORY_FILTERS = {
  all: null,
  trailers: "Trailer,Teaser",
  moments: "Clip,Featurette",
};

function getMovieTitle(video) {
  const title = String(video.title || "Movie preview").trim();
  const cleaned = title
    .replace(/\s*[|–—:-]?\s*(official\s+)?(teaser\s+)?trailer\b.*$/i, "")
    .replace(/\s*[|–—:-]?\s*(official\s+)?(movie\s+)?clip\b.*$/i, "")
    .replace(/\s*[|–—:-]?\s*(featurette|behind the scenes|bloopers)\b.*$/i, "")
    .replace(/[|–—:-]+\s*$/, "")
    .trim();
  return cleaned || title;
}

function normalizeVideo(video) {
  const id = video.youtube_video_id || video.youtubeVideoId;
  if (!id) return null;

  const resourceValue = video.resource || {};
  const resource = Array.isArray(resourceValue) ? (resourceValue[0] || {}) : resourceValue;
  const categories = Array.isArray(video.categories) ? video.categories : [];
  return {
    id: String(video.id || id),
    youtubeVideoId: String(id),
    title: String(video.title || "Movie preview"),
    movieTitle: getMovieTitle(video),
    thumbnail: video.thumbnail || video.youtube_thumbnail || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    categories,
    language: video.language || "en",
    published: video.published || null,
    views: video.views || null,
    sourceUrl: video.url || null,
    tmdbId: resource.tmdb_id ? String(resource.tmdb_id) : null,
    mediaType: resource.type === "show" || resource.type === "tv" ? "tv" : "movie",
  };
}

async function requestMovieReels({ feed = "trending", page = 1, limit = 12, category = "all", language = "en" } = {}) {
  const safeFeed = feed === "latest" ? "latest" : "trending";
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const requestedLimit = Math.max(1, Math.min(24, Number.parseInt(limit, 10) || 12));
  const safeCategory = Object.hasOwn(CATEGORY_FILTERS, category) ? category : "all";
  const safeLanguage = language === "de" ? "de" : "en";
  // The trailers endpoint documents genre filters, but not category filters.
  // Fetch a larger page for category tabs, then filter its video metadata here.
  const safeLimit = safeCategory === "all" ? requestedLimit : Math.min(100, requestedLimit * 2);
  const cacheKey = `${safeFeed}:${safePage}:${safeLimit}:${safeCategory}:${safeLanguage}`;
  const cached = responseCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.result;
  if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey);

  const params = new URLSearchParams({ page: String(safePage), limit: String(safeLimit), language: safeLanguage });
  const request = (async () => {
    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    if (process.env.KINOCHECK_API_KEY) {
      headers["X-Api-Key"] = process.env.KINOCHECK_API_KEY;
      headers["X-Api-Host"] = "api.kinocheck.com";
    }

    const response = await fetch(`${BASE_URL}/trailers/${safeFeed}?${params}`, { headers });
    if (!response.ok) throw new Error(`KinoCheck returned ${response.status}.`);

    const payload = await response.json();
    const possibleLists = [payload.videos, payload.data, payload.results, payload.trailers, payload.data?.videos];
    const rawVideos = Array.isArray(payload)
      ? payload
      : possibleLists.find(Array.isArray) || (payload.youtube_video_id ? [payload] : []);
    const allowedCategories = CATEGORY_FILTERS[safeCategory]?.split(",") || null;
    const videos = rawVideos
      .map(normalizeVideo)
      .filter(Boolean)
      .filter((video) => !allowedCategories || video.categories.some((item) => allowedCategories.includes(item)));
    const metadata = payload._metadata || payload.metadata || payload.data?._metadata || {};
    const totalPages = Math.max(safePage, Number(metadata.total_pages || payload.total_pages || safePage));
    const result = {
      videos,
      page: safePage,
      totalPages,
      totalCount: Number(metadata.total_count || payload.total_count || 0),
      hasMore: safePage < totalPages,
    };

    responseCache.set(cacheKey, { result, timestamp: Date.now() });
    if (responseCache.size > 120) responseCache.delete(responseCache.keys().next().value);
    return result;
  })().finally(() => inFlightRequests.delete(cacheKey));

  inFlightRequests.set(cacheKey, request);
  return request;
}

module.exports = { requestMovieReels };
