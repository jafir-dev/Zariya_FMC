import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, RateLimitError } from './errorHandler';

// Basic security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "*.amazonaws.com", "*.supabase.co"],
      scriptSrc: process.env.NODE_ENV === 'development' 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Vite needs these in dev
        : ["'self'", "'unsafe-inline'"], // Remove unsafe-eval in production
      connectSrc: ["'self'", "ws:", "wss:", "https:", "*.supabase.co", "*.firebaseapp.com"],
      mediaSrc: ["'self'", "blob:", "data:", "*.amazonaws.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
  permittedCrossDomainPolicies: false,
  hidePoweredBy: true,
  xssFilter: true
});

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler to throw our custom error
  handler: (req: Request, res: Response) => {
    throw new RateLimitError('Too many requests from this IP, please try again later.');
  }
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    throw new RateLimitError('Too many authentication attempts, please try again later.');
  }
});

// Rate limiting for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 file uploads per hour
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later.'
    }
  },
  handler: (req: Request, res: Response) => {
    throw new RateLimitError('Too many file uploads, please try again later.');
  }
});

// Slow down middleware for password-related endpoints
export const passwordSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per 15 minutes at full speed
  delayMs: 1000, // Add 1 second delay per request after delayAfter
  maxDelayMs: 10000, // Maximum delay of 10 seconds
});

// Request size limiting middleware
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This is handled by express.json() and multer, but we can add custom logic here
    next();
  };
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip IP check in development
    }

    if (!allowedIPs.includes(clientIP)) {
      throw new UnauthorizedError('Access denied from this IP address');
    }
    
    next();
  };
};

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic XSS protection - remove script tags and javascript: protocols
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// SQL injection protection middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\*|;|\/\*|\*\/|xp_|sp_)/gi,
    /(\b(OR|AND)\b.*[=<>])/gi
  ];

  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    
    if (Array.isArray(value)) {
      return value.some(checkForSQLInjection);
    }
    
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkForSQLInjection);
    }
    
    return false;
  };

  const suspicious = 
    checkForSQLInjection(req.body) ||
    checkForSQLInjection(req.query) ||
    checkForSQLInjection(req.params);

  if (suspicious) {
    console.warn('Potential SQL injection attempt:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    throw new UnauthorizedError('Invalid request detected');
  }

  next();
};

// Request logging middleware for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const securityInfo = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    referer: req.get('Referer'),
    origin: req.get('Origin')
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script|javascript:|on\w+=/i, // XSS attempts
    /union.*select|insert.*values|drop.*table/i, // SQL injection
    /\.(php|asp|jsp|cgi)/i, // Suspicious file extensions
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || 
    pattern.test(JSON.stringify(req.query)) ||
    pattern.test(JSON.stringify(req.body))
  );

  if (isSuspicious) {
    console.warn('Suspicious request detected:', securityInfo);
  }

  next();
};

// Authentication verification middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token required');
  }

  // Extract token and verify (this would integrate with your auth system)
  const token = authHeader.substring(7);
  
  if (!token) {
    throw new UnauthorizedError('Invalid authentication token');
  }

  // Add your token verification logic here
  // For now, we'll pass through since auth is handled elsewhere
  next();
};

// Role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This would check the user's role from the authenticated request
    // const userRole = req.user?.role;
    
    // if (!userRole || !allowedRoles.includes(userRole)) {
    //   throw new ForbiddenError('Insufficient permissions');
    // }
    
    next();
  };
};