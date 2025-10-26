/**
 * Simple in-memory cache utility
 */

class Cache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value, customTTL = null) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + (customTTL || this.ttl);
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create cache instances for different data types
export const photoCache = new Cache(50, 10 * 60 * 1000); // 10 minutes for photos
export const userCache = new Cache(20, 30 * 60 * 1000); // 30 minutes for user data
export const apiCache = new Cache(100, 5 * 60 * 1000); // 5 minutes for API responses

// Cache key generators
export const generateCacheKey = {
  photo: (photoId) => `photo:${photoId}`,
  user: (userId) => `user:${userId}`,
  event: (eventId) => `event:${eventId}`,
  api: (endpoint, params = {}) => `api:${endpoint}:${JSON.stringify(params)}`,
  faceMatch: (userId, eventId) => `faceMatch:${userId}:${eventId}`
};

// Cache utilities
export const cacheUtils = {
  // Set with automatic key generation
  setPhoto: (photoId, data) => photoCache.set(generateCacheKey.photo(photoId), data),
  getUser: (userId) => userCache.get(generateCacheKey.user(userId)),
  setUser: (userId, data) => userCache.set(generateCacheKey.user(userId), data),
  
  // API response caching
  setApiResponse: (endpoint, params, data, ttl = null) => {
    const key = generateCacheKey.api(endpoint, params);
    apiCache.set(key, data, ttl);
  },
  
  getApiResponse: (endpoint, params) => {
    const key = generateCacheKey.api(endpoint, params);
    return apiCache.get(key);
  },

  // Face matching cache
  setFaceMatch: (userId, eventId, results) => {
    const key = generateCacheKey.faceMatch(userId, eventId);
    photoCache.set(key, results, 15 * 60 * 1000); // 15 minutes for face matches
  },
  
  getFaceMatch: (userId, eventId) => {
    const key = generateCacheKey.faceMatch(userId, eventId);
    return photoCache.get(key);
  },

  // Clear all caches
  clearAll: () => {
    photoCache.clear();
    userCache.clear();
    apiCache.clear();
  },

  // Get all cache statistics
  getAllStats: () => ({
    photo: photoCache.getStats(),
    user: userCache.getStats(),
    api: apiCache.getStats()
  })
};

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  photoCache.cleanup();
  userCache.cleanup();
  apiCache.cleanup();
}, 5 * 60 * 1000);

export default Cache;
