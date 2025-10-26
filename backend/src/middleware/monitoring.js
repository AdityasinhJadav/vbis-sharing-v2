/**
 * Monitoring and health check middleware
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./security');

class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.requestCounts = new Map();
    this.errorCounts = new Map();
    this.responseTimes = [];
    this.maxResponseTimeHistory = 1000; // Keep last 1000 response times
  }

  // Track request metrics
  trackRequest(req, res, next) {
    const startTime = Date.now();
    const route = `${req.method} ${req.route?.path || req.path}`;
    
    // Increment request count
    this.requestCounts.set(route, (this.requestCounts.get(route) || 0) + 1);
    
    // Track response time
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      
      // Keep only recent response times
      if (this.responseTimes.length > this.maxResponseTimeHistory) {
        this.responseTimes.shift();
      }
      
      // Log slow requests
      if (responseTime > 5000) { // 5 seconds
        logger.warn(`Slow request detected: ${route} took ${responseTime}ms`);
      }
    });
    
    next();
  }

  // Track errors
  trackError(error, req) {
    const route = `${req.method} ${req.route?.path || req.path}`;
    this.errorCounts.set(route, (this.errorCounts.get(route) || 0) + 1);
    
    logger.error(`Error in ${route}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Get system metrics
  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: Date.now() - this.startTime,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        totalmem: Math.round(os.totalmem() / 1024 / 1024), // MB
        freemem: Math.round(os.freemem() / 1024 / 1024), // MB
        cpus: os.cpus().length
      }
    };
  }

  // Get application metrics
  getApplicationMetrics() {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const maxResponseTime = this.responseTimes.length > 0 
      ? Math.max(...this.responseTimes) 
      : 0;
    
    const minResponseTime = this.responseTimes.length > 0 
      ? Math.min(...this.responseTimes) 
      : 0;

    return {
      uptime: Date.now() - this.startTime,
      requests: {
        total: totalRequests,
        byRoute: Object.fromEntries(this.requestCounts),
        errors: {
          total: totalErrors,
          byRoute: Object.fromEntries(this.errorCounts)
        }
      },
      performance: {
        responseTime: {
          average: Math.round(avgResponseTime),
          min: minResponseTime,
          max: maxResponseTime,
          samples: this.responseTimes.length
        }
      }
    };
  }

  // Get health status
  async getHealthStatus() {
    const systemMetrics = await this.getSystemMetrics();
    const appMetrics = this.getApplicationMetrics();
    
    // Check memory usage
    const memoryUsagePercent = (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100;
    const isMemoryHealthy = memoryUsagePercent < 90;
    
    // Check error rate
    const errorRate = appMetrics.requests.total > 0 
      ? (appMetrics.requests.errors.total / appMetrics.requests.total) * 100 
      : 0;
    const isErrorRateHealthy = errorRate < 5; // Less than 5% error rate
    
    // Check response time
    const isResponseTimeHealthy = appMetrics.performance.responseTime.average < 2000; // Less than 2 seconds
    
    const isHealthy = isMemoryHealthy && isErrorRateHealthy && isResponseTimeHealthy;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        memory: {
          status: isMemoryHealthy ? 'pass' : 'fail',
          value: `${memoryUsagePercent.toFixed(2)}%`,
          threshold: '90%'
        },
        errorRate: {
          status: isErrorRateHealthy ? 'pass' : 'fail',
          value: `${errorRate.toFixed(2)}%`,
          threshold: '5%'
        },
        responseTime: {
          status: isResponseTimeHealthy ? 'pass' : 'fail',
          value: `${appMetrics.performance.responseTime.average}ms`,
          threshold: '2000ms'
        }
      },
      metrics: {
        system: systemMetrics,
        application: appMetrics
      }
    };
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.requestCounts.clear();
    this.errorCounts.clear();
    this.responseTimes = [];
    this.startTime = Date.now();
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

module.exports = {
  monitoring,
  MonitoringService
};
