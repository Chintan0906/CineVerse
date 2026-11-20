let consumetModule = null;

async function getConsumet() {
  if (!consumetModule) {
    consumetModule = await import("@consumet/extensions");
  }
  return consumetModule;
}

/**
 * Extract streaming source for a movie or TV show using Consumet's FlixHQ provider
 */
async function getFlixHQStream(title, releaseYear, isTv = false, season = 1, episode = 1) {
  try {
    const { MOVIES } = await getConsumet();
    const flixhq = new MOVIES.FlixHQ();

    // 1. Search for title
    const searchRes = await flixhq.search(title);
    if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
      return null;
    }

    // 2. Find best match (matching year if available)
    const mediaType = isTv ? "TV Series" : "Movie";
    const candidate =
      searchRes.results.find(
        (m) =>
          (m.type === mediaType || !m.type) &&
          (!releaseYear || m.releaseDate?.includes(String(releaseYear)))
      ) || searchRes.results[0];

    if (!candidate || !candidate.id) {
      return null;
    }

    // 3. Get media info (episodes list)
    const mediaInfo = await flixhq.fetchMediaInfo(candidate.id);
    if (!mediaInfo || !mediaInfo.episodes || mediaInfo.episodes.length === 0) {
      return null;
    }

    // 4. Find target episode
    let targetEpisode = mediaInfo.episodes[0];
    if (isTv) {
      targetEpisode =
        mediaInfo.episodes.find(
          (ep) =>
            Number(ep.season) === Number(season) &&
            Number(ep.number) === Number(episode)
        ) || mediaInfo.episodes[0];
    }

    if (!targetEpisode || !targetEpisode.id) {
      return null;
    }

    // 5. Fetch stream sources (returns direct .m3u8 and subtitles)
    const sources = await flixhq.fetchEpisodeSources(targetEpisode.id, candidate.id);
    return sources;
  } catch (error) {
    console.warn("Consumet FlixHQ fetch warning:", error.message);
    return null;
  }
}

module.exports = {
  getConsumet,
  getFlixHQStream,
};
