const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse';

const connectDB = async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB connection warning:', err.message, '- Continuing in catalog-only mode');
  }
};

module.exports = connectDB;
