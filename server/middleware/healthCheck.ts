import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { storageService } from '../services/storageService.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    storage: {
      status: 'healthy' | 'unhealthy';
      type: 'local' | 's3';
      error?: string;
    };
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      usage: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
      };
      percentage: number;
    };
  };
  version: string;
  environment: string;
}

class HealthCheckService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      // Simple query to check database connectivity
      await db.execute('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  checkStorage(): { status: 'healthy' | 'unhealthy'; type: 'local' | 's3'; error?: string } {
    try {
      const fileInfo = storageService.getFileInfo('/test');
      return {
        status: 'healthy',
        type: fileInfo.isLocal ? 'local' : 's3',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: 'local',
        error: error instanceof Error ? error.message : 'Unknown storage error',
      };
    }
  }

  checkMemory(): {
    status: 'healthy' | 'warning' | 'critical';
    usage: { rss: number; heapUsed: number; heapTotal: number; external: number };
    percentage: number;
  } {
    const usage = process.memoryUsage();
    const totalMemory = 1024 * 1024 * 1024; // Assume 1GB limit for now
    const memoryPercentage = (usage.rss / totalMemory) * 100;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (memoryPercentage > 80) {
      status = 'critical';
    } else if (memoryPercentage > 60) {
      status = 'warning';
    }

    return {
      status,
      usage: {
        rss: Math.round(usage.rss / 1024 / 1024), // Convert to MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      },
      percentage: Math.round(memoryPercentage * 100) / 100,
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const [databaseHealth] = await Promise.all([
      this.checkDatabase(),
    ]);

    const storageHealth = this.checkStorage();
    const memoryHealth = this.checkMemory();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (databaseHealth.status === 'unhealthy' || storageHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (memoryHealth.status === 'critical') {
      overallStatus = 'degraded';
    } else if (memoryHealth.status === 'warning') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database: databaseHealth,
        storage: storageHealth,
        memory: memoryHealth,
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

const healthCheckService = new HealthCheckService();

export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await healthCheckService.getHealthStatus();
    
    // Set appropriate HTTP status code
    let statusCode = 200;
    if (health.status === 'degraded') {
      statusCode = 200; // Still operational
    } else if (health.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }

    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
};

// Simple ping endpoint
export const ping = (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Zariya FMC Platform is running'
  });
};

export default healthCheckService;