import {
  users,
  buildings,
  properties,
  maintenanceRequests,
  attachments,
  requestTimeline,
  inviteCodes,
  type User,
  type UpsertUser,
  type Building,
  type InsertBuilding,
  type Property,
  type InsertProperty,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
  type Attachment,
  type InsertAttachment,
  type RequestTimeline,
  type InsertRequestTimeline,
  type InviteCode,
  type InsertInviteCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByRole(role: string, fmcOrganizationId: string): Promise<User[]>;
  
  // Building operations
  getBuildings(fmcOrganizationId: string): Promise<Building[]>;
  getBuildingByName(name: string, fmcOrganizationId?: string): Promise<Building | undefined>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building>;
  
  // Property operations
  getPropertiesForUser(userId: string): Promise<(Property & { building: Building })[]>;
  getPropertiesByBuilding(buildingId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property>;
  
  // Maintenance request operations
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  getMaintenanceRequest(id: string): Promise<(MaintenanceRequest & { 
    property: Property & { building: Building };
    assignedTechnician?: User;
    supervisor?: User;
    attachments: Attachment[];
    timeline: (RequestTimeline & { user: User })[];
  }) | undefined>;
  getMaintenanceRequests(filters: {
    fmcOrganizationId?: string;
    userId?: string;
    assignedTechnicianId?: string;
    supervisorId?: string;
    buildingId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<(MaintenanceRequest & { 
    property: Property & { building: Building };
    assignedTechnician?: User;
    supervisor?: User;
  })[]>;
  updateMaintenanceRequestStatus(id: string, status: string, userId: string): Promise<MaintenanceRequest>;
  assignTechnician(requestId: string, technicianId: string, supervisorId: string): Promise<MaintenanceRequest>;
  generateRequestNumber(): Promise<string>;
  
  // Attachment operations
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByRequest(requestId: string): Promise<Attachment[]>;
  deleteAttachment(id: string): Promise<void>;
  
  // Timeline operations
  addTimelineEntry(entry: InsertRequestTimeline): Promise<RequestTimeline>;
  
  // Invite code operations
  createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode>;
  validateInviteCode(code: string): Promise<InviteCode | undefined>;
  useInviteCode(code: string, userId: string): Promise<InviteCode>;
  getInviteCodesByOrganization(fmcOrganizationId: string): Promise<(InviteCode & { createdByUser: User })[]>;
  
  // Dashboard statistics
  getTenantStats(userId: string): Promise<{
    pendingRequests: number;
    completedRequests: number;
    totalRequests: number;
  }>;
  
  getSupervisorStats(supervisorId: string, fmcOrganizationId: string): Promise<{
    openRequests: number;
    activeTechnicians: number;
    avgResponseTimeHours: number;
    buildingsManaged: number;
  }>;
  
  getTechnicianStats(technicianId: string): Promise<{
    assigned: number;
    inProgress: number;
    completed: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByRole(role: string, fmcOrganizationId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, role as any), eq(users.fmcOrganizationId, fmcOrganizationId), eq(users.isActive, true)));
  }

  // Building operations
  async getBuildings(fmcOrganizationId: string): Promise<Building[]> {
    return await db
      .select()
      .from(buildings)
      .where(and(eq(buildings.fmcOrganizationId, fmcOrganizationId), eq(buildings.isActive, true)))
      .orderBy(buildings.name);
  }

  async getBuildingByName(name: string, fmcOrganizationId?: string): Promise<Building | undefined> {
    let query = db.select().from(buildings).where(eq(buildings.name, name));
    
    if (fmcOrganizationId) {
      query = query.where(and(eq(buildings.name, name), eq(buildings.fmcOrganizationId, fmcOrganizationId))) as any;
    }
    
    const [building] = await query.limit(1);
    return building;
  }

  async createBuilding(building: InsertBuilding): Promise<Building> {
    const [created] = await db.insert(buildings).values(building).returning();
    return created;
  }

  async updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building> {
    const [updated] = await db
      .update(buildings)
      .set({ ...building, updatedAt: new Date() })
      .where(eq(buildings.id, id))
      .returning();
    return updated;
  }

  // Property operations
  async getPropertiesForUser(userId: string): Promise<(Property & { building: Building })[]> {
    return await db
      .select()
      .from(properties)
      .innerJoin(buildings, eq(properties.buildingId, buildings.id))
      .where(and(eq(properties.userId, userId), eq(properties.isActive, true)))
      .then(rows => rows.map(row => ({ ...row.properties, building: row.buildings })));
  }

  async getPropertiesByBuilding(buildingId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(and(eq(properties.buildingId, buildingId), eq(properties.isActive, true)));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property> {
    const [updated] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }

  // Maintenance request operations
  async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [result] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
    
    const nextNumber = (result.count || 0) + 1;
    return `REQ-${year}-${nextNumber.toString().padStart(3, '0')}`;
  }

  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const requestNumber = await this.generateRequestNumber();
    const [created] = await db
      .insert(maintenanceRequests)
      .values({ ...request, requestNumber })
      .returning();
    return created;
  }

  async getMaintenanceRequest(id: string): Promise<(MaintenanceRequest & { 
    property: Property & { building: Building };
    assignedTechnician?: User;
    supervisor?: User;
    attachments: Attachment[];
    timeline: (RequestTimeline & { user: User })[];
  }) | undefined> {
    const [request] = await db
      .select()
      .from(maintenanceRequests)
      .innerJoin(properties, eq(maintenanceRequests.propertyId, properties.id))
      .innerJoin(buildings, eq(properties.buildingId, buildings.id))
      .leftJoin(users, eq(maintenanceRequests.assignedTechnicianId, users.id))
      .where(eq(maintenanceRequests.id, id));

    if (!request) return undefined;

    const attachmentsList = await this.getAttachmentsByRequest(id);
    const timelineEntries = await db
      .select()
      .from(requestTimeline)
      .innerJoin(users, eq(requestTimeline.userId, users.id))
      .where(eq(requestTimeline.requestId, id))
      .orderBy(desc(requestTimeline.createdAt));

    return {
      ...request.maintenance_requests,
      property: { ...request.properties, building: request.buildings },
      assignedTechnician: request.users || undefined,
      attachments: attachmentsList,
      timeline: timelineEntries.map(entry => ({ ...entry.request_timeline, user: entry.users })),
    };
  }

  async getMaintenanceRequests(filters: {
    fmcOrganizationId?: string;
    userId?: string;
    assignedTechnicianId?: string;
    supervisorId?: string;
    buildingId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<(MaintenanceRequest & { 
    property: Property & { building: Building };
    assignedTechnician?: User;
    supervisor?: User;
  })[]> {
    let query = db
      .select()
      .from(maintenanceRequests)
      .innerJoin(properties, eq(maintenanceRequests.propertyId, properties.id))
      .innerJoin(buildings, eq(properties.buildingId, buildings.id))
      .leftJoin(users, eq(maintenanceRequests.assignedTechnicianId, users.id));

    const conditions = [];

    if (filters.fmcOrganizationId) {
      conditions.push(eq(maintenanceRequests.fmcOrganizationId, filters.fmcOrganizationId));
    }
    if (filters.userId) {
      conditions.push(eq(properties.userId, filters.userId));
    }
    if (filters.assignedTechnicianId) {
      conditions.push(eq(maintenanceRequests.assignedTechnicianId, filters.assignedTechnicianId));
    }
    if (filters.supervisorId) {
      conditions.push(eq(maintenanceRequests.supervisorId, filters.supervisorId));
    }
    if (filters.buildingId) {
      conditions.push(eq(properties.buildingId, filters.buildingId));
    }
    if (filters.status) {
      conditions.push(eq(maintenanceRequests.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(maintenanceRequests.createdAt)) as any;

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }

    const results = await query;
    return results.map(row => ({
      ...row.maintenance_requests,
      property: { ...row.properties, building: row.buildings },
      assignedTechnician: row.users || undefined,
    }));
  }

  async updateMaintenanceRequestStatus(id: string, status: string, userId: string): Promise<MaintenanceRequest> {
    const [updated] = await db
      .update(maintenanceRequests)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(maintenanceRequests.id, id))
      .returning();

    // Add timeline entry
    await this.addTimelineEntry({
      requestId: id,
      action: "status_updated",
      description: `Status changed to ${status}`,
      userId,
      newStatus: status as any,
    });

    return updated;
  }

  async assignTechnician(requestId: string, technicianId: string, supervisorId: string): Promise<MaintenanceRequest> {
    const [updated] = await db
      .update(maintenanceRequests)
      .set({ 
        assignedTechnicianId: technicianId,
        supervisorId,
        status: "assigned",
        updatedAt: new Date()
      })
      .where(eq(maintenanceRequests.id, requestId))
      .returning();

    // Add timeline entry
    await this.addTimelineEntry({
      requestId,
      action: "technician_assigned",
      description: `Technician assigned`,
      userId: supervisorId,
      newStatus: "assigned",
    });

    return updated;
  }

  // Attachment operations
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [created] = await db.insert(attachments).values(attachment).returning();
    return created;
  }

  async getAttachmentsByRequest(requestId: string): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(eq(attachments.requestId, requestId))
      .orderBy(attachments.createdAt);
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // Timeline operations
  async addTimelineEntry(entry: InsertRequestTimeline): Promise<RequestTimeline> {
    const [created] = await db.insert(requestTimeline).values(entry).returning();
    return created;
  }

  // Invite code operations
  async createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode> {
    const [created] = await db.insert(inviteCodes).values(inviteCode).returning();
    return created;
  }

  async validateInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db
      .select()
      .from(inviteCodes)
      .where(and(
        eq(inviteCodes.code, code),
        eq(inviteCodes.isActive, true),
        sql`expires_at > NOW()`
      ));
    return inviteCode;
  }

  async useInviteCode(code: string, userId: string): Promise<InviteCode> {
    const [updated] = await db
      .update(inviteCodes)
      .set({ usedBy: userId, usedAt: new Date() })
      .where(eq(inviteCodes.code, code))
      .returning();
    return updated;
  }

  async getInviteCodesByOrganization(fmcOrganizationId: string): Promise<(InviteCode & { createdByUser: User })[]> {
    const results = await db
      .select()
      .from(inviteCodes)
      .innerJoin(users, eq(inviteCodes.createdBy, users.id))
      .where(eq(inviteCodes.fmcOrganizationId, fmcOrganizationId))
      .orderBy(desc(inviteCodes.createdAt));

    return results.map(row => ({
      ...row.invite_codes,
      createdByUser: row.users
    }));
  }

  // Dashboard statistics
  async getTenantStats(userId: string): Promise<{
    pendingRequests: number;
    completedRequests: number;
    totalRequests: number;
  }> {
    const userProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.userId, userId));

    const propertyIds = userProperties.map(p => p.id);

    if (propertyIds.length === 0) {
      return { pendingRequests: 0, completedRequests: 0, totalRequests: 0 };
    }

    const [pendingCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        sql`property_id = ANY(${propertyIds})`,
        sql`status IN ('open', 'assigned', 'in_progress')`
      ));

    const [completedCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        sql`property_id = ANY(${propertyIds})`,
        eq(maintenanceRequests.status, "completed")
      ));

    const [totalCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(sql`property_id = ANY(${propertyIds})`);

    return {
      pendingRequests: pendingCount.count || 0,
      completedRequests: completedCount.count || 0,
      totalRequests: totalCount.count || 0,
    };
  }

  async getSupervisorStats(supervisorId: string, fmcOrganizationId: string): Promise<{
    openRequests: number;
    activeTechnicians: number;
    avgResponseTimeHours: number;
    buildingsManaged: number;
  }> {
    const [openCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        sql`status IN ('open', 'assigned', 'in_progress')`
      ));

    const [technicianCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, "fmc_technician"),
        eq(users.fmcOrganizationId, fmcOrganizationId),
        eq(users.isActive, true)
      ));

    const [buildingCount] = await db
      .select({ count: count() })
      .from(buildings)
      .where(and(eq(buildings.fmcOrganizationId, fmcOrganizationId), eq(buildings.isActive, true)));

    return {
      openRequests: openCount.count || 0,
      activeTechnicians: technicianCount.count || 0,
      avgResponseTimeHours: 2.3, // TODO: Calculate actual average
      buildingsManaged: buildingCount.count || 0,
    };
  }

  async getTechnicianStats(technicianId: string): Promise<{
    assigned: number;
    inProgress: number;
    completed: number;
  }> {
    const [assignedCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.assignedTechnicianId, technicianId),
        eq(maintenanceRequests.status, "assigned")
      ));

    const [inProgressCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.assignedTechnicianId, technicianId),
        eq(maintenanceRequests.status, "in_progress")
      ));

    const [completedCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.assignedTechnicianId, technicianId),
        eq(maintenanceRequests.status, "completed")
      ));

    return {
      assigned: assignedCount.count || 0,
      inProgress: inProgressCount.count || 0,
      completed: completedCount.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
