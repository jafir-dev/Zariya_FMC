import type { Express } from "express";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
  channel?: string;
}

class WebSocketService {
  private app: Express | null = null;

  initialize(app: Express) {
    this.app = app;
  }

  private broadcast(userId: string, message: WebSocketMessage) {
    if (!this.app) {
      console.error('WebSocket service not initialized');
      return;
    }

    message.timestamp = new Date().toISOString();
    (this.app as any).broadcastToUser?.(userId, message);
  }

  private broadcastToAll(message: WebSocketMessage) {
    if (!this.app) {
      console.error('WebSocket service not initialized');
      return;
    }

    message.timestamp = new Date().toISOString();
    (this.app as any).broadcastToAll?.(message);
  }

  // Request-related real-time updates
  notifyRequestCreated(userId: string, requestData: any) {
    this.broadcast(userId, {
      type: 'request_created',
      data: {
        request: requestData,
        message: `New maintenance request created: ${requestData.title}`
      },
      channel: 'requests'
    });
  }

  notifyRequestAssigned(technicianId: string, requestData: any, supervisorId?: string) {
    // Notify technician
    this.broadcast(technicianId, {
      type: 'request_assigned',
      data: {
        request: requestData,
        message: `You have been assigned to: ${requestData.title}`
      },
      channel: 'assignments'
    });

    // Notify supervisor if present
    if (supervisorId) {
      this.broadcast(supervisorId, {
        type: 'request_assignment_confirmed',
        data: {
          request: requestData,
          message: `Request assigned to technician: ${requestData.title}`
        },
        channel: 'assignments'
      });
    }
  }

  notifyRequestStatusChanged(userId: string, requestData: any, oldStatus: string, newStatus: string) {
    this.broadcast(userId, {
      type: 'request_status_changed',
      data: {
        request: requestData,
        oldStatus,
        newStatus,
        message: `Request "${requestData.title}" status changed from ${oldStatus} to ${newStatus}`
      },
      channel: 'requests'
    });
  }

  notifyOTPGenerated(tenantId: string, requestId: string, expiresAt: Date) {
    this.broadcast(tenantId, {
      type: 'otp_generated',
      data: {
        requestId,
        expiresAt,
        message: 'Verification code sent to approve completed work'
      },
      channel: 'otp'
    });
  }

  notifyOTPVerified(requestId: string, technicianId: string, supervisorId?: string) {
    const message = 'Work has been approved by customer';
    
    // Notify technician
    this.broadcast(technicianId, {
      type: 'otp_verified',
      data: {
        requestId,
        message
      },
      channel: 'otp'
    });

    // Notify supervisor
    if (supervisorId) {
      this.broadcast(supervisorId, {
        type: 'otp_verified',
        data: {
          requestId,
          message
        },
        channel: 'otp'
      });
    }
  }

  // File upload notifications
  notifyFileUploaded(requestId: string, userId: string, fileName: string, isBeforePhoto: boolean) {
    this.broadcast(userId, {
      type: 'file_uploaded',
      data: {
        requestId,
        fileName,
        isBeforePhoto,
        message: `${isBeforePhoto ? 'Before' : 'After'} photo uploaded: ${fileName}`
      },
      channel: 'files'
    });
  }

  // General notification updates
  notifyNewNotification(userId: string, notification: any) {
    this.broadcast(userId, {
      type: 'new_notification',
      data: {
        notification,
        message: notification.title
      },
      channel: 'notifications'
    });
  }

  // Dashboard updates
  notifyDashboardUpdate(userId: string, stats: any) {
    this.broadcast(userId, {
      type: 'dashboard_update',
      data: {
        stats,
        message: 'Dashboard statistics updated'
      },
      channel: 'dashboard'
    });
  }

  // System-wide announcements
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.broadcastToAll({
      type: 'system_message',
      data: {
        message,
        level: type
      },
      channel: 'system'
    });
  }

  // User activity notifications
  notifyUserOnline(userId: string, userData: any) {
    this.broadcast(userId, {
      type: 'user_online',
      data: {
        user: userData,
        message: `Welcome back, ${userData.firstName || 'User'}`
      },
      channel: 'user_activity'
    });
  }

  // Request timeline updates
  notifyTimelineUpdate(requestId: string, userId: string, timelineEntry: any) {
    this.broadcast(userId, {
      type: 'timeline_update',
      data: {
        requestId,
        timelineEntry,
        message: `New activity: ${timelineEntry.action}`
      },
      channel: 'timeline'
    });
  }
}

export const websocketService = new WebSocketService();