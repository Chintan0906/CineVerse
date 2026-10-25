import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cineverse.library.v1";
const CHANGE_EVENT = "cineverse:library-change";

function readLibrary() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      watchlist: Array.isArray(saved.watchlist) ? saved.watchlist : [],
      history: Array.isArray(saved.history) ? saved.history : [],
    };
  } catch {
    return { watchlist: [], history: [] };
  }
}

function mediaSnapshot(media) {
  if (!media || typeof media !== "object") return null;
  const id = String(media.tmdbId || media.id || "");
  if (!/^\d+$/.test(id)) return null;

  return {
    id,
    tmdbId: id,
    title: media.title || "Untitled",
    poster: media.poster || "",
    backdrop: media.backdrop || media.poster || "",
    year: media.year || "",
    rating: media.rating || "",
    genre: media.genre || media.genres?.[0] || "",
    genres: Array.isArray(media.genres) ? media.genres : [],
    duration: media.duration || "",
    mediaType: media.mediaType === "tv" || media.isTV ? "tv" : "movie",
    isTV: media.mediaType === "tv" || Boolean(media.isTV),
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
    const key = `${snapshot.id}:${episode.season || ""}:${episode.episode || ""}`;

    update((current) => {
      const existing = current.history.find((item) => item.key === key);
      const nextItem = {
        ...existing,
        ...snapshot,
        ...episode,
        key,
        watchedAt: Date.now(),
        currentTime: existing?.currentTime || 0,
        durationSeconds: existing?.durationSeconds || 0,
        progressPercent: existing?.progressPercent || 0,
      };
      return {
        ...current,
        history: [nextItem, ...current.history.filter((item) => item.key !== key)].slice(0, 60),
      };
    });
  }, [update]);

  const saveProgress = useCallback((media, currentTime, duration, episode = {}) => {
    const snapshot = mediaSnapshot(media);
    const watched = Number(currentTime);
    const total = Number(duration);
    if (!snapshot || !Number.isFinite(watched) || !Number.isFinite(total) || total <= 0) return;
    const key = `${snapshot.id}:${episode.season || ""}:${episode.episode || ""}`;

    update((current) => {
      const existing = current.history.find((item) => item.key === key);
      const progressPercent = Math.min(100, Math.round((watched / total) * 100));
      const nextItem = {
        ...existing,
        ...snapshot,
        ...episode,
        key,
        currentTime: watched,
        durationSeconds: total,
        progressPercent,
        completed: progressPercent >= 95,
        watchedAt: Date.now(),
      };
      return {
        ...current,
        history: [nextItem, ...current.history.filter((item) => item.key !== key)].slice(0, 60),
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
