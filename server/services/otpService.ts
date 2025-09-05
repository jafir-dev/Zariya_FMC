import { db } from '../db';
import { maintenanceRequests, users, properties } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { notificationService } from './notificationService';

export interface OTPVerification {
  requestId: string;
  otp: string;
  userId: string;
}

class OTPService {
  private generateOTP(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateOTPForRequest(requestId: string, technicianId: string): Promise<{ otp: string; expiresAt: Date }> {
    try {
      // Get the request details
      const request = await db.select({
        id: maintenanceRequests.id,
        propertyId: maintenanceRequests.propertyId,
        title: maintenanceRequests.title,
        status: maintenanceRequests.status
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);

      if (request.length === 0) {
        throw new Error('Request not found');
      }

      const requestData = request[0];

      // Ensure request is completed
      if (requestData.status !== 'completed') {
        throw new Error('Request must be completed before generating OTP');
      }

      // Get the property and tenant details
      const propertyData = await db.select({
        userId: properties.userId
      })
      .from(properties)
      .where(eq(properties.id, requestData.propertyId))
      .limit(1);

      if (propertyData.length === 0 || !propertyData[0].userId) {
        throw new Error('Property tenant not found');
      }

      const tenantId = propertyData[0].userId;

      // Generate OTP and set expiry (10 minutes from now)
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update the request with OTP
      await db.update(maintenanceRequests)
        .set({
          customerApprovalOtp: otp,
          otpExpiresAt: expiresAt,
          updatedAt: new Date()
        })
        .where(eq(maintenanceRequests.id, requestId));

      // Send OTP to tenant via notification service
      await notificationService.notifyOTPGenerated(tenantId, otp, requestId);

      console.log(`OTP generated for request ${requestId}: ${otp} (expires at ${expiresAt})`);

      return { otp, expiresAt };
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw error;
    }
  }

  async verifyOTP(requestId: string, providedOtp: string, userId: string): Promise<boolean> {
    try {
      // Get the request with OTP details
      const request = await db.select({
        id: maintenanceRequests.id,
        customerApprovalOtp: maintenanceRequests.customerApprovalOtp,
        otpExpiresAt: maintenanceRequests.otpExpiresAt,
        isCustomerApproved: maintenanceRequests.isCustomerApproved,
        propertyId: maintenanceRequests.propertyId,
        title: maintenanceRequests.title
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);

      if (request.length === 0) {
        throw new Error('Request not found');
      }

      const requestData = request[0];

      // Check if request is already approved
      if (requestData.isCustomerApproved) {
        throw new Error('Request is already approved');
      }

      // Check if OTP exists
      if (!requestData.customerApprovalOtp) {
        throw new Error('No OTP found for this request');
      }

      // Check if OTP has expired
      if (!requestData.otpExpiresAt || new Date() > requestData.otpExpiresAt) {
        throw new Error('OTP has expired');
      }

      // Verify the OTP
      if (requestData.customerApprovalOtp !== providedOtp) {
        return false;
      }

      // Verify that the user is the tenant of this property
      const propertyData = await db.select({
        userId: properties.userId
      })
      .from(properties)
      .where(eq(properties.id, requestData.propertyId))
      .limit(1);

      if (propertyData.length === 0 || propertyData[0].userId !== userId) {
        throw new Error('User not authorized to approve this request');
      }

      // Mark request as approved and clear OTP
      await db.update(maintenanceRequests)
        .set({
          isCustomerApproved: true,
          customerApprovalOtp: null,
          otpExpiresAt: null,
          status: 'closed',
          actualCompletionDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(maintenanceRequests.id, requestId));

      // Notify relevant parties about approval
      await notificationService.sendNotification({
        userId: userId,
        title: 'Work Approved',
        message: `You have successfully approved the work for "${requestData.title}"`,
        type: 'success',
        requestId,
        data: { requestId, action: 'approved' }
      });

      console.log(`OTP verified successfully for request ${requestId} by user ${userId}`);
      return true;

    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  async resendOTP(requestId: string, technicianId: string): Promise<{ otp: string; expiresAt: Date }> {
    try {
      // Generate new OTP (same logic as generateOTPForRequest)
      return await this.generateOTPForRequest(requestId, technicianId);
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw error;
    }
  }

  async getOTPStatus(requestId: string): Promise<{
    hasOTP: boolean;
    isExpired: boolean;
    isApproved: boolean;
    expiresAt?: Date;
  }> {
    try {
      const request = await db.select({
        customerApprovalOtp: maintenanceRequests.customerApprovalOtp,
        otpExpiresAt: maintenanceRequests.otpExpiresAt,
        isCustomerApproved: maintenanceRequests.isCustomerApproved
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);

      if (request.length === 0) {
        throw new Error('Request not found');
      }

      const requestData = request[0];

      return {
        hasOTP: !!requestData.customerApprovalOtp,
        isExpired: requestData.otpExpiresAt ? new Date() > requestData.otpExpiresAt : false,
        isApproved: requestData.isCustomerApproved,
        expiresAt: requestData.otpExpiresAt || undefined
      };

    } catch (error) {
      console.error('Error getting OTP status:', error);
      throw error;
    }
  }
}

export const otpService = new OTPService();