import mongoose from 'mongoose';
import { logger } from './logger.js';
import { config } from './config.js';

export async function connectDb() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  await mongoose.connect(config.MONGODB_URI);
  logger.info({ uri: config.MONGODB_URI }, 'Connected to MongoDB');
}
