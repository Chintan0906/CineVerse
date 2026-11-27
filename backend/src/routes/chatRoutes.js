const express = require("express");
const router = express.Router();

const TMDB_PRIMARY = "https://api.tmdb.org/3";
const TMDB_FALLBACK = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const GENRE_KEYWORDS = [
  { keys: ["horror", "scary", "ghost", "slasher", "haunted"], id: 27, name: "Horror" },
  { keys: ["sci-fi", "scifi", "science fiction", "space", "cyberpunk", "time travel"], id: 878, tvId: 10765, name: "Sci-Fi" },
  { keys: ["action", "fight", "superhero", "martial"], id: 28, tvId: 10759, name: "Action" },
  { keys: ["comedy", "funny", "laugh", "sitcom"], id: 35, name: "Comedy" },
  { keys: ["thriller", "suspense", "psychological"], id: 53, name: "Thriller" },
  { keys: ["romance", "romantic", "love"], id: 10749, name: "Romance" },
  { keys: ["drama"], id: 18, name: "Drama" },
  { keys: ["anime", "japanese animation"], id: 16, name: "Anime", isAnime: true },
  { keys: ["animation", "animated", "cartoon"], id: 16, name: "Animation" },
  { keys: ["crime", "detective", "gangster", "mafia", "heist"], id: 80, name: "Crime" },
  { keys: ["fantasy", "magic", "dragon"], id: 14, tvId: 10765, name: "Fantasy" },
  { keys: ["mystery", "whodunit"], id: 9648, name: "Mystery" },
  { keys: ["adventure"], id: 12, tvId: 10759, name: "Adventure" },
  { keys: ["documentary", "docuseries"], id: 99, name: "Documentary" },
];

async function tmdbFetch(path, params = {}) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const qs = new URLSearchParams({ api_key: apiKey, language: "en-US", ...params });
  const tryBase = async (base) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    try {
      const res = await fetch(`${base}/${path}?${qs.toString()}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      clearTimeout(timer);
      return null;
    }
  };

  return (await tryBase(TMDB_PRIMARY)) || (await tryBase(TMDB_FALLBACK));
}

function normalizeCard(item, forcedType) {
  if (!item || !item.id) return null;
  const mediaType = forcedType || (item.media_type === "tv" || (!item.title && item.name) ? "tv" : "movie");
  if (mediaType === "person") return null;
  const date = item.release_date || item.first_air_date || "";
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: item.title || item.name || "Untitled",
    year: date ? date.slice(0, 4) : "",
    rating: item.vote_average ? Number(item.vote_average).toFixed(1) : "",
    overview: item.overview || "",
    poster: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : "",
    backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${item.backdrop_path}` : "",
    mediaType,
    isTV: mediaType === "tv",
  };
}

function extractTitleCandidates(text) {
  if (!text || typeof text !== "string") return [];
  const candidates = [];
  const seen = new Set();
  const add = (raw) => {
    const cleaned = String(raw || "")
      .replace(/\(\d{4}\)/g, "")
      .replace(/^["'“”*]+|["'“”*:.-]+$/g, "")
      .trim();
    if (cleaned.length >= 2 && cleaned.length <= 70 && !seen.has(cleaned.toLowerCase())) {
      seen.add(cleaned.toLowerCase());
      candidates.push(cleaned);
    }
  };

  // Match bold titles (**Title**) or numbered/bulleted list titles (1. Title (2020) - ...)
  const boldMatches = text.matchAll(/\*\*([^*]{2,65})\*\*/g);
  for (const m of boldMatches) add(m[1]);

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const listMatch = line.match(/^\s*(?:\d+[.)]|[-*•])\s+([^–—:\n]{2,65})/);
    if (listMatch) add(listMatch[1]);
  }

  return candidates.slice(0, 10);
}

async function resolveTitlesToMovies(items = []) {
  const resolved = [];
  const seen = new Set();

  await Promise.all(
    items.slice(0, 10).map(async (entry) => {
      const title = typeof entry === "string" ? entry : entry?.title || entry?.name;
      const tmdbId = typeof entry === "object" ? entry?.tmdbId || entry?.id : null;
      if (tmdbId && typeof entry === "object" && entry?.poster) {
        if (!seen.has(String(tmdbId))) {
          seen.add(String(tmdbId));
          resolved.push(entry);
        }
        return;
      }
      if (!title) return;
      const data = await tmdbFetch("search/multi", { query: title, include_adult: "false" });
      const match = (data?.results || []).find(
        (r) => r && (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
      );
      if (match) {
        const card = normalizeCard(match);
        if (card && !seen.has(card.id)) {
          seen.add(card.id);
          resolved.push(card);
        }
      }
    })
  );

  return resolved;
}

async function buildTmdbFallbackReply(userMessage) {
  const q = String(userMessage || "").trim();
  const qLower = q.toLowerCase();

  const wantsTv = /\b(series|tv|show|shows|anime|kdrama|season|episodes)\b/i.test(qLower);
  const countMatch = qLower.match(/\btop\s+(\d{1,2})\b/);
  const limit = countMatch ? Math.min(Math.max(Number(countMatch[1]), 3), 10) : 8;

  const matchedGenre = GENRE_KEYWORDS.find((g) => g.keys.some((k) => qLower.includes(k)));
  const isLikeQuery = /\b(?:like|similar to)\b/i.test(qLower);
  const aboutMatch = !isLikeQuery
    ? q.match(/(?:tell me about|more about|info(?:rmation)? (?:on|about)|what is|about)\s+["']?([^?!.\n]{2,65})["']?/i)
    : null;
  const likeMatch = isLikeQuery
    ? q.match(/(?:like|similar to)\s+["']?([^?!.\n]{2,55})["']?/i)
    : null;

  // 0. "Tell me about <title>" -> Rich info text + ONLY that 1 particular movie/series card
  if (aboutMatch) {
    const targetTitle = aboutMatch[1].replace(/\babout\s*$/i, "").trim();
    const searchRes = await tmdbFetch("search/multi", { query: targetTitle, include_adult: "false" });
    const seed = (searchRes?.results || []).find(
      (r) => r && (r.media_type === "movie" || r.media_type === "tv")
    );
    if (seed) {
      const isTv = seed.media_type === "tv";
      const details = await tmdbFetch(`${isTv ? "tv" : "movie"}/${seed.id}`, {
        append_to_response: "credits",
      });
      const sourceObj = details || seed;
      const seedCard = normalizeCard(sourceObj, isTv ? "tv" : "movie");
      const genreNames = Array.isArray(details?.genres)
        ? details.genres.map((g) => g.name).filter(Boolean).slice(0, 3).join(", ")
        : "";
      const runtimeText = isTv
        ? details?.number_of_seasons
          ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? "s" : ""}`
          : ""
        : details?.runtime
        ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
        : "";
      const castNames = Array.isArray(details?.credits?.cast)
        ? details.credits.cast.slice(0, 4).map((c) => c.name).filter(Boolean).join(", ")
        : "";

      const metaParts = [
        seedCard.year || null,
        seedCard.rating ? `★ ${seedCard.rating}/10` : null,
        runtimeText || null,
        genreNames || null,
      ].filter(Boolean);

      const lines = [
        `${seedCard.title}${metaParts.length ? ` (${metaParts.join(" · ")})` : ""}`,
        seedCard.overview || "Click below to view full details or start streaming.",
        castNames ? `Cast: ${castNames}` : null,
      ].filter(Boolean);

      return {
        reply: lines.join("\n\n"),
        movies: [seedCard],
        source: "tmdb-assistant",
      };
    }
  }

  // 1. "Movies like X"
  if (likeMatch) {
    const targetTitle = likeMatch[1].trim();
    const searchRes = await tmdbFetch("search/multi", { query: targetTitle, include_adult: "false" });
    const seed = (searchRes?.results || []).find(
      (r) => r && (r.media_type === "movie" || r.media_type === "tv")
    );
    if (seed) {
      const isTv = seed.media_type === "tv";
      const recRes = await tmdbFetch(`${isTv ? "tv" : "movie"}/${seed.id}/recommendations`);
      const recs = (recRes?.results || [])
        .filter((r) => r && r.poster_path)
        .slice(0, limit)
        .map((r) => normalizeCard(r, isTv ? "tv" : "movie"))
        .filter(Boolean);

      const seedCard = normalizeCard(seed, isTv ? "tv" : "movie");
      if (recs.length > 0) {
        return {
          reply: `Here are top recommendations similar to ${seedCard.title} — click any card to view details or stream:`,
          movies: recs,
          source: "tmdb-assistant",
        };
      }
    }
  }

  // 2. Genre / Anime / Top N query
  if (matchedGenre) {
    const wantsMoviesExplicitly = /\b(movie|movies|film|films)\b/i.test(qLower);
    const mediaType = wantsMoviesExplicitly
      ? "movie"
      : matchedGenre.isAnime || wantsTv
      ? "tv"
      : "movie";
    const genreId = mediaType === "tv" ? matchedGenre.tvId || matchedGenre.id : matchedGenre.id;
    const discoverParams = {
      with_genres: String(genreId),
      sort_by: qLower.includes("top") || qLower.includes("best") ? "vote_average.desc" : "popularity.desc",
      "vote_count.gte": matchedGenre.isAnime ? "250" : "400",
      page: "1",
    };
    if (matchedGenre.isAnime) {
      discoverParams.with_original_language = "ja";
    }
    const data = await tmdbFetch(`discover/${mediaType}`, discoverParams);
    const movies = (data?.results || [])
      .filter((r) => r && r.poster_path)
      .slice(0, limit)
      .map((r) => normalizeCard(r, mediaType))
      .filter(Boolean);

    if (movies.length > 0) {
      return {
        reply: `Here are the top ${movies.length} ${matchedGenre.name} ${mediaType === "tv" ? "series" : "movies"} — click any title to stream:`,
        movies,
        source: "tmdb-assistant",
      };
    }
  }

  // 3. Trending / General search
  if (/\b(trending|popular|recommend|suggest|what to watch)\b/i.test(qLower)) {
    const data = await tmdbFetch(`trending/${wantsTv ? "tv" : "all"}/week`);
    const movies = (data?.results || [])
      .filter((r) => r && r.poster_path && r.media_type !== "person")
      .slice(0, limit)
      .map((r) => normalizeCard(r, wantsTv ? "tv" : undefined))
      .filter(Boolean);
    return {
      reply: `Here are ${movies.length} trending picks on CineVerse — click any title to watch:`,
      movies,
      source: "tmdb-assistant",
    };
  }

  // 4. Direct title search fallback
  const searchData = await tmdbFetch("search/multi", { query: q, include_adult: "false" });
  const matches = (searchData?.results || [])
    .filter((r) => r && (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
    .slice(0, limit)
    .map((r) => normalizeCard(r))
    .filter(Boolean);

  if (matches.length > 0) {
    return {
      reply: `Here is what I found for "${q}" — click any title for details or instant streaming:`,
      movies: matches,
      source: "tmdb-assistant",
    };
  }

  return {
    reply: `I couldn't find exact matches for "${q}". Try asking for a genre like "top 10 horror movies", "best sci-fi series", or "movies like Interstellar".`,
    movies: [],
    source: "tmdb-assistant",
  };
}

router.post("/", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const sessionId = String(req.body?.sessionId || "cineverse-guest");
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

  if (!message) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

  if (n8nWebhookUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const n8nRes = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: message,
          message,
          query: message,
          sessionId,
          history,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (n8nRes.ok) {
        const rawText = await n8nRes.text();
        let parsed = null;
        try {
          parsed = JSON.parse(rawText);
        } catch (_) {
          parsed = null;
        }

        const payload = Array.isArray(parsed) ? parsed[0] : parsed;
        const inner =
          payload?.movies && typeof payload.movies === "object" && !Array.isArray(payload.movies) && payload.movies.type
            ? payload.movies
            : payload;

        // Handle CineSphere n8n structured output:
        // { movies: { type: "movies" | "details" | "text", ... } }
        if (inner && typeof inner === "object" && inner.type) {
          if (inner.type === "details" && inner.title) {
            const meta = [inner.year, inner.genre].filter(Boolean).join(" · ");
            const castLine = Array.isArray(inner.cast) && inner.cast.length > 0
              ? `Cast: ${inner.cast.join(", ")}`
              : null;
            const dirLine = inner.director ? `Director: ${inner.director}` : null;
            const replyText = [
              `${inner.title}${meta ? ` (${meta})` : ""}`,
              inner.summary || "",
              [dirLine, castLine].filter(Boolean).join("\n"),
            ]
              .filter(Boolean)
              .join("\n\n");
            const movies = await resolveTitlesToMovies([inner.title]);
            return res.json({
              success: true,
              reply: replyText,
              movies: movies.slice(0, 1),
              source: "n8n",
            });
          }

          if (inner.type === "movies" && Array.isArray(inner.movies)) {
            const list = inner.movies;
            const lines = list
              .map((m, idx) => {
                const name = m?.name || m?.title || "";
                const reason = m?.reason ? ` — ${m.reason}` : "";
                return name ? `${idx + 1}. ${name}${reason}` : null;
              })
              .filter(Boolean);
            const replyText = lines.length
              ? `Here are my picks — click any card to stream:\n\n${lines.join("\n")}`
              : "Here are my recommendations:";
            const movies = await resolveTitlesToMovies(list);
            return res.json({
              success: true,
              reply: replyText,
              movies,
              source: "n8n",
            });
          }

          if (inner.type === "text" && inner.message) {
            return res.json({
              success: true,
              reply: String(inner.message).trim(),
              movies: [],
              source: "n8n",
            });
          }
        }

        const replyText =
          (typeof payload === "string" ? payload : null) ||
          payload?.reply ||
          payload?.output ||
          payload?.text ||
          payload?.response ||
          payload?.message ||
          rawText ||
          "Here are my recommendations:";

        const explicitMovies = Array.isArray(payload?.movies) ? payload.movies : [];
        const extractedTitles = explicitMovies.length > 0 ? explicitMovies : extractTitleCandidates(replyText);
        const movies = await resolveTitlesToMovies(extractedTitles);

        return res.json({
          success: true,
          reply: String(replyText).trim(),
          movies,
          source: "n8n",
        });
      }
    } catch (err) {
      console.warn("n8n webhook failed, falling back to TMDB assistant:", err.message);
    }
  }

  try {
    const fallback = await buildTmdbFallbackReply(message);
    return res.json({
      success: true,
      ...fallback,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      reply: "CineBot is temporarily unavailable. Please try again in a moment.",
      movies: [],
    });
  }
});

module.exports = router;
