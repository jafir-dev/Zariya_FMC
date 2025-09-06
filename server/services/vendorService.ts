import { db } from '../db';
import { 
  vendorOrganizations, 
  vendorPartnerships, 
  users, 
  maintenanceRequests,
  InsertVendorOrganization,
  InsertVendorPartnership,
  VendorOrganization,
  VendorPartnership
} from '@shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { notificationService } from './notificationService';

export class VendorService {
  
  // Vendor Organization Management
  async createVendorOrganization(data: InsertVendorOrganization): Promise<VendorOrganization> {
    const [vendor] = await db.insert(vendorOrganizations).values(data).returning();
    return vendor;
  }

  async getVendorOrganizations(): Promise<VendorOrganization[]> {
    return await db.select().from(vendorOrganizations).where(eq(vendorOrganizations.isActive, true));
  }

  async getVendorOrganization(vendorId: string): Promise<VendorOrganization | null> {
    const vendor = await db.select().from(vendorOrganizations)
      .where(eq(vendorOrganizations.id, vendorId))
      .limit(1);
    
    return vendor[0] || null;
  }

  async updateVendorOrganization(vendorId: string, updates: Partial<InsertVendorOrganization>): Promise<VendorOrganization> {
    const [updated] = await db.update(vendorOrganizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendorOrganizations.id, vendorId))
      .returning();
    
    return updated;
  }

  async verifyVendorOrganization(vendorId: string): Promise<VendorOrganization> {
    return await this.updateVendorOrganization(vendorId, { isVerified: true });
  }

  // Partnership Management
  async createPartnership(data: InsertVendorPartnership): Promise<VendorPartnership> {
    const [partnership] = await db.insert(vendorPartnerships).values(data).returning();
    return partnership;
  }

  async getFmcVendors(fmcOrganizationId: string, serviceCategory?: string): Promise<VendorOrganization[]> {
    let query = db.select({
      id: vendorOrganizations.id,
      name: vendorOrganizations.name,
      description: vendorOrganizations.description,
      logoUrl: vendorOrganizations.logoUrl,
      website: vendorOrganizations.website,
      contactEmail: vendorOrganizations.contactEmail,
      contactPhone: vendorOrganizations.contactPhone,
      address: vendorOrganizations.address,
      specializations: vendorOrganizations.specializations,
      serviceAreas: vendorOrganizations.serviceAreas,
      rating: vendorOrganizations.rating,
      isActive: vendorOrganizations.isActive,
      isVerified: vendorOrganizations.isVerified,
      createdAt: vendorOrganizations.createdAt,
      updatedAt: vendorOrganizations.updatedAt,
    })
    .from(vendorOrganizations)
    .innerJoin(vendorPartnerships, eq(vendorPartnerships.vendorOrganizationId, vendorOrganizations.id))
    .where(and(
      eq(vendorPartnerships.fmcOrganizationId, fmcOrganizationId),
      eq(vendorPartnerships.isActive, true),
      eq(vendorOrganizations.isActive, true),
      eq(vendorOrganizations.isVerified, true)
    ));

    if (serviceCategory) {
      query = query.where(
        sql`JSON_EXTRACT(${vendorPartnerships.serviceCategories}, '$') LIKE ${'%' + serviceCategory + '%'}`
      );
    }

    return await query;
  }

  async getVendorPartnership(fmcOrganizationId: string, vendorOrganizationId: string): Promise<VendorPartnership | null> {
    const partnership = await db.select().from(vendorPartnerships)
      .where(and(
        eq(vendorPartnerships.fmcOrganizationId, fmcOrganizationId),
        eq(vendorPartnerships.vendorOrganizationId, vendorOrganizationId)
      ))
      .limit(1);
    
    return partnership[0] || null;
  }

  // Request Assignment to Vendors
  async assignRequestToVendor(
    requestId: string, 
    vendorOrganizationId: string, 
    vendorContactId: string,
    assignedBy: string
  ): Promise<void> {
    // Update the maintenance request
    await db.update(maintenanceRequests)
      .set({
        assignedVendorId: vendorOrganizationId,
        vendorContactId: vendorContactId,
        requiresVendor: true,
        status: 'assigned',
        updatedAt: new Date()
      })
      .where(eq(maintenanceRequests.id, requestId));

    // Get request details for notification
    const request = await db.select({
      title: maintenanceRequests.title,
      description: maintenanceRequests.description,
      category: maintenanceRequests.category,
      priority: maintenanceRequests.priority,
    })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, requestId))
    .limit(1);

    if (request[0] && vendorContactId) {
      // Notify vendor contact about new assignment
      await notificationService.sendNotification({
        userId: vendorContactId,
        title: 'New Vendor Assignment',
        message: `You have been assigned a ${request[0].priority} priority ${request[0].category} request: ${request[0].title}`,
        type: 'info',
        requestId,
        data: { 
          requestId, 
          action: 'vendor_assignment',
          priority: request[0].priority,
          category: request[0].category
        },
        channels: ['email', 'push']
      });
    }

    console.log(`Request ${requestId} assigned to vendor ${vendorOrganizationId} by ${assignedBy}`);
  }

  // Auto-suggest vendors based on request category and location
  async suggestVendorsForRequest(requestId: string): Promise<VendorOrganization[]> {
    const request = await db.select({
      category: maintenanceRequests.category,
      fmcOrganizationId: maintenanceRequests.fmcOrganizationId,
    })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, requestId))
    .limit(1);

    if (!request[0]) {
      return [];
    }

    // Get vendors that specialize in this category and are partnered with the FMC
    return await this.getFmcVendors(request[0].fmcOrganizationId, request[0].category);
  }

  // Vendor Performance Tracking
  async updateVendorRating(vendorId: string): Promise<void> {
    // Calculate average rating based on completed requests
    const avgRating = await db.select({
      rating: sql<number>`AVG(CASE 
        WHEN ${maintenanceRequests.isCustomerApproved} = true THEN 5.0
        WHEN ${maintenanceRequests.status} = 'completed' THEN 4.0
        WHEN ${maintenanceRequests.status} = 'closed' THEN 3.0
        ELSE 2.0
      END)`.as('rating')
    })
    .from(maintenanceRequests)
    .where(and(
      eq(maintenanceRequests.assignedVendorId, vendorId),
      inArray(maintenanceRequests.status, ['completed', 'closed'])
    ));

    if (avgRating[0]?.rating) {
      await this.updateVendorOrganization(vendorId, {
        rating: avgRating[0].rating.toFixed(1)
      });
    }
  }

  // Vendor Dashboard Stats
  async getVendorStats(vendorId: string): Promise<{
    totalRequests: number;
    completedRequests: number;
    pendingRequests: number;
    avgCompletionTime: number | null;
    rating: string;
  }> {
    const stats = await db.select({
      totalRequests: sql<number>`COUNT(*)`.as('totalRequests'),
      completedRequests: sql<number>`SUM(CASE WHEN ${maintenanceRequests.status} IN ('completed', 'closed') THEN 1 ELSE 0 END)`.as('completedRequests'),
      pendingRequests: sql<number>`SUM(CASE WHEN ${maintenanceRequests.status} IN ('open', 'in_progress', 'assigned') THEN 1 ELSE 0 END)`.as('pendingRequests'),
      avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${maintenanceRequests.actualCompletionDate} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgCompletionTime'),
    })
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.assignedVendorId, vendorId));

    const vendor = await this.getVendorOrganization(vendorId);
    const rating = vendor?.rating || '0';

    return {
      totalRequests: stats[0]?.totalRequests || 0,
      completedRequests: stats[0]?.completedRequests || 0,
      pendingRequests: stats[0]?.pendingRequests || 0,
      avgCompletionTime: stats[0]?.avgCompletionTime || null,
      rating,
    };
  }

  // Get vendor team members
  async getVendorUsers(vendorOrganizationId: string): Promise<any[]> {
    return await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      phoneNumber: users.phoneNumber,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(
      eq(users.vendorOrganizationId, vendorOrganizationId),
      eq(users.isActive, true)
    ));
  }

  // Check if vendor can handle a specific service category
  async canVendorHandleCategory(vendorId: string, fmcId: string, category: string): Promise<boolean> {
    const partnership = await this.getVendorPartnership(fmcId, vendorId);
    
    if (!partnership) {
      return false;
    }

    const serviceCategories = partnership.serviceCategories as string[] || [];
    return serviceCategories.includes(category) || serviceCategories.includes('all');
  }
}

export const vendorService = new VendorService();