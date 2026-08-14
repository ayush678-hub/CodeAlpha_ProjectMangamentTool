import Redis from 'ioredis';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export const redis =
  globalThis.__redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

if (env.NODE_ENV !== 'production') {
  globalThis.__redis = redis;
}

// Helper functions
export const getCache = async <T>(key: string): Promise<T | null> => {
  const val = await redis.get(key);
  return val ? (JSON.parse(val) as T) : null;
};

export const setCache = async (key: string, value: unknown, ttlSeconds = 300): Promise<void> => {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

export const delCache = async (...keys: string[]): Promise<void> => {
  if (keys.length > 0) await redis.del(...keys);
};

export const CACHE_KEYS = {
  userProfile: (id: string) => `user:${id}`,
  projectMembers: (projectId: string) => `project:${projectId}:members`,
  projectLabels: (projectId: string) => `project:${projectId}:labels`,
  unreadCount: (userId: string) => `notif:unread:${userId}`,
};

export default redis;
