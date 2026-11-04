import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cineverse.library.v1";
const CHANGE_EVENT = "cineverse:library-change";

function deduplicateHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  const map = new Map();
  const titleMap = new Set();
  // Sort by watchedAt descending so the newest/latest watched episode comes first
  const sorted = [...rawHistory].sort(
    (a, b) => (Number(b.watchedAt) || 0) - (Number(a.watchedAt) || 0)
  );
  for (const item of sorted) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.tmdbId || item.id || "").trim();
    const titleKey = String(item.title || item.name || "").trim().toLowerCase();
    const key = id || titleKey;
    if (!key) continue;

    // Check both ID and normalized title to guarantee zero duplicates
    if (!map.has(key) && (!titleKey || !titleMap.has(titleKey))) {
      map.set(key, {
        ...item,
        id: id || item.id,
        tmdbId: id || item.tmdbId,
        key,
      });
      if (titleKey) titleMap.add(titleKey);
    }
  }
  return Array.from(map.values());
}

function readLibrary() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const saved = JSON.parse(raw || "{}");
    const rawHistory = Array.isArray(saved.history) ? saved.history : [];
    const cleanHistory = deduplicateHistory(rawHistory);
    // Automatically sanitize and persist if duplicates were found
    if (rawHistory.length !== cleanHistory.length) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...saved,
          history: cleanHistory,
        })
      );
    }
    return {
      watchlist: Array.isArray(saved.watchlist) ? saved.watchlist : [],
      history: cleanHistory,
    };
  } catch {
    return { watchlist: [], history: [] };
  }
}

function mediaSnapshot(media) {
  if (!media || typeof media !== "object") return null;
  const id = String(media.tmdbId || media.id || "").trim();
  if (!id) return null;

  return {
    id,
    tmdbId: id,
    title: media.title || media.name || "Untitled",
    poster: media.poster || "",
    backdrop: media.backdrop || media.poster || "",
    year: media.year || "",
    rating: media.rating || "",
    genre: media.genre || media.genres?.[0] || "",
    genres: Array.isArray(media.genres) ? media.genres : [],
    duration: media.duration || "",
    mediaType: media.mediaType === "tv" || media.isTV ? "tv" : "movie",
    isTV: media.mediaType === "tv" || Boolean(media.isTV),
    season: media.season || 1,
    episode: media.episode || 1,
  };
}

function publishLibrary(library) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (error) {
    console.error("Unable to save CineVerse library:", error);
  }
}

export function useLibrary() {
  const [library, setLibrary] = useState(readLibrary);

  useEffect(() => {
    const refresh = () => setLibrary(readLibrary());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const update = useCallback((transform) => {
    const next = transform(readLibrary());
    publishLibrary(next);
    setLibrary(next);
  }, []);

  const toggleWatchlist = useCallback((mediaOrId) => {
    const media = mediaSnapshot(mediaOrId);
    const id = String(
      typeof mediaOrId === "object" ? mediaOrId?.tmdbId || mediaOrId?.id || "" : mediaOrId || ""
    );
    if (!/^\d+$/.test(id)) return;

    update((current) => {
      const exists = current.watchlist.some((item) => String(item.id) === id);
      const item = media || { id, tmdbId: id, title: "Saved title" };
      return {
        ...current,
        watchlist: exists
          ? current.watchlist.filter((saved) => String(saved.id) !== id)
          : [item, ...current.watchlist],
      };
    });
  }, [update]);

  const recordPlay = useCallback((media, episode = {}) => {
    const snapshot = mediaSnapshot(media);
    if (!snapshot) return;
    const mediaId = snapshot.id;
    const titleLower = String(snapshot.title || "").trim().toLowerCase();

    update((current) => {
      const existing = current.history.find(
        (item) =>
          String(item.tmdbId || item.id) === mediaId ||
          (titleLower && String(item.title || "").trim().toLowerCase() === titleLower)
      );
      const s = Number(episode.season || snapshot.season || existing?.season || 1);
      const e = Number(episode.episode || snapshot.episode || existing?.episode || 1);

      const nextItem = {
        ...existing,
        ...snapshot,
        ...episode,
        id: mediaId,
        tmdbId: mediaId,
        key: mediaId,
        season: s,
        episode: e,
        watchedAt: Date.now(),
        currentTime: existing?.currentTime || 0,
        durationSeconds: existing?.durationSeconds || 0,
        progressPercent: existing?.progressPercent || 0,
      };

      // Ensure single card per title - remove any other entries for this title or ID
      const remaining = current.history.filter(
        (item) =>
          String(item.tmdbId || item.id) !== mediaId &&
          (!titleLower || String(item.title || "").trim().toLowerCase() !== titleLower)
      );

      return {
        ...current,
        history: [nextItem, ...remaining].slice(0, 60),
      };
    });
  }, [update]);

  const saveProgress = useCallback((media, currentTime, duration, episode = {}) => {
    const snapshot = mediaSnapshot(media);
    const watched = Number(currentTime);
    const total = Number(duration);
    if (!snapshot || !Number.isFinite(watched) || !Number.isFinite(total) || total <= 0) return;
    const mediaId = snapshot.id;
    const titleLower = String(snapshot.title || "").trim().toLowerCase();

    update((current) => {
      const existing = current.history.find(
        (item) =>
          String(item.tmdbId || item.id) === mediaId ||
          (titleLower && String(item.title || "").trim().toLowerCase() === titleLower)
      );
      const s = Number(episode.season || snapshot.season || existing?.season || 1);
      const e = Number(episode.episode || snapshot.episode || existing?.episode || 1);
      const progressPercent = Math.min(100, Math.round((watched / total) * 100));

      const nextItem = {
        ...existing,
        ...snapshot,
        ...episode,
        id: mediaId,
        tmdbId: mediaId,
        key: mediaId,
        season: s,
        episode: e,
        currentTime: watched,
        durationSeconds: total,
        progressPercent,
        completed: progressPercent >= 95,
        watchedAt: Date.now(),
      };

      // Ensure single card per title - remove any other entries for this title or ID
      const remaining = current.history.filter(
        (item) =>
          String(item.tmdbId || item.id) !== mediaId &&
          (!titleLower || String(item.title || "").trim().toLowerCase() !== titleLower)
      );

      return {
        ...current,
        history: [nextItem, ...remaining].slice(0, 60),
      };
    });
  }, [update]);

  const clearHistory = useCallback(() => {
    update((current) => ({ ...current, history: [] }));
  }, [update]);

  return {
    watchlist: library.watchlist,
    history: library.history,
    toggleWatchlist,
    recordPlay,
    saveProgress,
    clearHistory,
  };
}
