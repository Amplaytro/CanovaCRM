const mongoose = require('mongoose');

const isLocalMongoUri = (uri) => (
  /^mongodb:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(uri || '')
);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not configured');
    }

    if (process.env.NODE_ENV === 'production' && isLocalMongoUri(mongoUri)) {
      throw new Error('Production MONGODB_URI must point to a deployed MongoDB instance, not localhost');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
