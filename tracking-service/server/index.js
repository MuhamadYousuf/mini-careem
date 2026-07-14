// Production entry point: wire a real Redis client into the app and listen.
const Redis = require('ioredis');
const { createApp } = require('./app');

const port = process.env.PORT || 8083;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl);
const app = createApp(redis);

app.listen(port, () => {
  console.log(`Tracking service listening on :${port}`);
});
