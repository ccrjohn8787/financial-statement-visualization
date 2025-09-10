import { createClient } from 'redis';

// In-memory cache fallback for development when Redis is unavailable
class MemoryCache {
  private cache = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    const expiry = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  // Cleanup expired items periodically
  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  constructor() {
    // Run cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
}

// Try to create Redis client, fallback to memory cache
let client: any;
let isRedisAvailable = false;
let memoryCache: MemoryCache;

const tryConnectRedis = async () => {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    redisClient.on('error', (err) => {
      console.warn('Redis Client Error (falling back to memory cache):', err.message);
      isRedisAvailable = false;
    });

    await redisClient.connect();
    console.log('✅ Connected to Redis');
    return redisClient;
  } catch (error) {
    console.warn('⚠️  Redis unavailable, using in-memory cache for development');
    return null;
  }
};

export const connectRedis = async () => {
  if (!client) {
    client = await tryConnectRedis();
    
    if (!client) {
      // Fallback to memory cache
      isRedisAvailable = false;
      memoryCache = new MemoryCache();
      console.log('📝 Using in-memory cache (development mode)');
    } else {
      isRedisAvailable = true;
    }
  }
  
  return client;
};

// Export a unified cache interface
export const cache = {
  async get(key: string): Promise<string | null> {
    if (isRedisAvailable && client) {
      return await client.get(key);
    } else {
      return await memoryCache.get(key);
    }
  },

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    if (isRedisAvailable && client) {
      if (options?.EX) {
        await client.setEx(key, options.EX, value);
      } else {
        await client.set(key, value);
      }
    } else {
      await memoryCache.set(key, value, options);
    }
  },

  async del(key: string): Promise<void> {
    if (isRedisAvailable && client) {
      await client.del(key);
    } else {
      await memoryCache.del(key);
    }
  },

  async ping(): Promise<string> {
    if (isRedisAvailable && client) {
      return await client.ping();
    } else {
      return await memoryCache.ping();
    }
  }
};

export { client as redis };