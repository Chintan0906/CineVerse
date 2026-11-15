require("../src/dnsConfig");

const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

// Movie search terms to ensure rich variety of cinematic moments
const MOVIE_THEMES = [
  "movie scene",
  "iconic movie moment",
  "cinema movie clip",
  "marvel scene",
  "classic movie moment",
  "sci fi movie scene",
  "action movie scene",
  "movie dialogue",
  "film scene",
];

function cleanMovieTitle(title = "") {
  return String(title)
    .replace(/\s*[|–—:-]?\s*(movie|film|scene|clip|gif|quote|edit)\b.*$/i, "")
    .replace(/\s*by\s+[a-z0-9_-]+$/i, "")
    .replace(/[|–—:-]+\s*$/, "")
    .trim();
}

function normalizeGiphyItem(item) {
  const mp4Url = item.images?.original?.mp4 || item.images?.downsized_small?.mp4 || item.images?.looping?.mp4;
  if (!mp4Url) return null;

  const rawTitle = item.title || "Movie Moment";
  const cleanedTitle = cleanMovieTitle(rawTitle);

  return {
    id: `giphy_${item.id}`,
    isDirectVideo: true,
    videoUrl: mp4Url,
    youtubeVideoId: null,
    thumbnail: item.images?.downsized_large?.url || item.images?.original?.webp || item.images?.fixed_width?.url,
    title: rawTitle,
    movieTitle: cleanedTitle || "Movie Moment",
    categories: ["Moment", "Clip"],
    sourceUrl: item.url || "https://giphy.com",
    source: "GIPHY",
    language: "en",
    published: item.import_datetime || null,
    views: item.rating ? `Rating: ${item.rating.toUpperCase()}` : null,
    tmdbId: null,
    mediaType: "movie",
  };
}

async function getMovieMoments({ page = 1, limit = 12, query = "" } = {}) {
  const apiKey = process.env.GIPHY_API_KEY || "QWBtpLAcmMFfdfoO63lNYqhjAByeuD3Y";
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(25, Number.parseInt(limit, 10) || 12));
  const offset = (safePage - 1) * safeLimit;

  // Rotate themes across pages for diverse movie content
  const themeIndex = (safePage - 1) % MOVIE_THEMES.length;
  const searchQuery = query.trim() || MOVIE_THEMES[themeIndex];
  const cacheKey = `${searchQuery}:${offset}:${safeLimit}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    q: searchQuery,
    limit: String(safeLimit),
    offset: String(offset),
    rating: "pg-13",
    lang: "en",
  });

  const response = await fetch(`${GIPHY_BASE_URL}/search?${params}`);
  if (!response.ok) {
    throw new Error(`GIPHY API returned status ${response.status}`);
  }

  const payload = await response.json();
  const rawList = Array.isArray(payload.data) ? payload.data : [];
  const videos = rawList.map(normalizeGiphyItem).filter(Boolean);
  const pagination = payload.pagination || {};
  const totalCount = pagination.total_count || 1000;
  const totalPages = Math.ceil(totalCount / safeLimit);

  const result = {
    videos,
    page: safePage,
    totalPages,
    totalCount,
    hasMore: safePage < totalPages,
  };

  cache.set(cacheKey, { result, timestamp: Date.now() });
  if (cache.size > 80) cache.delete(cache.keys().next().value);

  return result;
}

module.exports = { getMovieMoments };
