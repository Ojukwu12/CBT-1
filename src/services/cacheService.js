const Logger = require('../utils/logger');
const { env } = require('../config/env');

const logger = new Logger('CacheService');

class CacheService {
  constructor() {
    this.redisClient = null;
    this.isRedisEnabled = Boolean(env.REDIS_URL || env.REDIS_HOST);
    this.memoryCache = new Map();
    this.defaultTTL = env.CACHE_DEFAULT_TTL_SECONDS || 120;
    this.redisUnavailableLogged = false;
    this.redisDisabledUntil = 0;
    this.redisRetryBackoffMs = env.REDIS_RETRY_BACKOFF_MS || 60000;
    this.metricsEnabled = env.CACHE_METRICS_ENABLED;
    this.metricsLogEvery = env.CACHE_METRICS_LOG_EVERY || 500;
    this.metrics = {
      reads: 0,
      writes: 0,
      deletes: 0,
      hits: 0,
      misses: 0,
      redisHits: 0,
      memoryHits: 0,
      redisErrors: 0,
    };
  }

  trackMetrics(event, source = null) {
    if (!this.metricsEnabled) {
      return;
    }

    if (event === 'read') {
      this.metrics.reads += 1;
    }
    if (event === 'write') {
      this.metrics.writes += 1;
    }
    if (event === 'delete') {
      this.metrics.deletes += 1;
    }
    if (event === 'hit') {
      this.metrics.hits += 1;
      if (source === 'redis') {
        this.metrics.redisHits += 1;
      }
      if (source === 'memory') {
        this.metrics.memoryHits += 1;
      }
    }
    if (event === 'miss') {
      this.metrics.misses += 1;
    }
    if (event === 'redisError') {
      this.metrics.redisErrors += 1;
    }

    const totalReads = this.metrics.reads;
    if (totalReads > 0 && totalReads % this.metricsLogEvery === 0) {
      const hitRate = ((this.metrics.hits / totalReads) * 100).toFixed(2);
      logger.info(
        `Cache metrics: reads=${this.metrics.reads}, hits=${this.metrics.hits}, misses=${this.metrics.misses}, hitRate=${hitRate}%, redisHits=${this.metrics.redisHits}, memoryHits=${this.metrics.memoryHits}, writes=${this.metrics.writes}, deletes=${this.metrics.deletes}, memoryKeys=${this.memoryCache.size}, redisErrors=${this.metrics.redisErrors}`
      );
    }
  }

  getMetrics() {
    const totalReads = this.metrics.reads;
    return {
      ...this.metrics,
      memoryKeys: this.memoryCache.size,
      hitRatePercent: totalReads === 0 ? 0 : Number(((this.metrics.hits / totalReads) * 100).toFixed(2)),
    };
  }

  buildRedisUrl() {
    if (env.REDIS_URL) {
      return env.REDIS_URL;
    }

    if (!env.REDIS_HOST) {
      return null;
    }

    const protocol = env.REDIS_USE_TLS ? 'rediss' : 'redis';
    const username = encodeURIComponent(env.REDIS_USERNAME || 'default');
    const password = env.REDIS_PASSWORD ? encodeURIComponent(env.REDIS_PASSWORD) : '';
    const auth = password ? `${username}:${password}@` : '';
    const port = env.REDIS_PORT || 6379;

    return `${protocol}://${auth}${env.REDIS_HOST}:${port}`;
  }

  async getRedisClient() {
    if (!this.isRedisEnabled) {
      return null;
    }

    if (Date.now() < this.redisDisabledUntil) {
      return null;
    }

    if (this.redisClient) {
      return this.redisClient;
    }

    try {
      const redisUrl = this.buildRedisUrl();
      if (!redisUrl) {
        return null;
      }

      const { createClient } = require('redis');
      const client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: () => false,
        },
      });

      client.on('error', (error) => {
        this.trackMetrics('redisError');
        if (!this.redisUnavailableLogged) {
          logger.error('Redis client error', error);
          this.redisUnavailableLogged = true;
        }
      });

      await client.connect();
      this.redisClient = client;
      this.redisUnavailableLogged = false;
      this.redisDisabledUntil = 0;
      logger.info('Redis cache connected');
      return this.redisClient;
    } catch (error) {
      this.trackMetrics('redisError');
      this.redisDisabledUntil = Date.now() + this.redisRetryBackoffMs;
      if (!this.redisUnavailableLogged) {
        logger.warn(`Redis unavailable, falling back to memory cache for ${Math.round(this.redisRetryBackoffMs / 1000)}s`);
        this.redisUnavailableLogged = true;
      }
      this.redisClient = null;
      return null;
    }
  }

  setMemory(key, value, ttlSeconds = this.defaultTTL) {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  getMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  deleteMemoryByPrefix(prefix) {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async get(key) {
    this.trackMetrics('read');

    const client = await this.getRedisClient();
    if (client) {
      try {
        const value = await client.get(key);
        if (value) {
          this.trackMetrics('hit', 'redis');
          return JSON.parse(value);
        }
      } catch (error) {
        this.trackMetrics('redisError');
        logger.error(`Failed to read cache key ${key} from Redis`, error);
      }
    }

    const memoryValue = this.getMemory(key);
    if (memoryValue !== null) {
      this.trackMetrics('hit', 'memory');
      return memoryValue;
    }

    this.trackMetrics('miss');
    return null;
  }

  async set(key, value, ttlSeconds = this.defaultTTL) {
    this.trackMetrics('write');

    const client = await this.getRedisClient();
    if (client) {
      try {
        await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
        return;
      } catch (error) {
        this.trackMetrics('redisError');
        logger.error(`Failed to write cache key ${key} to Redis`, error);
      }
    }

    this.setMemory(key, value, ttlSeconds);
  }

  async del(key) {
    this.trackMetrics('delete');

    const client = await this.getRedisClient();
    if (client) {
      try {
        await client.del(key);
      } catch (error) {
        this.trackMetrics('redisError');
        logger.error(`Failed to delete cache key ${key} from Redis`, error);
      }
    }

    this.memoryCache.delete(key);
  }

  async delByPrefix(prefix) {
    this.trackMetrics('delete');

    const client = await this.getRedisClient();
    if (client) {
      try {
        const keys = await client.keys(`${prefix}*`);
        if (keys.length) {
          await client.del(...keys);
        }
      } catch (error) {
        this.trackMetrics('redisError');
        logger.error(`Failed to delete cache keys by prefix ${prefix} from Redis`, error);
      }
    }

    this.deleteMemoryByPrefix(prefix);
  }

  async remember(key, producer, ttlSeconds = this.defaultTTL) {
    const cachedValue = await this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const value = await producer();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

module.exports = new CacheService();
