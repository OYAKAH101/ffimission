import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';

mongoose.set('strictQuery', true);
await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
console.log('Connected to MongoDB.');

// Make sure the unique/lookup indexes exist before taking requests.
await mongoose.syncIndexes();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`School portal API listening on port ${config.port} (${config.env}).`);
});

const shutdown = async () => {
  server.close();
  await mongoose.disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
