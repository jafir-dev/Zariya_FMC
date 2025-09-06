import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
// Supabase authentication middleware
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);


const setupAuth = async (app: any) => {
  console.log("Setting up Supabase authentication...");
};

const isAuthenticated = async (req: any, res: any, next: any) => {
  // For now, just pass through - will implement proper Supabase auth later
  next();
};
import { insertMaintenanceRequestSchema, insertAttachmentSchema, insertInviteCodeSchema, users } from "@shared/schema";
import { notificationService } from './services/notificationService';
import { otpService } from './services/otpService';
import { vendorService } from './services/vendorService';
import { analyticsService } from './services/analyticsService';
import { contractService } from './services/contractService';
import { monitoringService } from './services/monitoringService';
import { websocketService } from './services/websocketService';
import { storageService } from './services/storageService';
import { authRateLimit, uploadRateLimit, passwordSlowDown } from './middleware/security';
import { asyncHandler, NotFoundError, ValidationError } from './middleware/errorHandler';
import { healthCheck, ping } from './middleware/healthCheck';
import { db } from './db';
import { eq } from 'drizzle-orm';
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueName = `${randomUUID()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

  // List invite codes (admin/supervisor only)
  app.get('/api/invite-codes', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.fmcOrganizationId) {
        return res.status(400).json({ message: 'User organization not found' });
      }

      // Check permissions
      if (!['admin', 'fmc_head', 'fmc_supervisor'].includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const inviteCodes = await storage.getInviteCodesByOrganization(user.fmcOrganizationId);
      res.json(inviteCodes);
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      res.status(500).json({ message: 'Failed to fetch invite codes' });
    }
  });

  // Create building route
  app.post('/api/buildings', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, address } = req.body;
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.fmcOrganizationId) {
        return res.status(400).json({ message: 'User organization not found' });
      }

      // Check permissions
      if (!['admin', 'fmc_head', 'fmc_supervisor'].includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      if (!name || !address) {
        return res.status(400).json({ message: 'Name and address are required' });
      }

      const building = await storage.createBuilding({
        name,
        address,
        fmcOrganizationId: user.fmcOrganizationId,
        isActive: true,
      });

      res.status(201).json(building);
    } catch (error) {
      console.error('Error creating building:', error);
      res.status(500).json({ message: 'Failed to create building' });
    }
  });

// Contract Management Routes - Insert before Vendor Management Routes in registerRoutes function
const contractRoutes = `
  // Contract Management Routes
  app.get('/api/contracts/expiring', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId || !['fmc_head', 'fmc_supervisor', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const expiringContracts = await contractService.getExpiringContracts(user.fmcOrganizationId, days);
      res.json(expiringContracts);
    } catch (error) {
      console.error("Error fetching expiring contracts:", error);
      res.status(500).json({ message: "Failed to fetch expiring contracts" });
    }
  });

  app.patch('/api/contracts/:propertyId/renew', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId || !['fmc_head', 'fmc_supervisor', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { propertyId } = req.params;
      const { newExpiryDate } = req.body;

      if (!newExpiryDate) {
        return res.status(400).json({ message: "New expiry date is required" });
      }

      await contractService.renewContract(propertyId, new Date(newExpiryDate), user.id);
      res.json({ success: true, message: "Contract renewed successfully" });
    } catch (error) {
      console.error("Error renewing contract:", error);
      res.status(500).json({ message: "Failed to renew contract" });
    }
  });

  app.post('/api/contracts/check-expiry', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await contractService.checkExpiringContracts();
      res.json({ success: true, message: "Contract expiry check completed" });
    } catch (error) {
      console.error("Error running contract expiry check:", error);
      res.status(500).json({ message: "Failed to run contract expiry check" });
    }
  });

  app.get('/api/contracts/:propertyId/access-status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { propertyId } = req.params;

      const isBlocked = await contractService.isAccessBlocked(userId, propertyId);
      res.json({ 
        accessBlocked: isBlocked,
        message: isBlocked ? "Access blocked due to expired or inactive contract" : "Access allowed"
      });
    } catch (error) {
      console.error("Error checking access status:", error);
      res.status(500).json({ message: "Failed to check access status" });
    }
  });
`;

export async function registerRoutes(app: Express): Promise<Server> {
  // Add performance monitoring middleware to all API routes
  app.use('/api', monitoringService.createMetricsMiddleware());

  // Health check routes (no authentication required)
  app.get('/api/ping', ping);
  app.get('/api/health', healthCheck);
  app.get('/api/health/detailed', healthCheck);

  // Enhanced monitoring routes
  app.get('/api/monitoring/metrics', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const metrics = await monitoringService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  app.get('/api/monitoring/health', async (req: Request, res: Response) => {
    try {
      const health = await monitoringService.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      console.error("Error fetching health status:", error);
      res.status(503).json({ 
        status: 'unhealthy', 
        error: 'Health check failed',
        timestamp: new Date()
      });
    }
  });

  app.get('/api/monitoring/insights', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const insights = await monitoringService.getPerformanceInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching performance insights:", error);
      res.status(500).json({ message: "Failed to fetch performance insights" });
    }
  });

  // Notification testing routes
  app.post('/api/test/notification', async (req: Request, res: Response) => {
    try {
      const { userId, channel, message } = req.body;
      
      if (!userId || !channel || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId, channel, and message are required' 
        });
      }

      await notificationService.sendNotification({
        userId,
        title: 'Test Notification',
        message,
        type: 'info',
        channels: [channel]
      });

      res.json({ 
        success: true, 
        message: `Test ${channel} notification sent successfully` 
      });
    } catch (error) {
      console.error('Test notification failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Firebase Auth is handled on the client side

  // Ensure uploads directory exists
  import('fs').then(fs => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Firebase Auth routes
  app.post('/api/auth/create-profile', async (req: Request, res: Response) => {
    try {
      const { id, email, firstName, lastName, role, inviteCode } = req.body;
      
      let userRole = 'tenant';
      let fmcOrganizationId = null;

      // If invite code is provided, validate it
      if (inviteCode) {
        const invite = await storage.validateInviteCode(inviteCode);
        if (!invite) {
          return res.status(400).json({ message: 'Invalid or expired invite code' });
        }
        
        // Use role and organization from invite
        userRole = invite.role;
        fmcOrganizationId = invite.fmcOrganizationId;
        
        // Mark invite code as used
        await storage.useInviteCode(inviteCode, id);
      }
      
      const user = await db.insert(users).values({
        id,
        email,
        firstName,
        lastName,
        role: role || userRole,
        fmcOrganizationId,
        isActive: true,
      }).returning();

      res.json(user[0]);
    } catch (error) {
      console.error('Error creating user profile:', error);
      res.status(500).json({ message: 'Failed to create user profile' });
    }
  });

  app.get('/api/auth/profile/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user[0]);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  app.post('/api/auth/complete-profile', async (req: Request, res: Response) => {
    try {
      const { 
        userId, 
        firstName, 
        lastName, 
        phoneNumber, 
        role, 
        inviteCode,
        buildingName,
        unitNumber,
        organizationName,
        specialization
      } = req.body;

      if (!userId || !firstName || !lastName || !phoneNumber || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      let fmcOrganizationId = null;
      let vendorOrganizationId = null;

      // Handle invite code validation for roles that require it
      const requiresInvite = ['fmc_head', 'fmc_supervisor', 'fmc_technician', 'fmc_procurement', 'third_party_support'].includes(role);
      
      if (requiresInvite) {
        if (!inviteCode) {
          return res.status(400).json({ message: 'Invite code required for this role' });
        }

        const invite = await storage.validateInviteCode(inviteCode);
        if (!invite) {
          return res.status(400).json({ message: 'Invalid or expired invite code' });
        }

        if (invite.role !== role) {
          return res.status(400).json({ message: 'Invite code role mismatch' });
        }

        fmcOrganizationId = invite.fmcOrganizationId;
        
        // Mark invite as used
        await storage.useInviteCode(inviteCode, userId);
      }

      // Update user profile
      const [updatedUser] = await db.update(users)
        .set({
          firstName,
          lastName,
          phoneNumber,
          role: role as any,
          fmcOrganizationId,
          vendorOrganizationId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      // Handle building/property creation for tenants and building owners
      if ((role === 'tenant' || role === 'building_owner') && buildingName) {
        try {
          // Create or find building
          let building;
          const existingBuilding = await storage.getBuildingByName(buildingName, fmcOrganizationId);
          
          if (existingBuilding) {
            building = existingBuilding;
          } else if (fmcOrganizationId) {
            building = await storage.createBuilding({
              name: buildingName,
              address: 'Address to be updated',
              fmcOrganizationId,
              isActive: true,
            });
          }

          // Create property for tenant
          if (role === 'tenant' && building && unitNumber) {
            await storage.createProperty({
              buildingId: building.id,
              unitNumber,
              userId,
              isActive: true,
            });
          }
        } catch (error) {
          console.error('Error creating building/property:', error);
          // Don't fail the profile completion for this
        }
      }

      // Send welcome notification
      try {
        await notificationService.sendNotification({
          userId,
          title: 'Welcome to Zariya FMC!',
          message: `Your profile has been completed successfully. Welcome to the platform, ${firstName}!`,
          type: 'success',
          data: { action: 'welcome', role },
          channels: ['email', 'push']
        });
      } catch (error) {
        console.error('Error sending welcome notification:', error);
      }

      res.json({ 
        success: true, 
        message: 'Profile completed successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Error completing profile:', error);
      res.status(500).json({ message: 'Failed to complete profile' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.claims.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Buildings routes
  app.get('/api/buildings', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId) {
        return res.status(400).json({ message: "User organization not found" });
      }

      const buildings = await storage.getBuildings(user.fmcOrganizationId);
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ message: "Failed to fetch buildings" });
    }
  });

  // Properties routes
  app.get('/api/properties', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const properties = await storage.getPropertiesForUser(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Maintenance requests routes
  app.post('/api/maintenance-requests', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validatedData = insertMaintenanceRequestSchema.parse({
        ...req.body,
        fmcOrganizationId: user.fmcOrganizationId,
      });

      const request = await storage.createMaintenanceRequest(validatedData);

      // Add initial timeline entry
      await storage.addTimelineEntry({
        requestId: request.id,
        action: "created",
        description: "Request created by tenant",
        userId: user.id,
        newStatus: "open",
      });

      // Automatic request routing workflow
      try {
        // Find supervisors in the organization
        const supervisors = await storage.getUsersByRole('fmc_supervisor', user.fmcOrganizationId!);
        const fmcHeads = await storage.getUsersByRole('fmc_head', user.fmcOrganizationId!);
        const allSupervisors = [...supervisors, ...fmcHeads];

        // Notify supervisors about new request
        for (const supervisor of allSupervisors) {
          await notificationService.sendNotification({
            userId: supervisor.id,
            title: 'New Maintenance Request',
            message: `A new ${validatedData.priority} priority maintenance request has been created: ${validatedData.title}`,
            type: 'info',
            requestId: request.id,
            data: { 
              requestId: request.id, 
              action: 'new_request',
              priority: validatedData.priority,
              category: validatedData.category
            },
            channels: ['email', 'push']
          });
        }

        // Auto-assign for urgent requests
        if (validatedData.priority === 'urgent' && allSupervisors.length > 0) {
          // Check if request requires vendor (specialized services)
          const needsVendor = ['electrical', 'plumbing', 'hvac', 'elevator'].includes(validatedData.category);
          
          if (needsVendor) {
            // Get suggested vendors for this category
            const suggestedVendors = await vendorService.getFmcVendors(user.fmcOrganizationId!, validatedData.category);
            
            if (suggestedVendors.length > 0) {
              // Auto-assign to highest-rated vendor for urgent requests
              const bestVendor = suggestedVendors.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))[0];
              const vendorTeam = await vendorService.getVendorUsers(bestVendor.id);
              
              if (vendorTeam.length > 0) {
                const vendorContact = vendorTeam.find(member => member.role === 'third_party_support') || vendorTeam[0];
                
                await vendorService.assignRequestToVendor(request.id, bestVendor.id, vendorContact.id, allSupervisors[0].id);
                
                // Add timeline entry
                await storage.addTimelineEntry({
                  requestId: request.id,
                  action: "auto_assigned_to_vendor",
                  description: `Automatically assigned to ${bestVendor.name} for urgent ${validatedData.category} service`,
                  userId: allSupervisors[0].id,
                  newStatus: "assigned",
                });
                
                console.log(`Urgent request ${request.id} auto-assigned to vendor ${bestVendor.name}`);
              }
            }
          } else {
            // Internal technician assignment for non-specialized services
            const technicians = await storage.getUsersByRole('fmc_technician', user.fmcOrganizationId!);
            
            if (technicians.length > 0) {
              // Simple round-robin assignment (can be enhanced with workload balancing)
              const assignedTechnician = technicians[0];
              const supervisor = allSupervisors[0];
              
              await storage.assignTechnician(request.id, assignedTechnician.id, supervisor.id);
              
              // Notify technician about urgent assignment
              await notificationService.sendNotification({
                userId: assignedTechnician.id,
                title: 'URGENT: New Assignment',
                message: `You have been assigned an urgent maintenance request: ${validatedData.title}`,
                type: 'warning',
                requestId: request.id,
                data: { 
                  requestId: request.id, 
                  action: 'urgent_assignment',
                  priority: 'urgent'
                },
                channels: ['email', 'sms', 'push']
              });
            }
          }
        }

        console.log(`Request ${request.id} created and routed successfully`);
      } catch (routingError) {
        console.error('Error in request routing workflow:', routingError);
        // Don't fail the request creation if routing fails
      }

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      res.status(500).json({ message: "Failed to create maintenance request" });
    }
  });

  app.get('/api/maintenance-requests', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters: any = { fmcOrganizationId: user.fmcOrganizationId };

      // Role-based filtering
      if (user.role === 'tenant') {
        filters.userId = user.id;
      } else if (user.role === 'fmc_technician') {
        filters.assignedTechnicianId = user.id;
      } else if (user.role === 'fmc_supervisor') {
        filters.supervisorId = user.id;
      }

      // Apply query parameters
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.buildingId) {
        filters.buildingId = req.query.buildingId;
      }
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string);
      }
      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset as string);
      }

      const requests = await storage.getMaintenanceRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ message: "Failed to fetch maintenance requests" });
    }
  });

  app.get('/api/maintenance-requests/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const request = await storage.getMaintenanceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error fetching maintenance request:", error);
      res.status(500).json({ message: "Failed to fetch maintenance request" });
    }
  });

  app.patch('/api/maintenance-requests/:id/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      const userId = req.user!.claims.sub;

      const updated = await storage.updateMaintenanceRequestStatus(req.params.id, status, userId);
      
      // Send notifications for status updates
      try {
        const request = await storage.getMaintenanceRequest(req.params.id);
        if (request) {
          const property = request.property;
          
          // Notify tenant about status updates
          if (property.userId) {
            let message = '';
            let notificationType: 'info' | 'success' | 'warning' = 'info';
            
            switch (status) {
              case 'in_progress':
                message = `Work has started on your maintenance request: ${request.title}`;
                break;
              case 'completed':
                message = `Work has been completed on your maintenance request: ${request.title}. Please verify the work.`;
                notificationType = 'success';
                break;
              case 'closed':
                message = `Your maintenance request has been closed: ${request.title}`;
                notificationType = 'success';
                break;
              default:
                message = `Status updated for your maintenance request: ${request.title}`;
            }
            
            await notificationService.sendNotification({
              userId: property.userId,
              title: 'Request Status Updated',
              message,
              type: notificationType,
              requestId: req.params.id,
              data: { 
                requestId: req.params.id, 
                action: 'status_update',
                oldStatus: request.status,
                newStatus: status
              },
              channels: ['email', 'push']
            });
          }
          
          // Notify supervisor for completed requests
          if (status === 'completed' && request.supervisorId) {
            await notificationService.sendNotification({
              userId: request.supervisorId,
              title: 'Work Completed',
              message: `Work has been completed on request: ${request.title}. Awaiting customer verification.`,
              type: 'success',
              requestId: req.params.id,
              data: { 
                requestId: req.params.id, 
                action: 'work_completed',
                technicianId: request.assignedTechnicianId
              },
              channels: ['email', 'push']
            });
          }
        }
      } catch (error) {
        console.error('Error sending status update notifications:', error);
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ message: "Failed to update request status" });
    }
  });

  app.patch('/api/maintenance-requests/:id/assign', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { technicianId } = req.body;
      const supervisorId = req.user!.claims.sub;

      const updated = await storage.assignTechnician(req.params.id, technicianId, supervisorId);
      
      // Notify technician about assignment
      try {
        const request = await storage.getMaintenanceRequest(req.params.id);
        if (request) {
          await notificationService.sendNotification({
            userId: technicianId,
            title: 'New Assignment',
            message: `You have been assigned to work on: ${request.title}`,
            type: 'info',
            requestId: req.params.id,
            data: { 
              requestId: req.params.id, 
              action: 'assignment',
              priority: request.priority
            },
            channels: ['email', 'push']
          });

          // Notify tenant about technician assignment
          const property = request.property;
          if (property.userId) {
            await notificationService.sendNotification({
              userId: property.userId,
              title: 'Technician Assigned',
              message: `A technician has been assigned to your maintenance request: ${request.title}`,
              type: 'info',
              requestId: req.params.id,
              data: { 
                requestId: req.params.id, 
                action: 'technician_assigned',
                technicianName: `${request.assignedTechnician?.firstName} ${request.assignedTechnician?.lastName}`
              },
              channels: ['email', 'push']
            });
          }
        }
      } catch (error) {
        console.error('Error sending assignment notifications:', error);
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error assigning technician:", error);
      res.status(500).json({ message: "Failed to assign technician" });
    }
  });

  // File upload routes
  app.post('/api/maintenance-requests/:id/attachments', isAuthenticated, upload.array('files', 10), async (req: AuthenticatedRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const userId = req.user!.claims.sub;
      const requestId = req.params.id;
      const isBeforePhoto = req.body.isBeforePhoto === 'true';

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const attachments = [];
      for (const file of files) {
        const attachment = await storage.createAttachment({
          requestId,
          fileName: file.originalname,
          fileUrl: `/uploads/${file.filename}`,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadedBy: userId,
          isBeforePhoto,
        });
        attachments.push(attachment);
      }

      res.json(attachments);
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Dashboard stats routes
  app.get('/api/stats/tenant', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stats = await storage.getTenantStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching tenant stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/stats/supervisor', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId) {
        return res.status(400).json({ message: "User organization not found" });
      }

      const stats = await storage.getSupervisorStats(user.id, user.fmcOrganizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching supervisor stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/stats/technician', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const stats = await storage.getTechnicianStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching technician stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Advanced Analytics Dashboard Routes
  app.get('/api/analytics/dashboard', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId) {
        return res.status(400).json({ message: "User organization not found" });
      }

      // Check permissions - only supervisors and heads can view organization analytics
      if (!['fmc_head', 'fmc_supervisor', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const timeRange = req.query.timeRange as string || '30d';
      const dashboardStats = await analyticsService.getFmcDashboardStats(user.fmcOrganizationId, timeRange);
      res.json(dashboardStats);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  app.get('/api/analytics/tenant/advanced', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const timeRange = req.query.timeRange as string || '30d';
      const advancedStats = await analyticsService.getTenantAdvancedStats(userId, timeRange);
      res.json(advancedStats);
    } catch (error) {
      console.error("Error fetching tenant advanced analytics:", error);
      res.status(500).json({ message: "Failed to fetch tenant analytics" });
    }
  });

  app.get('/api/analytics/system', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      
      // Only admin can view system-wide analytics
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const timeRange = req.query.timeRange as string || '30d';
      const systemAnalytics = await analyticsService.getSystemWideAnalytics(timeRange);
      res.json(systemAnalytics);
    } catch (error) {
      console.error("Error fetching system analytics:", error);
      res.status(500).json({ message: "Failed to fetch system analytics" });
    }
  });

  // Technicians list for assignment
  app.get('/api/technicians', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId) {
        return res.status(400).json({ message: "User organization not found" });
      }

      const technicians = await storage.getUsersByRole('fmc_technician', user.fmcOrganizationId);
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  // OTP Routes
  app.post('/api/maintenance-requests/:id/generate-otp', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const requestId = req.params.id;
      const technicianId = req.user!.claims.sub;

      const result = await otpService.generateOTPForRequest(requestId, technicianId);
      res.json({
        success: true,
        message: 'OTP generated and sent to customer',
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error('Error generating OTP:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate OTP' 
      });
    }
  });

  app.post('/api/maintenance-requests/:id/verify-otp', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const requestId = req.params.id;
      const { otp } = req.body;
      const userId = req.user!.claims.sub;

      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required' });
      }

      const isValid = await otpService.verifyOTP(requestId, otp, userId);
      
      if (isValid) {
        res.json({ success: true, message: 'Work approved successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to verify OTP' 
      });
    }
  });

  app.get('/api/maintenance-requests/:id/otp-status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const requestId = req.params.id;
      const status = await otpService.getOTPStatus(requestId);
      res.json(status);
    } catch (error) {
      console.error('Error getting OTP status:', error);
      res.status(500).json({ message: 'Failed to get OTP status' });
    }
  });

  app.post('/api/maintenance-requests/:id/resend-otp', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const requestId = req.params.id;
      const technicianId = req.user!.claims.sub;

      const result = await otpService.resendOTP(requestId, technicianId);
      res.json({
        success: true,
        message: 'OTP resent to customer',
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to resend OTP' 
      });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections by user ID
  const userConnections = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection');
    let userId: string | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket received:', data);

        switch (data.type) {
          case 'authenticate':
            userId = data.userId;
            if (userId) {
              if (!userConnections.has(userId)) {
                userConnections.set(userId, new Set());
              }
              userConnections.get(userId)!.add(ws);
              ws.send(JSON.stringify({ 
                type: 'authenticated', 
                success: true,
                userId 
              }));
              console.log(`User ${userId} authenticated via WebSocket`);
            }
            break;

          case 'subscribe':
            if (userId && data.channel) {
              ws.send(JSON.stringify({ 
                type: 'subscribed', 
                channel: data.channel,
                success: true 
              }));
              console.log(`User ${userId} subscribed to ${data.channel}`);
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            console.log('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      if (userId && userConnections.has(userId)) {
        userConnections.get(userId)!.delete(ws);
        if (userConnections.get(userId)!.size === 0) {
          userConnections.delete(userId);
        }
      }
      console.log('WebSocket connection closed for user:', userId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Export WebSocket broadcast functions
  (app as any).broadcastToUser = (userId: string, data: any) => {
    const connections = userConnections.get(userId);
    if (connections) {
      const message = JSON.stringify(data);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  };

  (app as any).broadcastToAll = (data: any) => {
    const message = JSON.stringify(data);
    userConnections.forEach(connections => {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    });
  };

  // Contract Management Routes
  app.get('/api/contracts/expiring', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId || !['fmc_head', 'fmc_supervisor', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const expiringContracts = await contractService.getExpiringContracts(user.fmcOrganizationId, days);
      res.json(expiringContracts);
    } catch (error) {
      console.error("Error fetching expiring contracts:", error);
      res.status(500).json({ message: "Failed to fetch expiring contracts" });
    }
  });

  app.patch('/api/contracts/:propertyId/renew', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId || !['fmc_head', 'fmc_supervisor', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { propertyId } = req.params;
      const { newExpiryDate } = req.body;

      if (!newExpiryDate) {
        return res.status(400).json({ message: "New expiry date is required" });
      }

      await contractService.renewContract(propertyId, new Date(newExpiryDate), user.id);
      res.json({ success: true, message: "Contract renewed successfully" });
    } catch (error) {
      console.error("Error renewing contract:", error);
      res.status(500).json({ message: "Failed to renew contract" });
    }
  });

  app.post('/api/contracts/check-expiry', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await contractService.checkExpiringContracts();
      res.json({ success: true, message: "Contract expiry check completed" });
    } catch (error) {
      console.error("Error running contract expiry check:", error);
      res.status(500).json({ message: "Failed to run contract expiry check" });
    }
  });

  app.get('/api/contracts/:propertyId/access-status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { propertyId } = req.params;

      const isBlocked = await contractService.isAccessBlocked(userId, propertyId);
      res.json({ 
        accessBlocked: isBlocked,
        message: isBlocked ? "Access blocked due to expired or inactive contract" : "Access allowed"
      });
    } catch (error) {
      console.error("Error checking access status:", error);
      res.status(500).json({ message: "Failed to check access status" });
    }
  });

  // Vendor Management Routes
  // Get available vendors for FMC
  app.get('/api/vendors', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId) {
        return res.status(400).json({ message: "User organization not found" });
      }

      const { category } = req.query;
      const vendors = await vendorService.getFmcVendors(
        user.fmcOrganizationId, 
        category as string
      );
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Assign request to vendor
  app.patch('/api/maintenance-requests/:id/assign-vendor', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { vendorId, vendorContactId } = req.body;
      const requestId = req.params.id;
      const assignedBy = req.user!.claims.sub;

      if (!vendorId || !vendorContactId) {
        return res.status(400).json({ message: 'Vendor ID and contact ID are required' });
      }

      await vendorService.assignRequestToVendor(requestId, vendorId, vendorContactId, assignedBy);
      
      // Add timeline entry
      await storage.addTimelineEntry({
        requestId,
        action: "assigned_to_vendor",
        description: "Request assigned to third-party vendor",
        userId: assignedBy,
        newStatus: "assigned",
      });

      res.json({ success: true, message: 'Request assigned to vendor successfully' });
    } catch (error) {
      console.error("Error assigning request to vendor:", error);
      res.status(500).json({ message: "Failed to assign request to vendor" });
    }
  });

  // Get vendor suggestions for a request
  app.get('/api/maintenance-requests/:id/vendor-suggestions', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const requestId = req.params.id;
      const suggestions = await vendorService.suggestVendorsForRequest(requestId);
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting vendor suggestions:", error);
      res.status(500).json({ message: "Failed to get vendor suggestions" });
    }
  });

  // Vendor stats (for vendor users)
  app.get('/api/stats/vendor', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.vendorOrganizationId) {
        return res.status(400).json({ message: "User is not part of a vendor organization" });
      }

      const stats = await vendorService.getVendorStats(user.vendorOrganizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching vendor stats:", error);
      res.status(500).json({ message: "Failed to fetch vendor stats" });
    }
  });

  // Get vendor team members
  app.get('/api/vendors/:id/team', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const vendorId = req.params.id;
      const team = await vendorService.getVendorUsers(vendorId);
      res.json(team);
    } catch (error) {
      console.error("Error fetching vendor team:", error);
      res.status(500).json({ message: "Failed to fetch vendor team" });
    }
  });

  // Create vendor organization (admin only)
  app.post('/api/vendors', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const vendorData = req.body;
      const vendor = await vendorService.createVendorOrganization(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor organization:", error);
      res.status(500).json({ message: "Failed to create vendor organization" });
    }
  });

  // Create vendor partnership
  app.post('/api/vendor-partnerships', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId || !['admin', 'fmc_head'].includes(user.role)) {
        return res.status(403).json({ message: "FMC head access required" });
      }

      const partnershipData = {
        ...req.body,
        fmcOrganizationId: user.fmcOrganizationId
      };
      
      const partnership = await vendorService.createPartnership(partnershipData);
      res.status(201).json(partnership);
    } catch (error) {
      console.error("Error creating vendor partnership:", error);
      res.status(500).json({ message: "Failed to create vendor partnership" });
    }
  });

  // Quality Control Routes
  app.post('/api/maintenance-requests/:id/quality-check', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || !['fmc_supervisor', 'fmc_head', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Only supervisors can perform quality checks' });
      }

      const requestId = req.params.id;
      const qualityData = {
        ...req.body,
        requestId,
        reviewedBy: user.id
      };

      const { qualityControlService } = await import('./services/qualityControlService');
      const result = await qualityControlService.createQualityCheck(qualityData);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error creating quality check:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create quality check' 
      });
    }
  });

  app.get('/api/maintenance-requests/:id/quality-check', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const requestId = req.params.id;
      const { qualityControlService } = await import('./services/qualityControlService');
      const qualityCheck = await qualityControlService.getQualityCheck(requestId);
      
      if (!qualityCheck) {
        return res.status(404).json({ message: 'Quality check not found' });
      }
      
      res.json(qualityCheck);
    } catch (error) {
      console.error('Error fetching quality check:', error);
      res.status(500).json({ message: 'Failed to fetch quality check' });
    }
  });

  app.get('/api/quality-check/template/:category', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const category = req.params.category;
      const { qualityControlService } = await import('./services/qualityControlService');
      const template = await qualityControlService.getQualityCheckTemplate(category);
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching quality check template:', error);
      res.status(500).json({ message: 'Failed to fetch quality check template' });
    }
  });

  app.patch('/api/maintenance-requests/:id/quality-check', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || !['fmc_supervisor', 'fmc_head', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Only supervisors can update quality checks' });
      }

      const requestId = req.params.id;
      const { qualityControlService } = await import('./services/qualityControlService');
      const result = await qualityControlService.updateQualityCheck(requestId, req.body);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error updating quality check:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update quality check' 
      });
    }
  });

  app.post('/api/maintenance-requests/:id/request-rework', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user || !['fmc_supervisor', 'fmc_head', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Only supervisors can request rework' });
      }

      const requestId = req.params.id;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: 'Rework reason is required' });
      }

      const { qualityControlService } = await import('./services/qualityControlService');
      await qualityControlService.requestRework(requestId, user.id, reason);
      
      res.json({ success: true, message: 'Rework requested successfully' });
    } catch (error) {
      console.error('Error requesting rework:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to request rework' 
      });
    }
  });

  app.get('/api/analytics/quality', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.claims.sub);
      if (!user?.fmcOrganizationId || !['fmc_head', 'fmc_supervisor', 'admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const timeRange = req.query.timeRange as string || '30d';
      const { qualityControlService } = await import('./services/qualityControlService');
      const stats = await qualityControlService.getQualityStats(user.fmcOrganizationId, timeRange);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching quality analytics:', error);
      res.status(500).json({ message: 'Failed to fetch quality analytics' });
    }
  });

  // Notification management routes
  app.get('/api/notifications', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { limit = 20, offset = 0, unreadOnly = false } = req.query;
      
      const { notifications } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      let query = db.select().from(notifications).where(eq(notifications.userId, userId));
      
      if (unreadOnly === 'true') {
        query = query.where(eq(notifications.isRead, false));
      }
      
      const results = await query
        .orderBy(desc(notifications.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
        
      res.json(results);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user!.claims.sub;
      
      const { notifications } = await import('@shared/schema');
      
      const updated = await db.update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .returning();
      
      if (updated.length === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json({ success: true, data: updated[0] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const { notifications } = await import('@shared/schema');
      
      await db.update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      const { notifications } = await import('@shared/schema');
      const { count } = await import('drizzle-orm');
      
      const result = await db.select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      res.json({ unreadCount: result[0]?.count || 0 });
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  });

  app.patch('/api/notifications/preferences', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const preferences = req.body;
      
      await db.update(users)
        .set({ 
          notificationPreferences: preferences,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
        
      res.json({ success: true, message: 'Notification preferences updated' });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ message: 'Failed to update notification preferences' });
    }
  });

  // FCM Token management routes
  app.post('/api/users/fcm-token', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res.status(400).json({ success: false, message: 'FCM token is required' });
      }

      await notificationService.updateFCMToken(userId, fcmToken);
      res.json({ success: true, message: 'FCM token updated successfully' });
    } catch (error) {
      console.error('Error updating FCM token:', error);
      res.status(500).json({ success: false, message: 'Failed to update FCM token' });
    }
  });

  app.delete('/api/users/fcm-token', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      
      await db.update(users)
        .set({ fcmToken: null })
        .where(eq(users.id, userId));
        
      res.json({ success: true, message: 'FCM token removed successfully' });
    } catch (error) {
      console.error('Error removing FCM token:', error);
      res.status(500).json({ success: false, message: 'Failed to remove FCM token' });
    }
  });

  app.post('/api/test/push-notification', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { title, message } = req.body;

      await notificationService.sendNotification({
        userId,
        title: title || 'Test Push Notification',
        message: message || 'This is a test push notification from Zariya FMC',
        type: 'info',
        channels: ['push']
      });

      res.json({ success: true, message: 'Test push notification sent' });
    } catch (error) {
      console.error('Error sending test push notification:', error);
      res.status(500).json({ success: false, message: 'Failed to send test push notification' });
    }
  });

  // Initialize WebSocket service
  websocketService.initialize(app);

  // Webhook routes for delivery status tracking
  app.post('/api/webhooks/twilio/sms-status', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req: Request, res: Response) => {
    try {
      const body = new URLSearchParams(req.body.toString());
      const messageStatus = body.get('MessageStatus');
      const messageSid = body.get('MessageSid');
      const notificationId = req.query.notificationId as string;

      console.log('Twilio SMS webhook:', { messageStatus, messageSid, notificationId });

      if (notificationId && messageStatus && messageSid) {
        let status = 'pending';
        switch (messageStatus) {
          case 'sent':
          case 'delivered':
            status = 'delivered';
            break;
          case 'failed':
          case 'undelivered':
            status = 'failed';
            break;
          case 'read':
            status = 'read';
            break;
        }

        await notificationService.updateDeliveryStatus(notificationId, 'sms', status, messageSid);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing SMS webhook:', error);
      res.status(500).send('Error');
    }
  });

  app.post('/api/webhooks/twilio/whatsapp-status', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req: Request, res: Response) => {
    try {
      const body = new URLSearchParams(req.body.toString());
      const messageStatus = body.get('MessageStatus');
      const messageSid = body.get('MessageSid');
      const notificationId = req.query.notificationId as string;

      console.log('Twilio WhatsApp webhook:', { messageStatus, messageSid, notificationId });

      if (notificationId && messageStatus && messageSid) {
        let status = 'pending';
        switch (messageStatus) {
          case 'sent':
          case 'delivered':
            status = 'delivered';
            break;
          case 'failed':
          case 'undelivered':
            status = 'failed';
            break;
          case 'read':
            status = 'read';
            break;
        }

        await notificationService.updateDeliveryStatus(notificationId, 'whatsapp', status, messageSid);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      res.status(500).send('Error');
    }
  });

  app.get('/api/notifications/track/email-open', async (req: Request, res: Response) => {
    try {
      const notificationId = req.query.id as string;
      
      if (notificationId && notificationId !== 'unknown') {
        await notificationService.updateDeliveryStatus(notificationId, 'email', 'read');
      }

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      
      res.set({
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(pixel);
    } catch (error) {
      console.error('Error tracking email open:', error);
      res.status(200).send(); // Still return success to avoid broken images
    }
  });

  app.post('/api/notifications/:id/mark-read', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user!.claims.sub;
      
      await notificationService.markNotificationAsRead(notificationId, userId);
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
  });

  app.get('/api/notifications/:id/delivery-status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = req.params.id;
      const status = await notificationService.getNotificationDeliveryStatus(notificationId);
      
      if (!status) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Error getting notification delivery status:', error);
      res.status(500).json({ message: 'Failed to get delivery status' });
    }
  });

  return httpServer;
}

  // Invite code validation route
  app.post('/api/auth/validate-invite', async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: 'Invite code is required' });
      }

      const invite = await storage.validateInviteCode(code);
      if (!invite) {
        return res.status(400).json({ message: 'Invalid or expired invite code' });
      }

      res.json({ 
        valid: true, 
        role: invite.role,
        organizationId: invite.fmcOrganizationId
      });
    } catch (error) {
      console.error('Error validating invite code:', error);
      res.status(500).json({ message: 'Failed to validate invite code' });
    }
  });

  // Create invite code (admin/supervisor only)
  app.post('/api/invite-codes', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { role, expiresIn = 7 } = req.body; // expiresIn is days
      const creatorId = req.user!.claims.sub;
      const creator = await storage.getUser(creatorId);
      
      if (!creator || !creator.fmcOrganizationId) {
        return res.status(400).json({ message: 'User organization not found' });
      }

      // Check if user has permission to create invite codes
      if (!['admin', 'fmc_head', 'fmc_supervisor'].includes(creator.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);

      const invite = await storage.createInviteCode({
        code,
        fmcOrganizationId: creator.fmcOrganizationId,
        role: role as any,
        expiresAt,
        createdBy: creatorId,
        isActive: true,
      });

      res.status(201).json(invite);
    } catch (error) {
      console.error('Error creating invite code:', error);
      res.status(500).json({ message: 'Failed to create invite code' });
    }
  });
