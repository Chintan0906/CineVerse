const UserActivity = require('../models/UserActivity');
const tmdbService = require('./tmdbService');

async function recordActivity(userId, media) {
  try {
    const activity = new UserActivity({
      userId,
      tmdbId: media.id || media.tmdbId,
      title: media.title || media.name,
      mediaType: media.mediaType || (media.isTV ? 'tv' : 'movie'),
      genres: media.genres || []
    });
    await activity.save();
  } catch (error) {
    console.error('Error recording activity:', error.message);
  }
}

async function getCuratedRecommendations(userId) {
  try {
    // Get last 10 activities to analyze preferences
    const recentActivity = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10);

    if (recentActivity.length === 0) {
      // Fallback to trending if no activity
      const catalogue = await tmdbService.getNetflixCatalogue();
      return catalogue.featuredMovies.slice(0, 10);
    }

    // Count genre frequency
    const genreCounts = {};
    recentActivity.forEach(activity => {
      activity.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    // Find top genre
    let topGenre = 'Action';
    let maxCount = 0;
    for (const [genre, count] of Object.entries(genreCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topGenre = genre;
      }
    }

    // Fetch recommendations based on the most frequent media type and top genre
    const mostRecent = recentActivity[0];
    const recommendations = await tmdbService.discoverByGenre(topGenre);

    // Mix in some recommendations from the most recently watched title
    const specificRecs = await tmdbService.getMovieRecommendations(mostRecent.tmdbId, mostRecent.mediaType);

    // Combine and deduplicate
    const combined = [...specificRecs, ...recommendations];
    const seen = new Set();
    const result = [];

    for (const item of combined) {
      if (!seen.has(String(item.id)) && !recentActivity.some(a => String(a.tmdbId) === String(item.id))) {
        seen.add(String(item.id));
        result.push(item);
        if (result.length >= 20) break;
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting recommendations:', error.message);
    return [];
  }
}

module.exports = {
  recordActivity,
  getCuratedRecommendations
};
