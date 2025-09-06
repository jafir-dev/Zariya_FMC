import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { contractService } from "./services/contractService";
import { monitoringService } from "./services/monitoringService";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler, logError } from "./middleware/errorHandler";
import { 
  securityHeaders, 
  apiRateLimit, 
  corsOptions, 
  sanitizeInput, 
  sqlInjectionProtection, 
  securityLogger,
  requestSizeLimit 
} from "./middleware/security";

const app = express();

// Apply security middleware first
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(securityLogger);

// Request parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Input sanitization and SQL injection protection
app.use(sanitizeInput);
app.use(sqlInjectionProtection);

// Apply rate limiting to API routes
app.use('/api', apiRateLimit);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Use the comprehensive error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize contract expiry monitoring
    contractService.scheduleContractChecks();
    log('Contract expiry monitoring initialized');
    
    // Initialize performance monitoring
    monitoringService.startPeriodicMonitoring();
    log('Performance monitoring initialized');
  });
})();
