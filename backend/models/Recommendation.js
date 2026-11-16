const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  recommendedMovies: [
    {
      id: String,
      tmdbId: String,
      title: String,
      poster: String,
      backdrop: String,
      year: String,
      rating: String,
      genre: String,
      genres: [String],
      duration: String,
      description: String,
      mediaType: String,
      isTV: Boolean,
      score: Number,
      lastRecommended: { type: Date, default: Date.now },
    },
  ],
  lastUpdated: { type: Date, default: Date.now },
});

const Recommendation = mongoose.model('Recommendation', RecommendationSchema);

module.exports = Recommendation;
