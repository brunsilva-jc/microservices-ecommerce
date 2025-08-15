import mongoose from 'mongoose';
import { config } from '../config';
import { Logger } from '../utils/logger';

const log = new Logger('MongoDB');

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    
    log.info('MongoDB connected successfully');
    
    mongoose.connection.on('error', (error) => {
      log.error('MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      log.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    log.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    log.info('MongoDB disconnected');
  } catch (error) {
    log.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}