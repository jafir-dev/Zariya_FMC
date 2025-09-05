import { db } from '../db';
import { notifications, users, maintenanceRequests } from '@shared/schema';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

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

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
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

  async sendNotification(data: NotificationData): Promise<void> {
    try {
      // Store notification in database
      await db.insert(notifications).values({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        data: data.data || {},
        sentAt: new Date(),
      });

      // Get user details for sending external notifications
      const user = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
      if (user.length === 0) {
        console.error('User not found for notification:', data.userId);
        return;
      }

      const userData = user[0];
      const preferences = userData.notificationPreferences as Record<string, any> || {};
      const channels = data.channels || ['email', 'push'];

      // Send email notification
      if (channels.includes('email') && preferences.email !== false) {
        await this.sendEmailNotification(userData, data);
      }

      // Send SMS notification
      if (channels.includes('sms') && preferences.sms !== false && userData.phoneNumber) {
        await this.sendSMSNotification(userData, data);
      }

      // Send WhatsApp notification
      if (channels.includes('whatsapp') && preferences.whatsapp !== false && userData.phoneNumber) {
        await this.sendWhatsAppNotification(userData, data);
      }

      // Send push notification (placeholder for now)
      if (channels.includes('push') && preferences.push !== false) {
        await this.sendPushNotification(userData, data);
      }

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  private async sendEmailNotification(user: any, data: NotificationData): Promise<void> {
    if (!this.emailTransporter || !user.email) return;

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@zariya-fmc.com',
      to: user.email,
      subject: data.title,
      html: this.generateEmailTemplate(user, data),
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', user.email);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  private async sendSMSNotification(user: any, data: NotificationData): Promise<void> {
    if (!this.twilioClient || !user.phoneNumber) return;

    try {
      await this.twilioClient.messages.create({
        body: `${data.title}\n\n${data.message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber,
      });
      console.log('SMS sent successfully to:', user.phoneNumber);
    } catch (error) {
      console.error('SMS sending failed:', error);
    }
  }

  private async sendWhatsAppNotification(user: any, data: NotificationData): Promise<void> {
    if (!this.twilioClient || !user.phoneNumber || !this.whatsappFrom) return;

    try {
      await this.twilioClient.messages.create({
        body: `${data.title}\n\n${data.message}`,
        from: this.whatsappFrom,
        to: `whatsapp:${user.phoneNumber}`,
      });
      console.log('WhatsApp sent successfully to:', user.phoneNumber);
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
    }
  }

  private async sendPushNotification(user: any, data: NotificationData): Promise<void> {
    // Placeholder for push notification implementation
    // This would integrate with Firebase Cloud Messaging or Apple Push Notification Service
    console.log('Push notification placeholder for user:', user.id);
  }

  private generateEmailTemplate(user: any, data: NotificationData): string {
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
              ${data.requestId ? `<a href="${process.env.FRONTEND_URL}/request/${data.requestId}" class="button">View Request</a>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message from Zariya FMC Platform.</p>
              <p>To manage your notification preferences, please log in to your account.</p>
            </div>
          </div>
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