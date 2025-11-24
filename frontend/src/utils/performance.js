// Performance monitoring utilities
// Simple performance tracking for development and debugging

const metrics = {
  timings: new Map(),
  counters: new Map(),
};

/**
 * Start timing an operation
 * @param {string} label - Label for the timing operation
 * @returns {Function} Function to call when operation completes
 */
export function startTiming(label) {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    metrics.timings.set(label, duration);
    
    if (import.meta.env.DEV) {
      console.log(`⏱️ [Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  };
}

/**
 * Record a timing metric
 * @param {string} label - Label for the metric
 * @param {number} duration - Duration in milliseconds
 */
export function recordTiming(label, duration) {
  metrics.timings.set(label, duration);
  
  if (import.meta.env.DEV) {
    console.log(`⏱️ [Performance] ${label}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Increment a counter
 * @param {string} label - Label for the counter
 * @param {number} amount - Amount to increment (default: 1)
 */
export function incrementCounter(label, amount = 1) {
  const current = metrics.counters.get(label) || 0;
  metrics.counters.set(label, current + amount);
}

/**
 * Get timing metric
 * @param {string} label - Label for the metric
 * @returns {number|null} Timing value or null if not found
 */
export function getTiming(label) {
  return metrics.timings.get(label) || null;
}

/**
 * Get counter value
 * @param {string} label - Label for the counter
 * @returns {number} Counter value
 */
export function getCounter(label) {
  return metrics.counters.get(label) || 0;
}

/**
 * Get all metrics
 * @returns {Object} Object containing all timings and counters
 */
export function getAllMetrics() {
  return {
    timings: Object.fromEntries(metrics.timings),
    counters: Object.fromEntries(metrics.counters),
  };
}

/**
 * Clear all metrics
 */
export function clearMetrics() {
  metrics.timings.clear();
  metrics.counters.clear();
}

// Export performance monitor object
export const perfMonitor = {
  startTiming,
  recordTiming,
  incrementCounter,
  getTiming,
  getCounter,
  getAllMetrics,
  clearMetrics,
};

