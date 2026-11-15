require("../src/dnsConfig");

const BASE_URL = "https://api.kinocheck.com";
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map();
const inFlightRequests = new Map();

// Lazy-loaded services
let tmdbService = null;
function getTmdbService() {
  if (!tmdbService) {
    try {
      tmdbService = require("./tmdbService");
    } catch (_) {
      tmdbService = null;
    }
  }
  return tmdbService;
}

let giphyService = null;
function getGiphyService() {
  if (!giphyService) {
    try {
      giphyService = require("./giphyService");
    } catch (_) {
      giphyService = null;
    }
  }
  return giphyService;
}

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
  const id = video.youtube_video_id || video.youtubeVideoId || video.trailerKey;
  if (!id) return null;

  const resourceValue = video.resource || {};
  const resource = Array.isArray(resourceValue) ? (resourceValue[0] || {}) : resourceValue;
  const categories = Array.isArray(video.categories)
    ? video.categories
    : video.videoType
    ? [video.videoType]
    : ["Trailer"];

  return {
    id: String(video.id || id),
    youtubeVideoId: String(id),
    title: String(video.title || video.videoName || "Movie preview"),
    movieTitle: getMovieTitle(video) || video.title || "Featured Movie",
    thumbnail: video.thumbnail || video.youtube_thumbnail || video.backdrop || video.poster || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    categories,
    language: video.language || "en",
    published: video.published || null,
    views: video.views || null,
    sourceUrl: video.url || (video.youtube_video_id ? `https://kinocheck.com` : null),
    tmdbId: resource.tmdb_id ? String(resource.tmdb_id) : (video.tmdbId || (video.id && /^\d+$/.test(String(video.id)) ? String(video.id) : null)),
    mediaType: resource.type === "show" || resource.type === "tv" || video.mediaType === "tv" || video.isTV ? "tv" : "movie",
  };
}

async function requestMovieReels({ feed = "trending", page = 1, limit = 12, category = "all", language = "en" } = {}) {
  const safeFeed = feed === "latest" ? "latest" : "trending";
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const requestedLimit = Math.max(1, Math.min(24, Number.parseInt(limit, 10) || 12));
  const safeCategory = Object.hasOwn(CATEGORY_FILTERS, category) ? category : "all";
  const safeLanguage = language === "de" ? "de" : "en";
  const safeLimit = safeCategory === "all" ? requestedLimit : Math.min(100, requestedLimit * 2);
  const cacheKey = `${safeFeed}:${safePage}:${safeLimit}:${safeCategory}:${safeLanguage}`;
  const cached = responseCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.result;
  if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey);

  const params = new URLSearchParams({ page: String(safePage), limit: String(safeLimit), language: safeLanguage });
  const request = (async () => {
    // If user requested "Movie moments", serve direct movie clips via GIPHY API
    if (safeCategory === "moments") {
      const giphy = getGiphyService();
      if (giphy) {
        try {
          const momentsData = await giphy.getMovieMoments({ page: safePage, limit: requestedLimit });
          if (momentsData?.videos?.length) {
            responseCache.set(cacheKey, { result: momentsData, timestamp: Date.now() });
            return momentsData;
          }
        } catch (giphyErr) {
          console.error("Giphy service error:", giphyErr.message);
        }
      }
    }

    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    if (process.env.KINOCHECK_API_KEY) {
      headers["X-Api-Key"] = process.env.KINOCHECK_API_KEY;
      headers["X-Api-Host"] = "api.kinocheck.com";
    }

    let payload = null;
    let fetchError = null;

    // Try primary feed endpoint (e.g. /trailers/trending or /trailers/latest)
    try {
      const response = await fetch(`${BASE_URL}/trailers/${safeFeed}?${params}`, { headers });
      if (response.ok) {
        payload = await response.json();
      } else if (response.status === 404 && safeFeed === "trending") {
        // Fallback to base /trailers endpoint
        const fallbackRes = await fetch(`${BASE_URL}/trailers?${params}`, { headers });
        if (fallbackRes.ok) payload = await fallbackRes.json();
      }
    } catch (err) {
      fetchError = err;
    }

    let rawVideos = [];
    let metadata = {};

    if (payload) {
      const possibleLists = [
        payload.videos,
        payload.data,
        payload.results,
        payload.trailers,
        payload.items,
        payload.data?.videos,
      ];
      rawVideos = Array.isArray(payload)
        ? payload
        : possibleLists.find(Array.isArray) || (payload.youtube_video_id ? [payload] : []);

      // Support associative numeric objects { "0": {...}, "1": {...}, "_metadata": {...} }
      if (!rawVideos.length && typeof payload === "object" && payload !== null) {
        rawVideos = Object.entries(payload)
          .filter(([key, val]) => key !== "_metadata" && key !== "metadata" && val && typeof val === "object" && (val.youtube_video_id || val.id))
          .map(([, val]) => val);
      }
      metadata = payload._metadata || payload.metadata || payload.data?._metadata || {};
    }

    const allowedCategories = CATEGORY_FILTERS[safeCategory]?.split(",") || null;
    let videos = rawVideos
      .map(normalizeVideo)
      .filter(Boolean)
      .filter((video) => !allowedCategories || video.categories.some((item) => allowedCategories.includes(item)));

    const fallbackService = getTmdbService();

    // Enhance videos: Replace regional/geo-blocked channel keys with official global studio trailers from TMDB
    if (fallbackService && videos.length) {
      videos = await Promise.all(videos.map(async (v) => {
        if (!v.tmdbId) return v;
        try {
          const details = v.mediaType === "tv"
            ? await fallbackService.getTVShowDetails(v.tmdbId)
            : await fallbackService.getMovieDetails(v.tmdbId);
          if (details?.trailerKey) {
            return {
              ...v,
              youtubeVideoId: details.trailerKey,
              kinoCheckVideoId: v.youtubeVideoId,
              thumbnail: details.backdrop || details.poster || v.thumbnail,
            };
          }
        } catch (_) {}
        return v;
      }));
    }

    // In "All videos" mode, blend YouTube trailers with GIPHY movie moments for maximum variety
    if (safeCategory === "all" && videos.length) {
      const giphy = getGiphyService();
      if (giphy) {
        try {
          const momentsData = await giphy.getMovieMoments({ page: safePage, limit: Math.min(6, Math.floor(requestedLimit / 2)) });
          if (momentsData?.videos?.length) {
            const interleaved = [];
            const moments = [...momentsData.videos];
            videos.forEach((v) => {
              interleaved.push(v);
              if (moments.length) interleaved.push(moments.shift());
            });
            videos = interleaved.slice(0, requestedLimit);
          }
        } catch (_) {}
      }
    }

    // Graceful fallback to TMDB / local catalogue trailers if KinoCheck returns empty or fails
    if (!videos.length) {
      if (fallbackService?.getMovieReels) {
        try {
          const offset = (safePage - 1) * requestedLimit;
          const fallbackData = await fallbackService.getMovieReels(offset, requestedLimit);
          if (fallbackData?.reels?.length) {
            videos = fallbackData.reels.map((reel) => normalizeVideo({
              ...reel,
              youtube_video_id: reel.trailerKey,
              title: reel.videoName || `${reel.title} Trailer`,
              movieTitle: reel.title,
              categories: reel.videoType ? [reel.videoType] : ["Trailer"],
              thumbnail: reel.backdrop || reel.poster,
              resource: { tmdb_id: reel.id, type: reel.isTV ? "show" : "movie" },
            })).filter(Boolean);
            metadata.total_pages = Math.ceil((fallbackData.totalTitles || 100) / requestedLimit);
            metadata.total_count = fallbackData.totalTitles || 100;
          }
        } catch (fbErr) {
          console.error("TMDB fallback reels error:", fbErr.message);
        }
      }
    }

    if (!videos.length && fetchError) {
      throw fetchError;
    }

    const totalPages = Math.max(safePage, Number(metadata.total_pages || payload?.total_pages || safePage));
    const result = {
      videos,
      page: safePage,
      totalPages,
      totalCount: Number(metadata.total_count || payload?.total_count || videos.length),
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
