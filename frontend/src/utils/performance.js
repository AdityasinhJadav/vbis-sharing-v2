/**
 * Performance monitoring and optimization utilities
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Start timing a performance metric
  startTiming(name) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  // End timing and calculate duration
  endTiming(name) {
    if (!this.isEnabled) return null;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No timing found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  // Measure function execution time
  measureFunction(name, fn) {
    if (!this.isEnabled) return fn();
    
    this.startTiming(name);
    const result = fn();
    
    // Handle both sync and async functions
    if (result instanceof Promise) {
      return result.finally(() => {
        this.endTiming(name);
      });
    } else {
      this.endTiming(name);
      return result;
    }
  }

  // Get performance metrics
  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, data]) => ({
      name,
      duration: data.duration,
      startTime: data.startTime,
      endTime: data.endTime
    }));
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Monitor Web Vitals
  monitorWebVitals() {
    if (!this.isEnabled) return;

    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('FCP:', entry.startTime);
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('LCP:', entry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('FID:', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          console.log('CLS:', entry.value);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// Create global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Performance utilities
export const performanceUtils = {
  // Debounce function calls
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function calls
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoize function results
  memoize: (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
    const cache = new Map();
    return (...args) => {
      const key = keyGenerator(...args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  },

  // Lazy load components
  lazyLoad: (importFn) => {
    return React.lazy(() => importFn());
  },

  // Preload resources
  preload: (url, type = 'image') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  },

  // Prefetch resources
  prefetch: (url) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
};

// Image loading optimization
export const imageOptimization = {
  // Lazy load images with intersection observer
  setupLazyLoading: (selector = 'img[data-src]') => {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });

    return imageObserver;
  },

  // Preload critical images
  preloadCriticalImages: (urls) => {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = 'image';
      document.head.appendChild(link);
    });
  }
};

// Bundle size monitoring
export const bundleAnalysis = {
  // Log bundle size warnings
  checkBundleSize: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Bundle analysis available in development mode');
      console.log('Use webpack-bundle-analyzer for detailed analysis');
    }
  }
};

// Memory usage monitoring
export const memoryMonitor = {
  // Check memory usage (if available)
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  },

  // Monitor memory usage
  startMemoryMonitoring: (interval = 30000) => {
    if (!performance.memory) return;

    setInterval(() => {
      const memory = memoryMonitor.getMemoryUsage();
      if (memory && memory.used > memory.limit * 0.8) {
        console.warn('High memory usage detected:', memory);
      }
    }, interval);
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  perfMonitor.monitorWebVitals();
  memoryMonitor.startMemoryMonitoring();
  bundleAnalysis.checkBundleSize();
};

export default PerformanceMonitor;
