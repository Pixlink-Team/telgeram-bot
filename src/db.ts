import mongoose from 'mongoose';
import { logger } from './logger';
import { config } from './config';

export async function connectDb() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  await mongoose.connect(config.MONGODB_URI);
  logger.info({ uri: config.MONGODB_URI }, 'Connected to MongoDB');
}
