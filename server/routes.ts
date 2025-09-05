import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { auth } from './firebase';
import { insertMaintenanceRequestSchema, insertAttachmentSchema, insertInviteCodeSchema, users, type User } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { storage } from "./storage";

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
  user?: User;
}

const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const user = await storage.getUser(decodedToken.uid);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {

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
      const { id, email, firstName, lastName, role } = req.body;
      
      const user = await db.insert(users).values({
        id,
        email,
        firstName,
        lastName,
        role: role || 'tenant',
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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Buildings routes
  app.get('/api/buildings', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.tenantId) {
        return res.status(400).json({ message: "User tenant not found" });
      }

      const buildings = await storage.getBuildings(req.user.tenantId);
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ message: "Failed to fetch buildings" });
    }
  });

  // Properties routes
  app.get('/api/properties', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const properties = await storage.getPropertiesForUser(req.user!.id);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Maintenance requests routes
  app.post('/api/maintenance-requests', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const validatedData = insertMaintenanceRequestSchema.parse({
        ...req.body,
        tenantId: user.tenantId,
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

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      res.status(500).json({ message: "Failed to create maintenance request" });
    }
  });

  app.get('/api/maintenance-requests', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const filters: any = { tenantId: user.tenantId };

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
      const userId = req.user!.id;

      const updated = await storage.updateMaintenanceRequestStatus(req.params.id, status, userId);
      res.json(updated);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ message: "Failed to update request status" });
    }
  });

  app.patch('/api/maintenance-requests/:id/assign', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { technicianId } = req.body;
      const supervisorId = req.user!.id;

      const updated = await storage.assignTechnician(req.params.id, technicianId, supervisorId);
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
      const userId = req.user!.id;
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
      const stats = await storage.getTenantStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching tenant stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/stats/supervisor', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      if (!user.tenantId) {
        return res.status(400).json({ message: "User tenant not found" });
      }

      const stats = await storage.getSupervisorStats(user.id, user.tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching supervisor stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/stats/technician', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getTechnicianStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching technician stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Technicians list for assignment
  app.get('/api/technicians', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      if (!user.tenantId) {
        return res.status(400).json({ message: "User tenant not found" });
      }

      const technicians = await storage.getUsersByRole('fmc_technician', user.tenantId);
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates (temporarily disabled)
  // const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  // 
  // wss.on('connection', (ws) => {
  //   console.log('New WebSocket connection');
  // 
  //   ws.on('message', (message) => {
  //     try {
  //       const data = JSON.parse(message.toString());
  //       console.log('Received:', data);
  // 
  //       // Echo back for now - implement real-time features later
  //       if (ws.readyState === WebSocket.OPEN) {
  //         ws.send(JSON.stringify({ type: 'echo', data }));
  //       }
  //     } catch (error) {
  //       console.error('WebSocket message error:', error);
  //     }
  //   });
  // 
  //   ws.on('close', () => {
  //     console.log('WebSocket connection closed');
  //   });
  // });

  return httpServer;
}
