import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums for user roles and request statuses
export const userRoleEnum = pgEnum("user_role", [
  "tenant",
  "building_owner",
  "fmc_head",
  "fmc_supervisor",
  "fmc_technician",
  "fmc_procurement",
  "third_party_support"
]);

export const requestStatusEnum = pgEnum("request_status", [
  "open",
  "assigned",
  "in_progress",
  "completed",
  "closed",
  "cancelled"
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);

export const categoryEnum = pgEnum("category", [
  "hvac",
  "plumbing",
  "electrical",
  "general",
  "appliances",
  "elevator",
  "security",
  "cleaning",
  "other"
]);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("tenant"),
  phoneNumber: varchar("phone_number"),
  isActive: boolean("is_active").notNull().default(true),
  tenantId: varchar("tenant_id"), // For multi-tenant isolation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buildings table
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties/Units table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull().references(() => buildings.id),
  unitNumber: varchar("unit_number").notNull(),
  userId: varchar("user_id").references(() => users.id),
  contractExpiryDate: timestamp("contract_expiry_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maintenance requests table
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: varchar("request_number").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: requestStatusEnum("status").notNull().default("open"),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  tenantId: varchar("tenant_id").notNull(),
  assignedTechnicianId: varchar("assigned_technician_id").references(() => users.id),
  supervisorId: varchar("supervisor_id").references(() => users.id),
  preferredDate: timestamp("preferred_date"),
  preferredTimeSlot: varchar("preferred_time_slot"),
  schedulingNotes: text("scheduling_notes"),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  customerApprovalOtp: varchar("customer_approval_otp"),
  otpExpiresAt: timestamp("otp_expires_at"),
  isCustomerApproved: boolean("is_customer_approved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// File attachments table
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => maintenanceRequests.id),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  isBeforePhoto: boolean("is_before_photo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Request timeline/history table
export const requestTimeline = pgTable("request_timeline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => maintenanceRequests.id),
  action: varchar("action").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => users.id),
  oldStatus: requestStatusEnum("old_status"),
  newStatus: requestStatusEnum("new_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invite codes table
export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  tenantId: varchar("tenant_id").notNull(),
  role: userRoleEnum("role").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedBy: varchar("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  assignedRequests: many(maintenanceRequests, { relationName: "assignedTechnician" }),
  supervisorRequests: many(maintenanceRequests, { relationName: "supervisor" }),
  attachments: many(attachments),
  timelineActions: many(requestTimeline),
  createdInvites: many(inviteCodes, { relationName: "createdBy" }),
  usedInvites: many(inviteCodes, { relationName: "usedBy" }),
}));

export const buildingsRelations = relations(buildings, ({ many }) => ({
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  building: one(buildings, {
    fields: [properties.buildingId],
    references: [buildings.id],
  }),
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  requests: many(maintenanceRequests),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one, many }) => ({
  property: one(properties, {
    fields: [maintenanceRequests.propertyId],
    references: [properties.id],
  }),
  assignedTechnician: one(users, {
    fields: [maintenanceRequests.assignedTechnicianId],
    references: [users.id],
    relationName: "assignedTechnician",
  }),
  supervisor: one(users, {
    fields: [maintenanceRequests.supervisorId],
    references: [users.id],
    relationName: "supervisor",
  }),
  attachments: many(attachments),
  timeline: many(requestTimeline),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  request: one(maintenanceRequests, {
    fields: [attachments.requestId],
    references: [maintenanceRequests.id],
  }),
  uploadedByUser: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

export const requestTimelineRelations = relations(requestTimeline, ({ one }) => ({
  request: one(maintenanceRequests, {
    fields: [requestTimeline.requestId],
    references: [maintenanceRequests.id],
  }),
  user: one(users, {
    fields: [requestTimeline.userId],
    references: [users.id],
  }),
}));

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  createdByUser: one(users, {
    fields: [inviteCodes.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  usedByUser: one(users, {
    fields: [inviteCodes.usedBy],
    references: [users.id],
    relationName: "usedBy",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).omit({
  id: true,
  requestNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

export const insertRequestTimelineSchema = createInsertSchema(requestTimeline).omit({
  id: true,
  createdAt: true,
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema> & { id?: string };
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type RequestTimeline = typeof requestTimeline.$inferSelect;
export type InsertRequestTimeline = z.infer<typeof insertRequestTimelineSchema>;

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
