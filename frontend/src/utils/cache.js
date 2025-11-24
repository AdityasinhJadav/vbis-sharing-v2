// Cache utilities for storing and retrieving cached data
// Simple in-memory cache implementation

const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Generate a cache key from parameters
 * @param {string} prefix - Cache key prefix
 * @param {any} params - Parameters to include in the key
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, params = {}) {
  const paramString = JSON.stringify(params);
  return `${prefix}:${paramString}`;
}

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if not found/expired
 */
export function getCache(key) {
  const item = cache.get(key);
  
  if (!item) {
    return null;
  }

  // Check if expired
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
export function setCache(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Clear cache entry
 * @param {string} key - Cache key to clear
 */
export function clearCache(key) {
  cache.delete(key);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Check if cache key exists and is valid
 * @param {string} key - Cache key
 * @returns {boolean} True if key exists and is valid
 */
export function hasCache(key) {
  const item = cache.get(key);
  
  if (!item) {
    return false;
  }

  // Check if expired
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return false;
  }

  return true;
}

// Export cache utilities object
export const cacheUtils = {
  get: getCache,
  set: setCache,
  clear: clearCache,
  clearAll: clearAllCache,
  has: hasCache,
  generateKey: generateCacheKey,
};

