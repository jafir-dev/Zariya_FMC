import { db } from '../db';
import { maintenanceRequests, qualityControlChecks, users, properties } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { notificationService } from './notificationService';

export interface QualityControlCheck {
  requestId: string;
  checklistItems: QualityCheckItem[];
  overallRating: number;
  comments: string;
  reviewedBy: string;
  photos?: string[];
}

export interface QualityCheckItem {
  id: string;
  description: string;
  isCompliant: boolean;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
}

class QualityControlService {
  private defaultChecklistsByCategory: Record<string, QualityCheckItem[]> = {
    plumbing: [
      {
        id: 'plumbing-1',
        description: 'Water pressure is adequate',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'plumbing-2', 
        description: 'No visible leaks after repair',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'plumbing-3',
        description: 'All fittings are secure',
        isCompliant: false,
        priority: 'medium'
      },
      {
        id: 'plumbing-4',
        description: 'Work area is clean and tidy',
        isCompliant: false,
        priority: 'low'
      }
    ],
    electrical: [
      {
        id: 'electrical-1',
        description: 'All electrical connections are secure',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'electrical-2',
        description: 'Circuit breakers function properly',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'electrical-3',
        description: 'Proper grounding is in place',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'electrical-4',
        description: 'Work meets safety standards',
        isCompliant: false,
        priority: 'high'
      }
    ],
    hvac: [
      {
        id: 'hvac-1',
        description: 'Air flow is adequate',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'hvac-2',
        description: 'Temperature controls work properly',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'hvac-3',
        description: 'Filters are clean/replaced',
        isCompliant: false,
        priority: 'medium'
      },
      {
        id: 'hvac-4',
        description: 'No unusual noises during operation',
        isCompliant: false,
        priority: 'medium'
      }
    ],
    general: [
      {
        id: 'general-1',
        description: 'Work completed as requested',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'general-2',
        description: 'Quality meets professional standards',
        isCompliant: false,
        priority: 'high'
      },
      {
        id: 'general-3',
        description: 'Work area cleaned after completion',
        isCompliant: false,
        priority: 'medium'
      },
      {
        id: 'general-4',
        description: 'Customer satisfied with results',
        isCompliant: false,
        priority: 'high'
      }
    ]
  };

  async createQualityCheck(data: QualityControlCheck): Promise<any> {
    try {
      // Verify the request exists and is completed
      const request = await db.select()
        .from(maintenanceRequests)
        .where(eq(maintenanceRequests.id, data.requestId))
        .limit(1);

      if (request.length === 0) {
        throw new Error('Maintenance request not found');
      }

      const requestData = request[0];

      if (requestData.status !== 'completed') {
        throw new Error('Quality check can only be performed on completed requests');
      }

      // Check if quality check already exists
      const existingCheck = await db.select()
        .from(qualityControlChecks)
        .where(eq(qualityControlChecks.requestId, data.requestId))
        .limit(1);

      if (existingCheck.length > 0) {
        throw new Error('Quality check already exists for this request');
      }

      // Calculate compliance score
      const totalItems = data.checklistItems.length;
      const compliantItems = data.checklistItems.filter(item => item.isCompliant).length;
      const complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 0;

      // Determine if quality check passes (80% compliance for high priority, 90% overall)
      const highPriorityItems = data.checklistItems.filter(item => item.priority === 'high');
      const highPriorityCompliant = highPriorityItems.filter(item => item.isCompliant);
      const highPriorityScore = highPriorityItems.length > 0 ? 
        (highPriorityCompliant.length / highPriorityItems.length) * 100 : 100;

      const passed = complianceScore >= 80 && highPriorityScore >= 90;

      // Create quality control record
      const qualityCheck = await db.insert(qualityControlChecks).values({
        requestId: data.requestId,
        reviewedBy: data.reviewedBy,
        checklistItems: data.checklistItems,
        overallRating: data.overallRating,
        complianceScore,
        passed,
        comments: data.comments,
        reviewDate: new Date(),
        photos: data.photos || []
      }).returning();

      // Update request status based on quality check result
      const newStatus = passed ? 'quality_approved' : 'quality_rejected';
      await db.update(maintenanceRequests)
        .set({ 
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(maintenanceRequests.id, data.requestId));

      // Send notifications based on result
      await this.sendQualityCheckNotifications(data.requestId, passed, complianceScore, data.reviewedBy);

      console.log(`Quality check completed for request ${data.requestId}: ${passed ? 'PASSED' : 'FAILED'} (${complianceScore}% compliance)`);

      return qualityCheck[0];
    } catch (error) {
      console.error('Error creating quality check:', error);
      throw error;
    }
  }

  async getQualityCheckTemplate(category: string): Promise<QualityCheckItem[]> {
    const template = this.defaultChecklistsByCategory[category] || this.defaultChecklistsByCategory.general;
    
    // Return a fresh copy with unique IDs
    return template.map(item => ({
      ...item,
      id: `${item.id}-${Date.now()}`
    }));
  }

  async getQualityCheck(requestId: string): Promise<any> {
    try {
      const qualityCheck = await db.select()
        .from(qualityControlChecks)
        .where(eq(qualityControlChecks.requestId, requestId))
        .limit(1);

      return qualityCheck.length > 0 ? qualityCheck[0] : null;
    } catch (error) {
      console.error('Error fetching quality check:', error);
      throw error;
    }
  }

  async updateQualityCheck(requestId: string, updates: Partial<QualityControlCheck>): Promise<any> {
    try {
      const existingCheck = await this.getQualityCheck(requestId);
      if (!existingCheck) {
        throw new Error('Quality check not found');
      }

      const updatedData: any = { updatedAt: new Date() };

      if (updates.checklistItems) {
        updatedData.checklistItems = updates.checklistItems;
        
        // Recalculate compliance score
        const totalItems = updates.checklistItems.length;
        const compliantItems = updates.checklistItems.filter(item => item.isCompliant).length;
        updatedData.complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 0;

        // Recalculate pass/fail status
        const highPriorityItems = updates.checklistItems.filter(item => item.priority === 'high');
        const highPriorityCompliant = highPriorityItems.filter(item => item.isCompliant);
        const highPriorityScore = highPriorityItems.length > 0 ? 
          (highPriorityCompliant.length / highPriorityItems.length) * 100 : 100;

        updatedData.passed = updatedData.complianceScore >= 80 && highPriorityScore >= 90;
      }

      if (updates.overallRating !== undefined) {
        updatedData.overallRating = updates.overallRating;
      }

      if (updates.comments !== undefined) {
        updatedData.comments = updates.comments;
      }

      if (updates.photos) {
        updatedData.photos = updates.photos;
      }

      const updated = await db.update(qualityControlChecks)
        .set(updatedData)
        .where(eq(qualityControlChecks.requestId, requestId))
        .returning();

      return updated[0];
    } catch (error) {
      console.error('Error updating quality check:', error);
      throw error;
    }
  }

  async requestRework(requestId: string, reviewerId: string, reworkReason: string): Promise<void> {
    try {
      // Update request status to require rework
      await db.update(maintenanceRequests)
        .set({ 
          status: 'rework_required',
          updatedAt: new Date()
        })
        .where(eq(maintenanceRequests.id, requestId));

      // Get request details for notifications
      const request = await db.select({
        id: maintenanceRequests.id,
        title: maintenanceRequests.title,
        assignedTechnicianId: maintenanceRequests.assignedTechnicianId,
        supervisorId: maintenanceRequests.supervisorId,
        propertyId: maintenanceRequests.propertyId
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);

      if (request.length === 0) return;

      const requestData = request[0];

      // Notify technician about rework requirement
      if (requestData.assignedTechnicianId) {
        await notificationService.sendNotification({
          userId: requestData.assignedTechnicianId,
          title: 'Rework Required',
          message: `Quality check failed for "${requestData.title}". Rework is required. Reason: ${reworkReason}`,
          type: 'warning',
          requestId,
          data: { 
            requestId, 
            action: 'rework_required',
            reason: reworkReason
          },
          channels: ['email', 'sms', 'push']
        });
      }

      // Notify supervisor
      if (requestData.supervisorId) {
        await notificationService.sendNotification({
          userId: requestData.supervisorId,
          title: 'Quality Check Failed - Rework Required',
          message: `Request "${requestData.title}" failed quality check and requires rework.`,
          type: 'warning',
          requestId,
          data: { 
            requestId, 
            action: 'rework_required',
            reason: reworkReason
          },
          channels: ['email', 'push']
        });
      }

      console.log(`Rework requested for ${requestId}: ${reworkReason}`);
    } catch (error) {
      console.error('Error requesting rework:', error);
      throw error;
    }
  }

  private async sendQualityCheckNotifications(requestId: string, passed: boolean, score: number, reviewerId: string): Promise<void> {
    try {
      // Get request details
      const request = await db.select({
        id: maintenanceRequests.id,
        title: maintenanceRequests.title,
        assignedTechnicianId: maintenanceRequests.assignedTechnicianId,
        supervisorId: maintenanceRequests.supervisorId,
        propertyId: maintenanceRequests.propertyId
      })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.id, requestId))
      .limit(1);

      if (request.length === 0) return;

      const requestData = request[0];

      // Get property for tenant notification
      const property = await db.select({
        userId: properties.userId
      })
      .from(properties)
      .where(eq(properties.id, requestData.propertyId))
      .limit(1);

      const tenantId = property.length > 0 ? property[0].userId : null;

      if (passed) {
        // Quality check passed notifications
        
        // Notify technician
        if (requestData.assignedTechnicianId) {
          await notificationService.sendNotification({
            userId: requestData.assignedTechnicianId,
            title: 'Quality Check Passed',
            message: `Great work! Your work on "${requestData.title}" passed quality check with ${score}% compliance.`,
            type: 'success',
            requestId,
            data: { 
              requestId, 
              action: 'quality_passed',
              score
            },
            channels: ['email', 'push']
          });
        }

        // Notify tenant
        if (tenantId) {
          await notificationService.sendNotification({
            userId: tenantId,
            title: 'Work Quality Approved',
            message: `The work completed on your request "${requestData.title}" has passed our quality standards.`,
            type: 'success',
            requestId,
            data: { 
              requestId, 
              action: 'quality_approved',
              score
            },
            channels: ['email', 'push']
          });
        }

        // Notify supervisor
        if (requestData.supervisorId) {
          await notificationService.sendNotification({
            userId: requestData.supervisorId,
            title: 'Quality Check Passed',
            message: `Request "${requestData.title}" passed quality check (${score}% compliance).`,
            type: 'success',
            requestId,
            data: { 
              requestId, 
              action: 'quality_passed',
              score
            },
            channels: ['email', 'push']
          });
        }

      } else {
        // Quality check failed notifications
        
        // Notify technician
        if (requestData.assignedTechnicianId) {
          await notificationService.sendNotification({
            userId: requestData.assignedTechnicianId,
            title: 'Quality Check Failed',
            message: `The work on "${requestData.title}" did not meet quality standards (${score}% compliance). Please review and improve.`,
            type: 'error',
            requestId,
            data: { 
              requestId, 
              action: 'quality_failed',
              score
            },
            channels: ['email', 'sms', 'push']
          });
        }

        // Notify supervisor about failed quality check
        if (requestData.supervisorId) {
          await notificationService.sendNotification({
            userId: requestData.supervisorId,
            title: 'Quality Check Failed',
            message: `Request "${requestData.title}" failed quality check (${score}% compliance). Review required.`,
            type: 'error',
            requestId,
            data: { 
              requestId, 
              action: 'quality_failed',
              score
            },
            channels: ['email', 'push']
          });
        }

        // Don't notify tenant until work is actually approved
      }
    } catch (error) {
      console.error('Error sending quality check notifications:', error);
    }
  }

  async getQualityStats(fmcOrganizationId: string, timeRange: string = '30d'): Promise<{
    totalChecks: number;
    passRate: number;
    averageScore: number;
    commonIssues: Array<{issue: string; count: number}>;
    categoryBreakdown: Record<string, {total: number; passed: number; avgScore: number}>;
  }> {
    try {
      // This would typically involve more complex queries
      // For now, return mock data structure
      return {
        totalChecks: 0,
        passRate: 0,
        averageScore: 0,
        commonIssues: [],
        categoryBreakdown: {}
      };
    } catch (error) {
      console.error('Error fetching quality stats:', error);
      throw error;
    }
  }

  async getQualityTrends(fmcOrganizationId: string, timeRange: string = '30d'): Promise<Array<{
    date: string;
    totalChecks: number;
    passRate: number;
    averageScore: number;
  }>> {
    try {
      // This would involve time-based aggregation queries
      // Return empty array for now
      return [];
    } catch (error) {
      console.error('Error fetching quality trends:', error);
      throw error;
    }
  }
}

export const qualityControlService = new QualityControlService();