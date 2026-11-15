const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WYZIE_API_KEY = import.meta.env.VITE_WYZIE_API_KEY || "wyzie-c10stg8qh38nxmr7b2wmuqy7stqldrub";

export async function searchWyzieSubtitles({ id, season, episode, language = "en", signal }) {
  // If a dedicated backend proxy is available, attempt it first
  if (API_BASE_URL) {
    try {
      const params = new URLSearchParams({ id: String(id || ""), language });
      if (season != null && episode != null) {
        params.set("season", String(season));
        params.set("episode", String(episode));
      }
      const response = await fetch(`${API_BASE_URL}/subtitles/search?${params.toString()}`, { signal });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.subtitles) && result.subtitles.length > 0) {
          return result.subtitles;
        }
      }
    } catch (_) {
      // Fallback to direct Wyzie API
    }
  }

  // Direct high-performance Wyzie search (CORS-enabled for frontend web clients)
  const wyzieParams = new URLSearchParams({
    id: String(id || ""),
    language,
    format: "srt,vtt",
    encoding: "utf-8",
    key: WYZIE_API_KEY,
  });
  if (season != null && episode != null) {
    wyzieParams.set("season", String(season));
    wyzieParams.set("episode", String(episode));
  }

  const response = await fetch(`https://sub.wyzie.io/search?${wyzieParams.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Wyzie daily request limit reached. Please try again later.");
    }
    throw new Error("Could not find subtitles for this title right now.");
  }

  const payload = await response.json();
  const rawTracks = Array.isArray(payload)
    ? payload
    : payload.subtitles || payload.results || payload.data || [];

  return (Array.isArray(rawTracks) ? rawTracks : [])
    .filter((track) => track && typeof track.url === "string")
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
}

export async function downloadWyzieSubtitle(url, signal) {
  // Direct fetch from Wyzie temporary link (CORS-enabled, returns plain srt/vtt text)
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Could not load this subtitle file.");
  }
  return response.text();
}

