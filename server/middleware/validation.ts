import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Comprehensive input validation schemas
export const validationSchemas = {
  // User validation
  createUser: Joi.object({
    email: Joi.string().email().required().max(255),
    firstName: Joi.string().required().min(1).max(100).pattern(/^[a-zA-Z\s'-]+$/),
    lastName: Joi.string().required().min(1).max(100).pattern(/^[a-zA-Z\s'-]+$/),
    phoneNumber: Joi.string().optional().pattern(/^\+?[1-9]\d{1,14}$/),
    role: Joi.string().valid(
      'admin',
      'fmc_head',
      'fmc_supervisor', 
      'fmc_technician',
      'fmc_procurement',
      'tenant',
      'building_owner',
      'third_party_support'
    ).required()
  }),

  // Maintenance request validation
  createMaintenanceRequest: Joi.object({
    title: Joi.string().required().min(5).max(200).pattern(/^[a-zA-Z0-9\s\-_.,!?()]+$/),
    description: Joi.string().required().min(10).max(2000),
    category: Joi.string().valid(
      'plumbing',
      'electrical',
      'hvac',
      'appliance',
      'structural',
      'cleaning',
      'landscaping',
      'security',
      'other'
    ).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
    propertyId: Joi.string().uuid().required(),
    preferredDate: Joi.date().min('now').optional(),
    preferredTimeSlot: Joi.string().valid(
      'morning',
      'afternoon', 
      'evening',
      'anytime'
    ).optional(),
    schedulingNotes: Joi.string().max(500).optional(),
    isEmergency: Joi.boolean().default(false)
  }),

  // Status update validation
  updateStatus: Joi.object({
    status: Joi.string().valid(
      'open',
      'assigned',
      'in_progress',
      'pending_approval',
      'completed',
      'closed',
      'cancelled'
    ).required(),
    note: Joi.string().max(1000).optional()
  }),

  // File upload validation
  fileUpload: Joi.object({
    files: Joi.array().items(
      Joi.object({
        mimetype: Joi.string().valid(
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/webm',
          'video/quicktime'
        ).required(),
        size: Joi.number().max(50 * 1024 * 1024).required(), // 50MB max
        originalname: Joi.string().max(255).required()
      })
    ).max(10).required(),
    isBeforePhoto: Joi.boolean().default(false)
  }),

  // OTP validation
  otp: Joi.object({
    otp: Joi.string().pattern(/^\d{6}$/).required()
  }),

  // Query parameters
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().optional(),
    priority: Joi.string().optional(),
    category: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref('startDate')).optional(),
    search: Joi.string().max(100).optional()
  }),

  // ID parameters
  idParams: Joi.object({
    id: Joi.string().uuid().required()
  }),

  // Notification settings
  notificationSettings: Joi.object({
    email: Joi.boolean().default(true),
    sms: Joi.boolean().default(false),
    push: Joi.boolean().default(true),
    whatsapp: Joi.boolean().default(false)
  })
};

// Custom validation functions
export const customValidators = {
  // Validate that a date is not too far in the future
  reasonableFutureDate: (value: Date, helpers: any) => {
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 1); // 1 year max
    
    if (value > maxFuture) {
      return helpers.error('date.maxFuture');
    }
    return value;
  },

  // Validate file extension matches MIME type
  validateFileExtension: (file: any, helpers: any) => {
    const extensionMap: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'video/mp4': ['mp4'],
      'video/webm': ['webm'],
      'video/quicktime': ['mov', 'qt']
    };

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = extensionMap[file.mimetype];

    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      return helpers.error('file.invalidExtension');
    }
    return file;
  },

  // Validate that request priority matches category urgency
  validatePriorityCategory: (value: any, helpers: any) => {
    const { priority, category } = value;
    
    // Emergency categories should have high priority
    const emergencyCategories = ['electrical', 'plumbing', 'security'];
    if (emergencyCategories.includes(category) && priority === 'low') {
      return helpers.error('priority.categoryMismatch');
    }
    
    return value;
  }
};

// Generic validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type
      }));

      throw new ValidationError(
        `Validation failed: ${errorMessages.map(e => `${e.field} ${e.message}`).join(', ')}`
      );
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// File validation middleware
export const validateFiles = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    return next();
  }

  const files = Array.isArray(req.files) ? req.files : [req.files];
  
  for (const file of files as Express.Multer.File[]) {
    // Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(`Invalid file type: ${file.mimetype}. Only images and videos are allowed.`);
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      throw new ValidationError(`File too large: ${file.originalname}. Maximum size is 50MB.`);
    }

    // Validate filename (security)
    const filename = file.originalname;
    if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename.includes('..')) {
      throw new ValidationError(`Invalid filename: ${filename}. Only alphanumeric characters, dots, hyphens, and underscores are allowed.`);
    }

    // Check for executable extensions
    const dangerousExtensions = ['.exe', '.bat', '.sh', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar', '.php'];
    if (dangerousExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
      throw new ValidationError(`Dangerous file type detected: ${filename}`);
    }
  }

  next();
};

// Sanitization functions
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  sanitizeString: (str: string): string => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 10000); // Limit length
  },

  // Sanitize email
  sanitizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },

  // Sanitize phone number
  sanitizePhoneNumber: (phone: string): string => {
    return phone.replace(/[^\d+\-\s()]/g, '').trim();
  },

  // Sanitize filename
  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
};

// Rate limiting by request type
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific validation middleware for common endpoints
export const validateCreateRequest = validate(validationSchemas.createMaintenanceRequest);
export const validateUpdateStatus = validate(validationSchemas.updateStatus);
export const validateCreateUser = validate(validationSchemas.createUser);
export const validateQueryParams = validate(validationSchemas.queryParams, 'query');
export const validateIdParams = validate(validationSchemas.idParams, 'params');
export const validateOTP = validate(validationSchemas.otp);

// Security-focused validation
export const validateSecureInput = (req: Request, res: Response, next: NextFunction) => {
  // Check for common attack patterns
  const attackPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /select.*from/i,
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /exec\(/i,
    /eval\(/i,
    /\.\.\/\.\.\//,
    /\/etc\/passwd/,
    /\/bin\/sh/
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return attackPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const suspicious = 
    checkValue(req.body) ||
    checkValue(req.query) ||
    checkValue(req.params);

  if (suspicious) {
    console.warn('Malicious input detected:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    throw new ValidationError('Invalid input detected');
  }

  next();
};

export default {
  validate,
  validateFiles,
  validationSchemas,
  customValidators,
  sanitizeInput,
  createRateLimit,
  validateSecureInput,
  validateCreateRequest,
  validateUpdateStatus,
  validateCreateUser,
  validateQueryParams,
  validateIdParams,
  validateOTP
};