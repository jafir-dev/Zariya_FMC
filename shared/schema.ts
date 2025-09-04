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
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for user roles and request statuses
export const userRoleEnum = pgEnum("user_role", [
  "tenant",
  "building_owner",
  "fmc_head",
  "fmc_supervisor",
  "fmc_technician",
  "fmc_procurement",
  "third_party_support",
  "admin"
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

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "trialing"
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "basic",
  "professional",
  "enterprise"
]);

// FMC Organizations table
export const fmcOrganizations = pgTable("fmc_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url"),
  website: varchar("website"),
  contactEmail: varchar("contact_email").notNull(),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  stripeCustomerId: varchar("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription tiers table
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  tier: subscriptionTierEnum("tier").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("USD"),
  billingCycle: varchar("billing_cycle").notNull().default("monthly"),
  features: jsonb("features").notNull().default("[]"),
  maxUsers: integer("max_users"),
  maxBuildings: integer("max_buildings"),
  maxRequestsPerMonth: integer("max_requests_per_month"),
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table - now with Supabase auth integration
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("tenant"),
  phoneNumber: varchar("phone_number"),
  isActive: boolean("is_active").notNull().default(true),
  fmcOrganizationId: varchar("fmc_organization_id").references(() => fmcOrganizations.id),
  stripeCustomerId: varchar("stripe_customer_id"),
  firebaseToken: varchar("firebase_token"),
  notificationPreferences: jsonb("notification_preferences").default("{}"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tierId: varchar("tier_id").notNull().references(() => subscriptionTiers.id),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buildings table
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address").notNull(),
  fmcOrganizationId: varchar("fmc_organization_id").notNull().references(() => fmcOrganizations.id),
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
  fmcOrganizationId: varchar("fmc_organization_id").notNull().references(() => fmcOrganizations.id),
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
  fmcOrganizationId: varchar("fmc_organization_id").notNull().references(() => fmcOrganizations.id),
  role: userRoleEnum("role").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedBy: varchar("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  data: jsonb("data").default("{}"),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const fmcOrganizationsRelations = relations(fmcOrganizations, ({ many }) => ({
  users: many(users),
  buildings: many(buildings),
  inviteCodes: many(inviteCodes),
}));

export const subscriptionTiersRelations = relations(subscriptionTiers, ({ many }) => ({
  subscriptions: many(userSubscriptions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(fmcOrganizations, {
    fields: [users.fmcOrganizationId],
    references: [fmcOrganizations.id],
  }),
  subscription: one(userSubscriptions, {
    fields: [users.id],
    references: [userSubscriptions.userId],
  }),
  properties: many(properties),
  assignedRequests: many(maintenanceRequests, { relationName: "assignedTechnician" }),
  supervisorRequests: many(maintenanceRequests, { relationName: "supervisor" }),
  attachments: many(attachments),
  timelineActions: many(requestTimeline),
  createdInvites: many(inviteCodes, { relationName: "createdBy" }),
  usedInvites: many(inviteCodes, { relationName: "usedBy" }),
  notifications: many(notifications),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  tier: one(subscriptionTiers, {
    fields: [userSubscriptions.tierId],
    references: [subscriptionTiers.id],
  }),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  organization: one(fmcOrganizations, {
    fields: [buildings.fmcOrganizationId],
    references: [fmcOrganizations.id],
  }),
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
  organization: one(fmcOrganizations, {
    fields: [maintenanceRequests.fmcOrganizationId],
    references: [fmcOrganizations.id],
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
  organization: one(fmcOrganizations, {
    fields: [inviteCodes.fmcOrganizationId],
    references: [fmcOrganizations.id],
  }),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertFmcOrganizationSchema = createInsertSchema(fmcOrganizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
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

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type FmcOrganization = typeof fmcOrganizations.$inferSelect;
export type InsertFmcOrganization = z.infer<typeof insertFmcOrganizationSchema>;

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = z.infer<typeof insertSubscriptionTierSchema>;

export type UpsertUser = z.infer<typeof insertUserSchema> & { id?: string };
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

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

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
