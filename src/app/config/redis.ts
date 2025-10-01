import { createClient } from 'redis';
import { env } from '.';

export const redisClient = createClient({
  url: env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));