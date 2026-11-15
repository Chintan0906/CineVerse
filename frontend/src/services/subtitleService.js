const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function searchWyzieSubtitles({ id, season, episode, language = "en", signal }) {
  const params = new URLSearchParams({ id: String(id || ""), language });
  if (season != null && episode != null) {
    params.set("season", String(season));
    params.set("episode", String(episode));
  }

  const response = await fetch(`${API_BASE_URL}/subtitles/search?${params.toString()}`, { signal });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Subtitle search failed.");
  }
  return result.subtitles || [];
}

export async function downloadWyzieSubtitle(url, signal) {
  const response = await fetch(`${API_BASE_URL}/subtitles/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || "Could not load this subtitle file.");
  }
  return response.text();
}
