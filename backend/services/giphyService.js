require("../src/dnsConfig");

const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";
const CACHE_TTL_MS = 5 * 60 * 1000;
const poolCache = new Map();

// High-impact cinematic search terms to ensure rich variety of iconic movie moments
const MOVIE_THEMES = [
  "movie scene",
  "iconic movie moment",
  "marvel movie scene",
  "action movie scene",
  "sci fi movie scene",
  "cinema movie clip",
  "classic movie moment",
  "hollywood movie clip",
  "christopher nolan movie",
  "star wars scene",
  "jurassic park scene",
  "the dark knight scene",
  "interstellar scene",
  "matrix movie scene",
  "gladiator movie scene",
  "avengers scene",
  "fight club scene",
  "pulp fiction scene",
  "lord of the rings scene",
  "harry potter scene",
  "blade runner 2049 scene",
  "spider man movie scene",
];

function shuffleArray(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

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

async function getMovieMoments({ page = 1, limit = 12, query = "", seed } = {}) {
  const apiKey = process.env.GIPHY_API_KEY || "QWBtpLAcmMFfdfoO63lNYqhjAByeuD3Y";
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(25, Number.parseInt(limit, 10) || 12));

  // Pick themes with offset randomization so each reload produces fresh clips
  const themeIndex = (safePage - 1 + Math.floor(Math.random() * MOVIE_THEMES.length)) % MOVIE_THEMES.length;
  const searchQuery = query.trim() || MOVIE_THEMES[themeIndex];
  const randomOffset = Math.floor(Math.random() * 20);
  const offset = (safePage - 1) * safeLimit + randomOffset;
  const cacheKey = `${searchQuery}:${safePage}:${safeLimit}`;

  let rawList = [];
  let totalCount = 1000;

  const cached = poolCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    rawList = cached.data;
    totalCount = cached.totalCount;
  } else {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: searchQuery,
        limit: String(safeLimit * 2), // Fetch extra so filtering leaves plenty
        offset: String(offset),
        rating: "pg-13",
        lang: "en",
      });

      const response = await fetch(`${GIPHY_BASE_URL}/search?${params}`);
      if (response.ok) {
        const payload = await response.json();
        rawList = Array.isArray(payload.data) ? payload.data : [];
        totalCount = payload.pagination?.total_count || 1000;
        poolCache.set(cacheKey, { data: rawList, totalCount, timestamp: Date.now() });
        if (poolCache.size > 80) poolCache.delete(poolCache.keys().next().value);
      }
    } catch (err) {
      console.error("GIPHY search error:", err.message);
    }
  }

  // Fallback to cached pool or default trending if search returned no results
  if (!rawList.length && poolCache.size > 0) {
    const randomCached = Array.from(poolCache.values())[Math.floor(Math.random() * poolCache.size)];
    if (randomCached?.data) rawList = randomCached.data;
  }

  const normalized = rawList.map(normalizeGiphyItem).filter(Boolean);
  // Reorder / shuffle every time so the user gets a fresh mix on each reload
  const shuffledVideos = shuffleArray(normalized).slice(0, safeLimit);

  const totalPages = Math.ceil(totalCount / safeLimit);

  return {
    videos: shuffledVideos,
    page: safePage,
    totalPages,
    totalCount,
    hasMore: safePage < totalPages,
  };
}

module.exports = { getMovieMoments, shuffleArray };
