import { db } from '../db';
import { properties, users, maintenanceRequests, buildings } from '@shared/schema';
import { eq, and, sql, lte, gte, isNotNull } from 'drizzle-orm';
import { notificationService } from './notificationService';

export interface ContractExpiryNotification {
  propertyId: string;
  unitNumber: string;
  buildingName: string;
  tenantName: string;
  tenantEmail: string;
  expiryDate: Date;
  daysUntilExpiry: number;
}

export interface ContractRenewalRequest {
  propertyId: string;
  newExpiryDate: Date;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export class ContractService {
  
  // Check for contracts expiring soon and send notifications
  async checkExpiringContracts(): Promise<void> {
    console.log('Running contract expiry check...');
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    // Get contracts expiring in 30 days
    await this.notifyExpiringContracts(now, thirtyDaysFromNow, 30);
    
    // Get contracts expiring in 7 days (more urgent)
    await this.notifyExpiringContracts(now, sevenDaysFromNow, 7);
    
    // Handle expired contracts
    await this.handleExpiredContracts();
    
    console.log('Contract expiry check completed');
  }

  private async notifyExpiringContracts(fromDate: Date, toDate: Date, daysUntilExpiry: number): Promise<void> {
    const expiringProperties = await db
      .select({
        propertyId: properties.id,
        unitNumber: properties.unitNumber,
        contractExpiryDate: properties.contractExpiryDate,
        userId: properties.userId,
        tenantFirstName: users.firstName,
        tenantLastName: users.lastName,
        tenantEmail: users.email,
        tenantPhone: users.phoneNumber,
        buildingName: buildings.name,
        fmcOrganizationId: users.fmcOrganizationId,
      })
      .from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .leftJoin(buildings, eq(properties.buildingId, buildings.id))
      .where(and(
        isNotNull(properties.contractExpiryDate),
        gte(properties.contractExpiryDate, fromDate),
        lte(properties.contractExpiryDate, toDate),
        eq(properties.isActive, true)
      ));

    for (const property of expiringProperties) {
      if (property.userId && property.fmcOrganizationId) {
        // Notify tenant about expiring contract
        await notificationService.sendNotification({
          userId: property.userId,
          title: `Contract Expiring in ${daysUntilExpiry} Days`,
          message: `Your contract for unit ${property.unitNumber} in ${property.buildingName} expires on ${property.contractExpiryDate?.toDateString()}. Please contact your FMC to renew.`,
          type: daysUntilExpiry <= 7 ? 'warning' : 'info',
          data: {
            propertyId: property.propertyId,
            expiryDate: property.contractExpiryDate?.toISOString(),
            daysUntilExpiry,
            action: 'contract_expiry_reminder'
          },
          channels: ['email', 'push']
        });

        // Notify FMC supervisors and heads
        const fmcStaff = await db
          .select({
            id: users.id,
            role: users.role
          })
          .from(users)
          .where(and(
            eq(users.fmcOrganizationId, property.fmcOrganizationId),
            sql`${users.role} IN ('fmc_head', 'fmc_supervisor')`,
            eq(users.isActive, true)
          ));

        for (const staff of fmcStaff) {
          await notificationService.sendNotification({
            userId: staff.id,
            title: `Tenant Contract Expiring in ${daysUntilExpiry} Days`,
            message: `Contract for ${property.tenantFirstName} ${property.tenantLastName} in unit ${property.unitNumber} (${property.buildingName}) expires on ${property.contractExpiryDate?.toDateString()}.`,
            type: daysUntilExpiry <= 7 ? 'warning' : 'info',
            data: {
              propertyId: property.propertyId,
              tenantId: property.userId,
              expiryDate: property.contractExpiryDate?.toISOString(),
              daysUntilExpiry,
              action: 'tenant_contract_expiry_alert'
            },
            channels: ['email', 'push']
          });
        }
      }
    }

    console.log(`Processed ${expiringProperties.length} contracts expiring in ${daysUntilExpiry} days`);
  }

  private async handleExpiredContracts(): Promise<void> {
    const now = new Date();
    
    // Get properties with expired contracts that are still active
    const expiredProperties = await db
      .select({
        propertyId: properties.id,
        unitNumber: properties.unitNumber,
        contractExpiryDate: properties.contractExpiryDate,
        userId: properties.userId,
        tenantFirstName: users.firstName,
        tenantLastName: users.lastName,
        tenantEmail: users.email,
        buildingName: buildings.name,
        fmcOrganizationId: users.fmcOrganizationId,
      })
      .from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .leftJoin(buildings, eq(properties.buildingId, buildings.id))
      .where(and(
        isNotNull(properties.contractExpiryDate),
        lte(properties.contractExpiryDate, now),
        eq(properties.isActive, true)
      ));

    for (const property of expiredProperties) {
      // Cancel any pending maintenance requests for expired contracts
      await this.cancelPendingMaintenanceRequests(property.propertyId);

      // Deactivate the property assignment
      await db
        .update(properties)
        .set({ 
          isActive: false, 
          userId: null, // Remove tenant assignment
          updatedAt: new Date() 
        })
        .where(eq(properties.id, property.propertyId));

      // Notify tenant about contract expiry and access revocation
      if (property.userId) {
        await notificationService.sendNotification({
          userId: property.userId,
          title: 'Contract Expired - Access Revoked',
          message: `Your contract for unit ${property.unitNumber} in ${property.buildingName} has expired. Your access to FMC services for this property has been revoked. Please contact your FMC to renew.`,
          type: 'warning',
          data: {
            propertyId: property.propertyId,
            expiryDate: property.contractExpiryDate?.toISOString(),
            action: 'contract_expired_access_revoked'
          },
          channels: ['email', 'sms', 'push']
        });
      }

      // Notify FMC staff about expired contract
      if (property.fmcOrganizationId) {
        const fmcStaff = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.fmcOrganizationId, property.fmcOrganizationId),
            sql`${users.role} IN ('fmc_head', 'fmc_supervisor')`,
            eq(users.isActive, true)
          ));

        for (const staff of fmcStaff) {
          await notificationService.sendNotification({
            userId: staff.id,
            title: 'Contract Expired - Access Revoked',
            message: `Contract for ${property.tenantFirstName} ${property.tenantLastName} in unit ${property.unitNumber} (${property.buildingName}) has expired. Tenant access has been automatically revoked.`,
            type: 'warning',
            data: {
              propertyId: property.propertyId,
              formerTenantId: property.userId,
              expiryDate: property.contractExpiryDate?.toISOString(),
              action: 'contract_expired_tenant_deactivated'
            },
            channels: ['email', 'push']
          });
        }
      }

      console.log(`Processed expired contract for property ${property.propertyId} (unit ${property.unitNumber})`);
    }

    console.log(`Processed ${expiredProperties.length} expired contracts`);
  }

  private async cancelPendingMaintenanceRequests(propertyId: string): Promise<void> {
    // Cancel any open/assigned/in-progress requests for the property
    const pendingRequests = await db
      .select({ id: maintenanceRequests.id })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.propertyId, propertyId),
        sql`${maintenanceRequests.status} IN ('open', 'assigned', 'in_progress')`
      ));

    for (const request of pendingRequests) {
      await db
        .update(maintenanceRequests)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(maintenanceRequests.id, request.id));
    }

    if (pendingRequests.length > 0) {
      console.log(`Cancelled ${pendingRequests.length} pending maintenance requests for property ${propertyId}`);
    }
  }

  // Manual contract renewal by FMC staff
  async renewContract(propertyId: string, newExpiryDate: Date, renewedBy: string): Promise<void> {
    // Update the contract expiry date
    await db
      .update(properties)
      .set({ 
        contractExpiryDate: newExpiryDate,
        isActive: true,
        updatedAt: new Date() 
      })
      .where(eq(properties.id, propertyId));

    // Get property and tenant details
    const propertyDetails = await db
      .select({
        unitNumber: properties.unitNumber,
        userId: properties.userId,
        tenantFirstName: users.firstName,
        tenantLastName: users.lastName,
        buildingName: buildings.name,
      })
      .from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .leftJoin(buildings, eq(properties.buildingId, buildings.id))
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (propertyDetails[0] && propertyDetails[0].userId) {
      // Notify tenant about contract renewal
      await notificationService.sendNotification({
        userId: propertyDetails[0].userId,
        title: 'Contract Renewed',
        message: `Your contract for unit ${propertyDetails[0].unitNumber} in ${propertyDetails[0].buildingName} has been renewed until ${newExpiryDate.toDateString()}.`,
        type: 'success',
        data: {
          propertyId,
          newExpiryDate: newExpiryDate.toISOString(),
          action: 'contract_renewed'
        },
        channels: ['email', 'push']
      });
    }

    console.log(`Contract renewed for property ${propertyId} until ${newExpiryDate.toDateString()} by user ${renewedBy}`);
  }

  // Get properties with contracts expiring soon
  async getExpiringContracts(fmcOrganizationId: string, days: number = 30): Promise<ContractExpiryNotification[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const expiring = await db
      .select({
        propertyId: properties.id,
        unitNumber: properties.unitNumber,
        contractExpiryDate: properties.contractExpiryDate,
        tenantFirstName: users.firstName,
        tenantLastName: users.lastName,
        tenantEmail: users.email,
        buildingName: buildings.name,
      })
      .from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .leftJoin(buildings, eq(properties.buildingId, buildings.id))
      .where(and(
        isNotNull(properties.contractExpiryDate),
        gte(properties.contractExpiryDate, now),
        lte(properties.contractExpiryDate, futureDate),
        eq(properties.isActive, true),
        eq(users.fmcOrganizationId, fmcOrganizationId)
      ));

    return expiring.map(item => ({
      propertyId: item.propertyId,
      unitNumber: item.unitNumber,
      buildingName: item.buildingName || '',
      tenantName: `${item.tenantFirstName || ''} ${item.tenantLastName || ''}`.trim(),
      tenantEmail: item.tenantEmail || '',
      expiryDate: item.contractExpiryDate!,
      daysUntilExpiry: Math.ceil((item.contractExpiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  // Check if a tenant's access should be blocked
  async isAccessBlocked(userId: string, propertyId: string): Promise<boolean> {
    const property = await db
      .select({
        contractExpiryDate: properties.contractExpiryDate,
        isActive: properties.isActive,
        userId: properties.userId
      })
      .from(properties)
      .where(and(
        eq(properties.id, propertyId),
        eq(properties.userId, userId)
      ))
      .limit(1);

    if (property.length === 0) {
      return true; // Block access if property not found or not assigned to user
    }

    const prop = property[0];
    
    // Block if property is inactive
    if (!prop.isActive) {
      return true;
    }

    // Block if contract has expired
    if (prop.contractExpiryDate && prop.contractExpiryDate <= new Date()) {
      return true;
    }

    return false; // Allow access
  }

  // Schedule contract expiry checks (to be called by a cron job)
  async scheduleContractChecks(): Promise<void> {
    // This would typically be called by a cron job
    // For now, we'll run it manually or set up a simple interval
    setInterval(async () => {
      try {
        await this.checkExpiringContracts();
      } catch (error) {
        console.error('Error in scheduled contract check:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily

    console.log('Contract expiry monitoring scheduled (daily checks)');
  }
}

export const contractService = new ContractService();