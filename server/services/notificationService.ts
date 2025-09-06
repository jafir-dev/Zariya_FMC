import { db } from '../db';
import { notifications, users, maintenanceRequests, notificationDeliveryLogs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  data?: Record<string, any>;
  channels?: ('email' | 'sms' | 'whatsapp' | 'push')[];
  requestId?: string;
}

class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: any = null;
  private whatsappFrom: string = '';
  private firebaseApp: admin.app.App | null = null;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    // Initialize Firebase Admin SDK for push notifications
    if (process.env.VITE_FIREBASE_PROJECT_ID && !admin.apps.length) {
      try {
        // Initialize with service account (in production, use service account JSON)
        // For development, we'll use the project ID and default credentials
        this.firebaseApp = admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          // In production, add credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
      } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
      }
    }

    // Initialize email service (SendGrid)
    if (process.env.SENDGRID_API_KEY) {
      this.emailTransporter = nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.SMTP_HOST) {
      // Fallback to SMTP
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    // Initialize Twilio for SMS and WhatsApp
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || '';
    }
  }

  async sendNotification(data: NotificationData): Promise<string | null> {
    try {
      // Store notification in database
      const [notification] = await db.insert(notifications).values({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        data: data.data || {},
        sentAt: new Date(),
        deliveryAttempts: 0,
        channelsSent: [],
        deliveryStatus: {},
        externalMessageIds: {},
      }).returning();

      if (!notification) {
        throw new Error('Failed to create notification record');
      }

      // Get user details for sending external notifications
      const user = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
      if (user.length === 0) {
        console.error('User not found for notification:', data.userId);
        return null;
      }

      const userData = user[0];
      const preferences = userData.notificationPreferences as Record<string, any> || {};
      const channels = data.channels || ['email', 'push'];
      const channelsSent: string[] = [];
      const deliveryStatus: Record<string, any> = {};
      const externalMessageIds: Record<string, any> = {};

      // Send email notification
      if (channels.includes('email') && preferences.email !== false) {
        const result = await this.sendEmailNotification(userData, data, notification.id);
        if (result.success) {
          channelsSent.push('email');
          deliveryStatus.email = 'sent';
          if (result.messageId) {
            externalMessageIds.email = result.messageId;
          }
          await this.logDeliveryAttempt(notification.id, 'email', 'sendgrid', result.messageId, 'sent');
        } else {
          deliveryStatus.email = 'failed';
          await this.logDeliveryAttempt(notification.id, 'email', 'sendgrid', null, 'failed', result.error);
        }
      }

      // Send SMS notification
      if (channels.includes('sms') && preferences.sms !== false && userData.phoneNumber) {
        const result = await this.sendSMSNotification(userData, data, notification.id);
        if (result.success) {
          channelsSent.push('sms');
          deliveryStatus.sms = 'sent';
          if (result.messageId) {
            externalMessageIds.sms = result.messageId;
          }
          await this.logDeliveryAttempt(notification.id, 'sms', 'twilio', result.messageId, 'sent');
        } else {
          deliveryStatus.sms = 'failed';
          await this.logDeliveryAttempt(notification.id, 'sms', 'twilio', null, 'failed', result.error);
        }
      }

      // Send WhatsApp notification
      if (channels.includes('whatsapp') && preferences.whatsapp !== false && userData.phoneNumber) {
        const result = await this.sendWhatsAppNotification(userData, data, notification.id);
        if (result.success) {
          channelsSent.push('whatsapp');
          deliveryStatus.whatsapp = 'sent';
          if (result.messageId) {
            externalMessageIds.whatsapp = result.messageId;
          }
          await this.logDeliveryAttempt(notification.id, 'whatsapp', 'twilio', result.messageId, 'sent');
        } else {
          deliveryStatus.whatsapp = 'failed';
          await this.logDeliveryAttempt(notification.id, 'whatsapp', 'twilio', null, 'failed', result.error);
        }
      }

      // Send push notification
      if (channels.includes('push') && preferences.push !== false) {
        const result = await this.sendPushNotification(userData, data, notification.id);
        if (result.success) {
          channelsSent.push('push');
          deliveryStatus.push = 'sent';
          if (result.messageId) {
            externalMessageIds.push = result.messageId;
          }
          await this.logDeliveryAttempt(notification.id, 'push', 'firebase', result.messageId, 'sent');
        } else {
          deliveryStatus.push = 'failed';
          await this.logDeliveryAttempt(notification.id, 'push', 'firebase', null, 'failed', result.error);
        }
      }

      // Update notification with delivery status
      await db.update(notifications)
        .set({
          channelsSent,
          deliveryStatus,
          externalMessageIds,
          deliveryAttempts: 1,
        })
        .where(eq(notifications.id, notification.id));

      return notification.id;

    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  private async sendEmailNotification(user: any, data: NotificationData, notificationId: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.emailTransporter || !user.email) {
      return { success: false, error: 'Email transporter not configured or user has no email' };
    }

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@zariya-fmc.com',
      to: user.email,
      subject: data.title,
      html: this.generateEmailTemplate(user, data),
      headers: {
        'X-Notification-ID': notificationId,
      },
    };

    try {
      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', user.email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendSMSNotification(user: any, data: NotificationData, notificationId: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.twilioClient || !user.phoneNumber) {
      return { success: false, error: 'Twilio client not configured or user has no phone number' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: `${data.title}\n\n${data.message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber,
        statusCallback: `${process.env.BACKEND_URL}/api/webhooks/twilio/sms-status?notificationId=${notificationId}`,
      });
      console.log('SMS sent successfully to:', user.phoneNumber);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendWhatsAppNotification(user: any, data: NotificationData, notificationId: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.twilioClient || !user.phoneNumber || !this.whatsappFrom) {
      return { success: false, error: 'Twilio client not configured, user has no phone number, or WhatsApp number not configured' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: `${data.title}\n\n${data.message}`,
        from: this.whatsappFrom,
        to: `whatsapp:${user.phoneNumber}`,
        statusCallback: `${process.env.BACKEND_URL}/api/webhooks/twilio/whatsapp-status?notificationId=${notificationId}`,
      });
      console.log('WhatsApp sent successfully to:', user.phoneNumber);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendPushNotification(user: any, data: NotificationData, notificationId: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.firebaseApp || !user.fcmToken) {
      return { success: false, error: 'Firebase not initialized or user has no FCM token' };
    }

    try {
      const message = {
        token: user.fcmToken,
        notification: {
          title: data.title,
          body: data.message,
        },
        data: {
          type: data.type,
          requestId: data.requestId || '',
          userId: data.userId,
          notificationId,
          timestamp: new Date().toISOString(),
          ...(data.data || {})
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#2563eb',
            sound: 'default',
            priority: 'high' as const,
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1,
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Push notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Push notification failed:', error);
      
      // Handle invalid token - remove it from user record
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        await this.removeFCMToken(user.id);
      }
      
      return { success: false, error: error.message };
    }
  }

  private async logDeliveryAttempt(
    notificationId: string, 
    channel: string, 
    provider: string | null, 
    externalMessageId: string | null, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(notificationDeliveryLogs).values({
        notificationId,
        channel,
        provider,
        externalMessageId,
        status,
        errorMessage,
        deliveredAt: status === 'sent' || status === 'delivered' ? new Date() : null,
      });
    } catch (error) {
      console.error('Failed to log delivery attempt:', error);
    }
  }

  async updateDeliveryStatus(
    notificationId: string, 
    channel: string, 
    status: string, 
    externalMessageId?: string, 
    errorMessage?: string
  ): Promise<void> {
    try {
      // Update delivery log
      const whereCondition = externalMessageId 
        ? and(eq(notificationDeliveryLogs.notificationId, notificationId), eq(notificationDeliveryLogs.externalMessageId, externalMessageId))
        : and(eq(notificationDeliveryLogs.notificationId, notificationId), eq(notificationDeliveryLogs.channel, channel));
      
      await db.update(notificationDeliveryLogs)
        .set({
          status,
          errorMessage,
          deliveredAt: status === 'delivered' ? new Date() : undefined,
          readAt: status === 'read' ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(whereCondition);

      // Update main notification record
      const updateData: any = {};
      const timestampField = `${channel}DeliveredAt`;
      
      if (status === 'delivered') {
        updateData[timestampField] = new Date();
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(notifications)
          .set(updateData)
          .where(eq(notifications.id, notificationId));
      }

      console.log(`Updated delivery status for notification ${notificationId}, channel ${channel}: ${status}`);
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

      // Update all delivery logs for this notification to 'read' status
      await db.update(notificationDeliveryLogs)
        .set({
          status: 'read',
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notificationDeliveryLogs.notificationId, notificationId));

      console.log(`Marked notification ${notificationId} as read for user ${userId}`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async getNotificationDeliveryStatus(notificationId: string): Promise<any> {
    try {
      const notification = await db.select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1);

      if (notification.length === 0) {
        return null;
      }

      const deliveryLogs = await db.select()
        .from(notificationDeliveryLogs)
        .where(eq(notificationDeliveryLogs.notificationId, notificationId));

      return {
        notification: notification[0],
        deliveryLogs,
      };
    } catch (error) {
      console.error('Failed to get notification delivery status:', error);
      return null;
    }
  }

  private async removeFCMToken(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set({ fcmToken: null })
        .where(eq(users.id, userId));
      console.log('Removed invalid FCM token for user:', userId);
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  async updateFCMToken(userId: string, fcmToken: string): Promise<void> {
    try {
      await db.update(users)
        .set({ fcmToken })
        .where(eq(users.id, userId));
      console.log('Updated FCM token for user:', userId);
    } catch (error) {
      console.error('Error updating FCM token:', error);
    }
  }

  async sendBulkPushNotification(userTokens: string[], notification: { title: string, body: string }, data?: Record<string, string>): Promise<void> {
    if (!this.firebaseApp || userTokens.length === 0) {
      console.log('Bulk push notification skipped - Firebase not initialized or no tokens');
      return;
    }

    try {
      const message = {
        notification,
        data: data || {},
        tokens: userTokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`Bulk push notification sent: ${response.successCount} successful, ${response.failureCount} failed`);

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token ${userTokens[idx]}:`, resp.error);
          }
        });
      }
    } catch (error) {
      console.error('Bulk push notification failed:', error);
    }
  }

  private generateEmailTemplate(user: any, data: NotificationData): string {
    const trackingPixelUrl = `${process.env.BACKEND_URL}/api/notifications/track/email-open?id=${data.data?.notificationId || 'unknown'}`;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${data.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
            .header { color: #2563eb; margin-bottom: 20px; }
            .content { line-height: 1.6; color: #374151; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="header">${data.title}</h1>
            <div class="content">
              <p>Hello ${user.firstName || 'User'},</p>
              <p>${data.message}</p>
              ${data.requestId ? `<a href="${process.env.FRONTEND_URL}/request/${data.requestId}?utm_source=email&utm_medium=notification" class="button">View Request</a>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message from Zariya FMC Platform.</p>
              <p>To manage your notification preferences, please log in to your account.</p>
            </div>
          </div>
          <!-- Email tracking pixel -->
          <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />
        </body>
      </html>
    `;
  }

  // Helper methods for common notification scenarios
  async notifyRequestCreated(requestId: string, tenantId: string, supervisorId?: string): Promise<void> {
    const request = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, requestId)).limit(1);
    if (request.length === 0) return;

    const requestData = request[0];

    // Notify supervisor
    if (supervisorId) {
      await this.sendNotification({
        userId: supervisorId,
        title: 'New Maintenance Request',
        message: `A new maintenance request has been created: ${requestData.title}`,
        type: 'info',
        requestId,
        data: { requestId, action: 'created' },
        channels: ['email', 'push']
      });
    }
  }

  async notifyRequestAssigned(requestId: string, technicianId: string): Promise<void> {
    const request = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, requestId)).limit(1);
    if (request.length === 0) return;

    const requestData = request[0];

    await this.sendNotification({
      userId: technicianId,
      title: 'Request Assigned to You',
      message: `You have been assigned to work on: ${requestData.title}`,
      type: 'info',
      requestId,
      data: { requestId, action: 'assigned' },
      channels: ['email', 'sms', 'push']
    });
  }

  async notifyRequestStatusUpdate(requestId: string, userId: string, oldStatus: string, newStatus: string): Promise<void> {
    const request = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, requestId)).limit(1);
    if (request.length === 0) return;

    const requestData = request[0];

    await this.sendNotification({
      userId,
      title: 'Request Status Updated',
      message: `Your maintenance request "${requestData.title}" status has been updated from ${oldStatus} to ${newStatus}`,
      type: 'info',
      requestId,
      data: { requestId, oldStatus, newStatus },
      channels: ['email', 'push']
    });
  }

  async notifyOTPGenerated(userId: string, otp: string, requestId: string): Promise<void> {
    await this.sendNotification({
      userId,
      title: 'Work Completion Verification',
      message: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      type: 'info',
      requestId,
      data: { otp, requestId, action: 'otp_generated' },
      channels: ['sms', 'whatsapp', 'email']
    });
  }
}

export const notificationService = new NotificationService();