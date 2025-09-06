import { db } from '../db';
import { maintenanceRequests, users, properties, notifications } from '@shared/schema';
import { eq, and, sql, gte, count } from 'drizzle-orm';
import { performance } from 'perf_hooks';
import * as os from 'os';

export interface SystemMetrics {
  timestamp: Date;
  system: {
    cpuUsage: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
    nodeVersion: string;
  };
  database: {
    connectionStatus: 'healthy' | 'degraded' | 'down';
    activeConnections?: number;
    queryPerformance: {
      avgResponseTime: number;
      slowQueries: number;
    };
  };
  api: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    slowEndpoints: { endpoint: string; avgTime: number; }[];
  };
  application: {
    totalUsers: number;
    activeUsers: number;
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    errorRate: number;
  };
}

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
}

export class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 10000; // Keep last 10k metrics in memory
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private startTime = Date.now();

  // Record API performance metrics
  recordAPIMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow requests
    if (metric.responseTime > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow API request: ${metric.method} ${metric.endpoint} took ${metric.responseTime}ms`);
    }
  }

  // Get current system metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // System metrics
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    const systemMem = {
      used: memUsage.heapUsed,
      total: os.totalmem(),
      percentage: (memUsage.heapUsed / os.totalmem()) * 100
    };

    // Database health check
    const dbHealth = await this.checkDatabaseHealth();

    // API metrics from in-memory store
    const apiMetrics = this.getAPIMetrics();

    // Application metrics from database
    const appMetrics = await this.getApplicationMetrics(oneHourAgo);

    return {
      timestamp: now,
      system: {
        cpuUsage: os.loadavg()[0], // 1-minute load average
        memoryUsage: systemMem,
        uptime: process.uptime(),
        nodeVersion: process.version
      },
      database: dbHealth,
      api: apiMetrics,
      application: appMetrics
    };
  }

  private async checkDatabaseHealth(): Promise<SystemMetrics['database']> {
    const startTime = performance.now();
    
    try {
      // Simple query to test database connectivity and performance
      const result = await db.select({ count: count() }).from(users).limit(1);
      const responseTime = performance.now() - startTime;

      return {
        connectionStatus: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'down',
        queryPerformance: {
          avgResponseTime: responseTime,
          slowQueries: 0 // Could be enhanced to track actual slow queries
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        connectionStatus: 'down',
        queryPerformance: {
          avgResponseTime: -1,
          slowQueries: 0
        }
      };
    }
  }

  private getAPIMetrics(): SystemMetrics['api'] {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        slowEndpoints: []
      };
    }

    const recentMetrics = this.metrics.filter(m => 
      m.timestamp.getTime() > Date.now() - (60 * 60 * 1000) // Last hour
    );

    const totalRequests = recentMetrics.length;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    
    const avgResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    // Find slow endpoints
    const endpointStats = new Map<string, { total: number; totalTime: number; }>();
    
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || { total: 0, totalTime: 0 };
      existing.total++;
      existing.totalTime += metric.responseTime;
      endpointStats.set(key, existing);
    });

    const slowEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: stats.totalTime / stats.total
      }))
      .filter(e => e.avgTime > 500) // Endpoints averaging > 500ms
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5); // Top 5 slowest

    return {
      totalRequests,
      errorRate,
      averageResponseTime: avgResponseTime,
      slowEndpoints
    };
  }

  private async getApplicationMetrics(since: Date): Promise<SystemMetrics['application']> {
    try {
      // Total users
      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      
      // Active users (users with activity in the last hour)
      const [activeUsersResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${maintenanceRequests.assignedTechnicianId})`.as('count') })
        .from(maintenanceRequests)
        .where(gte(maintenanceRequests.updatedAt, since));

      // Request statistics
      const [totalRequestsResult] = await db.select({ count: count() }).from(maintenanceRequests);
      
      const [pendingRequestsResult] = await db
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(sql`${maintenanceRequests.status} IN ('open', 'assigned', 'in_progress')`);

      const [completedRequestsResult] = await db
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(sql`${maintenanceRequests.status} IN ('completed', 'closed')`);

      return {
        totalUsers: totalUsersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        totalRequests: totalRequestsResult.count || 0,
        pendingRequests: pendingRequestsResult.count || 0,
        completedRequests: completedRequestsResult.count || 0,
        errorRate: 0 // Could be calculated from error logs
      };
    } catch (error) {
      console.error('Error fetching application metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        errorRate: 0
      };
    }
  }

  // Health check endpoint data
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    uptime: number;
    checks: {
      database: 'pass' | 'fail';
      memory: 'pass' | 'fail';
      disk: 'pass' | 'fail';
    };
    details: {
      version: string;
      environment: string;
      memoryUsage: number;
      cpuLoad: number;
    };
  }> {
    const dbCheck = await this.checkDatabaseHealth();
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / os.totalmem()) * 100;
    const cpuLoad = os.loadavg()[0];

    const checks = {
      database: dbCheck.connectionStatus === 'healthy' ? 'pass' as const : 'fail' as const,
      memory: memUsagePercent < 80 ? 'pass' as const : 'fail' as const,
      disk: 'pass' as const // Could be enhanced with actual disk space check
    };

    const allChecksPass = Object.values(checks).every(check => check === 'pass');
    const someChecksFail = Object.values(checks).some(check => check === 'fail');

    const status = allChecksPass ? 'healthy' : someChecksFail ? 'unhealthy' : 'degraded';

    return {
      status,
      timestamp: new Date(),
      uptime: process.uptime(),
      checks,
      details: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: memUsagePercent,
        cpuLoad
      }
    };
  }

  // Alert system for critical metrics
  async checkAlerts(): Promise<void> {
    const metrics = await this.getSystemMetrics();
    
    // Memory usage alert
    if (metrics.system.memoryUsage.percentage > 85) {
      console.warn(`HIGH MEMORY USAGE: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`);
    }

    // API error rate alert
    if (metrics.api.errorRate > 10) {
      console.warn(`HIGH API ERROR RATE: ${metrics.api.errorRate.toFixed(1)}%`);
    }

    // Database connectivity alert
    if (metrics.database.connectionStatus === 'down') {
      console.error('DATABASE DOWN: Connection failed');
    }

    // Slow API response alert
    if (metrics.api.averageResponseTime > 2000) {
      console.warn(`SLOW API RESPONSES: Average ${metrics.api.averageResponseTime.toFixed(0)}ms`);
    }
  }

  // Get performance insights and recommendations
  async getPerformanceInsights(): Promise<{
    insights: string[];
    recommendations: string[];
    criticalIssues: string[];
  }> {
    const metrics = await this.getSystemMetrics();
    const insights: string[] = [];
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];

    // Analyze system performance
    if (metrics.system.memoryUsage.percentage > 80) {
      criticalIssues.push(`High memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`);
      recommendations.push('Consider optimizing memory usage or scaling up server resources');
    }

    if (metrics.system.cpuUsage > 0.8) {
      criticalIssues.push(`High CPU load: ${metrics.system.cpuUsage.toFixed(2)}`);
      recommendations.push('Consider load balancing or vertical scaling');
    }

    // Database performance
    if (metrics.database.connectionStatus === 'degraded') {
      insights.push('Database performance is degraded');
      recommendations.push('Review database queries and consider connection pooling');
    }

    if (metrics.database.queryPerformance.avgResponseTime > 500) {
      insights.push(`Slow database queries: ${metrics.database.queryPerformance.avgResponseTime.toFixed(0)}ms average`);
      recommendations.push('Optimize slow queries and consider adding database indexes');
    }

    // API performance
    if (metrics.api.errorRate > 5) {
      insights.push(`API error rate is elevated: ${metrics.api.errorRate.toFixed(1)}%`);
      recommendations.push('Review error logs and improve error handling');
    }

    if (metrics.api.averageResponseTime > 1000) {
      insights.push(`API responses are slow: ${metrics.api.averageResponseTime.toFixed(0)}ms average`);
      recommendations.push('Profile slow endpoints and optimize bottlenecks');
    }

    // Application insights
    const activeUserRate = metrics.application.totalUsers > 0 
      ? (metrics.application.activeUsers / metrics.application.totalUsers) * 100
      : 0;
    
    if (activeUserRate < 10) {
      insights.push(`Low user engagement: ${activeUserRate.toFixed(1)}% of users are active`);
    }

    const requestCompletionRate = metrics.application.totalRequests > 0
      ? (metrics.application.completedRequests / metrics.application.totalRequests) * 100
      : 0;

    if (requestCompletionRate < 70) {
      insights.push(`Low request completion rate: ${requestCompletionRate.toFixed(1)}%`);
      recommendations.push('Review request workflow and identify bottlenecks in the process');
    }

    return {
      insights,
      recommendations,
      criticalIssues
    };
  }

  // Start periodic monitoring
  startPeriodicMonitoring(): void {
    // Check alerts every 5 minutes
    setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        console.error('Error in periodic alert check:', error);
      }
    }, 5 * 60 * 1000);

    // Log system metrics every 15 minutes
    setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        console.log(`System Health - CPU: ${metrics.system.cpuUsage.toFixed(2)}, Memory: ${metrics.system.memoryUsage.percentage.toFixed(1)}%, DB: ${metrics.database.connectionStatus}, API Avg: ${metrics.api.averageResponseTime.toFixed(0)}ms`);
      } catch (error) {
        console.error('Error in periodic metrics logging:', error);
      }
    }, 15 * 60 * 1000);

    console.log('Performance monitoring started - alerts every 5min, metrics every 15min');
  }

  // Express middleware to automatically record API metrics
  createMetricsMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const duration = performance.now() - startTime;
        
        this.recordAPIMetric({
          endpoint: req.path,
          method: req.method,
          responseTime: duration,
          statusCode: res.statusCode,
          timestamp: new Date(),
          userId: req.user?.claims?.sub
        });
      });
      
      next();
    };
  }
}

export const monitoringService = new MonitoringService();