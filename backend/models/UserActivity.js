const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  tmdbId: { type: String, required: true },
  title: { type: String },
  mediaType: { type: String, enum: ['movie', 'tv'] },
  genres: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserActivity', userActivitySchema);
