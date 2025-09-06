import { db } from '../db';
import { 
  maintenanceRequests, 
  users, 
  properties,
  fmcOrganizations,
  vendorOrganizations,
  requestTimeline,
  buildings
} from '@shared/schema';
import { eq, and, sql, gte, lte, desc, asc, count, avg, sum, inArray } from 'drizzle-orm';

export interface DashboardStats {
  overview: {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    overdueRequests: number;
    avgCompletionTime: number; // in hours
    customerSatisfactionRate: number; // percentage
  };
  trends: {
    requestsByMonth: { month: string; count: number; }[];
    requestsByCategory: { category: string; count: number; }[];
    requestsByPriority: { priority: string; count: number; }[];
    completionTimesByMonth: { month: string; avgHours: number; }[];
  };
  performance: {
    technicianPerformance: {
      technicianId: string;
      technicianName: string;
      completedRequests: number;
      avgCompletionTime: number;
      customerApprovalRate: number;
    }[];
    vendorPerformance: {
      vendorId: string;
      vendorName: string;
      completedRequests: number;
      avgCompletionTime: number;
      customerApprovalRate: number;
    }[];
    buildingStats: {
      buildingId: string;
      buildingName: string;
      totalRequests: number;
      avgCompletionTime: number;
    }[];
  };
}

export class AnalyticsService {
  
  // Enhanced FMC Organization Dashboard
  async getFmcDashboardStats(fmcOrganizationId: string, timeRange: string = '30d'): Promise<DashboardStats> {
    const dateRange = this.getDateRange(timeRange);
    
    const overview = await this.getOverviewStats(fmcOrganizationId, dateRange);
    const trends = await this.getTrendsData(fmcOrganizationId, dateRange);
    const performance = await this.getPerformanceData(fmcOrganizationId, dateRange);
    
    return {
      overview,
      trends,
      performance
    };
  }

  private async getOverviewStats(fmcOrganizationId: string, dateRange: { start: Date; end: Date }) {
    // Total requests in time range
    const [totalRequestsResult] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Pending requests
    const [pendingResult] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        inArray(maintenanceRequests.status, ['open', 'assigned', 'in_progress']),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Completed requests
    const [completedResult] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        inArray(maintenanceRequests.status, ['completed', 'closed']),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Overdue requests (created more than 48 hours ago and still pending)
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
    
    const [overdueResult] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        inArray(maintenanceRequests.status, ['open', 'assigned', 'in_progress']),
        lte(maintenanceRequests.createdAt, twoDaysAgo)
      ));

    // Average completion time
    const [avgCompletionResult] = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${maintenanceRequests.actualCompletionDate} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgHours')
      })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        sql`${maintenanceRequests.actualCompletionDate} IS NOT NULL`,
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Customer satisfaction rate (based on approved work)
    const [satisfactionResult] = await db
      .select({
        total: count(),
        approved: sum(sql`CASE WHEN ${maintenanceRequests.isCustomerApproved} = true THEN 1 ELSE 0 END`).as('approved')
      })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        inArray(maintenanceRequests.status, ['completed', 'closed']),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    const satisfactionRate = satisfactionResult.total > 0 
      ? (Number(satisfactionResult.approved) / satisfactionResult.total) * 100 
      : 0;

    return {
      totalRequests: totalRequestsResult.count || 0,
      pendingRequests: pendingResult.count || 0,
      completedRequests: completedResult.count || 0,
      overdueRequests: overdueResult.count || 0,
      avgCompletionTime: avgCompletionResult.avgHours || 0,
      customerSatisfactionRate: Math.round(satisfactionRate * 10) / 10
    };
  }

  private async getTrendsData(fmcOrganizationId: string, dateRange: { start: Date; end: Date }) {
    // Requests by month
    const requestsByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${maintenanceRequests.createdAt}, 'YYYY-MM')`.as('month'),
        count: count()
      })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(sql`TO_CHAR(${maintenanceRequests.createdAt}, 'YYYY-MM')`)
      .orderBy(asc(sql`TO_CHAR(${maintenanceRequests.createdAt}, 'YYYY-MM')`));

    // Requests by category
    const requestsByCategory = await db
      .select({
        category: maintenanceRequests.category,
        count: count()
      })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(maintenanceRequests.category)
      .orderBy(desc(count()));

    // Requests by priority
    const requestsByPriority = await db
      .select({
        priority: maintenanceRequests.priority,
        count: count()
      })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(maintenanceRequests.priority)
      .orderBy(desc(count()));

    // Completion times by month
    const completionTimesByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${maintenanceRequests.actualCompletionDate}, 'YYYY-MM')`.as('month'),
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${maintenanceRequests.actualCompletionDate} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgHours')
      })
      .from(maintenanceRequests)
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        sql`${maintenanceRequests.actualCompletionDate} IS NOT NULL`,
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(sql`TO_CHAR(${maintenanceRequests.actualCompletionDate}, 'YYYY-MM')`)
      .orderBy(asc(sql`TO_CHAR(${maintenanceRequests.actualCompletionDate}, 'YYYY-MM')`));

    return {
      requestsByMonth,
      requestsByCategory,
      requestsByPriority,
      completionTimesByMonth
    };
  }

  private async getPerformanceData(fmcOrganizationId: string, dateRange: { start: Date; end: Date }) {
    // Technician performance
    const technicianPerformance = await db
      .select({
        technicianId: users.id,
        technicianName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('technicianName'),
        completedRequests: count(),
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${maintenanceRequests.actualCompletionDate} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgCompletionTime'),
        customerApprovalRate: sql<number>`(COUNT(CASE WHEN ${maintenanceRequests.isCustomerApproved} = true THEN 1 END)::float / COUNT(*)) * 100`.as('customerApprovalRate')
      })
      .from(maintenanceRequests)
      .innerJoin(users, eq(maintenanceRequests.assignedTechnicianId, users.id))
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        inArray(maintenanceRequests.status, ['completed', 'closed']),
        sql`${maintenanceRequests.actualCompletionDate} IS NOT NULL`,
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(users.id, users.firstName, users.lastName)
      .orderBy(desc(count()));

    // Vendor performance
    const vendorPerformance = await db
      .select({
        vendorId: vendorOrganizations.id,
        vendorName: vendorOrganizations.name,
        completedRequests: count(),
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${maintenanceRequests.actualCompletionDate} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgCompletionTime'),
        customerApprovalRate: sql<number>`(COUNT(CASE WHEN ${maintenanceRequests.isCustomerApproved} = true THEN 1 END)::float / COUNT(*)) * 100`.as('customerApprovalRate')
      })
      .from(maintenanceRequests)
      .innerJoin(vendorOrganizations, eq(maintenanceRequests.assignedVendorId, vendorOrganizations.id))
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        inArray(maintenanceRequests.status, ['completed', 'closed']),
        sql`${maintenanceRequests.actualCompletionDate} IS NOT NULL`,
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(vendorOrganizations.id, vendorOrganizations.name)
      .orderBy(desc(count()));

    // Building performance
    const buildingStats = await db
      .select({
        buildingId: buildings.id,
        buildingName: buildings.name,
        totalRequests: count(),
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${maintenanceRequests.actualCompletionDate} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgCompletionTime')
      })
      .from(maintenanceRequests)
      .innerJoin(properties, eq(maintenanceRequests.propertyId, properties.id))
      .innerJoin(buildings, eq(properties.buildingId, buildings.id))
      .where(and(
        eq(maintenanceRequests.fmcOrganizationId, fmcOrganizationId),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(buildings.id, buildings.name)
      .orderBy(desc(count()));

    return {
      technicianPerformance,
      vendorPerformance,
      buildingStats
    };
  }

  // Enhanced Tenant Analytics
  async getTenantAdvancedStats(userId: string, timeRange: string = '30d') {
    const dateRange = this.getDateRange(timeRange);
    
    const userProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.userId, userId));

    const propertyIds = userProperties.map(p => p.id);

    if (propertyIds.length === 0) {
      return this.getEmptyTenantStats();
    }

    // Basic stats
    const [totalCount] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(
        inArray(maintenanceRequests.propertyId, propertyIds),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Requests by status
    const requestsByStatus = await db
      .select({
        status: maintenanceRequests.status,
        count: count()
      })
      .from(maintenanceRequests)
      .where(and(
        inArray(maintenanceRequests.propertyId, propertyIds),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(maintenanceRequests.status);

    // Response time analysis
    const [responseTimeStats] = await db
      .select({
        avgResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${requestTimeline.createdAt} - ${maintenanceRequests.createdAt})) / 3600)`.as('avgResponseTime')
      })
      .from(maintenanceRequests)
      .innerJoin(requestTimeline, eq(requestTimeline.requestId, maintenanceRequests.id))
      .where(and(
        inArray(maintenanceRequests.propertyId, propertyIds),
        eq(requestTimeline.action, 'assigned'),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Satisfaction metrics
    const [satisfactionStats] = await db
      .select({
        totalCompleted: count(),
        approved: sum(sql`CASE WHEN ${maintenanceRequests.isCustomerApproved} = true THEN 1 ELSE 0 END`).as('approved')
      })
      .from(maintenanceRequests)
      .where(and(
        inArray(maintenanceRequests.propertyId, propertyIds),
        inArray(maintenanceRequests.status, ['completed', 'closed']),
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    return {
      totalRequests: totalCount.count || 0,
      requestsByStatus,
      avgResponseTime: responseTimeStats?.avgResponseTime || 0,
      satisfactionRate: satisfactionStats.totalCompleted > 0 
        ? (Number(satisfactionStats.approved) / satisfactionStats.totalCompleted) * 100 
        : 0
    };
  }

  // System-wide Analytics (Admin only)
  async getSystemWideAnalytics(timeRange: string = '30d') {
    const dateRange = this.getDateRange(timeRange);
    
    // Total system stats
    const [systemStats] = await db
      .select({
        totalOrganizations: sql<number>`COUNT(DISTINCT ${maintenanceRequests.fmcOrganizationId})`.as('totalOrganizations'),
        totalRequests: count(),
        totalUsers: sql<number>`(SELECT COUNT(*) FROM ${users})`.as('totalUsers')
      })
      .from(maintenanceRequests)
      .where(and(
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ));

    // Most active organizations
    const topOrganizations = await db
      .select({
        organizationId: fmcOrganizations.id,
        organizationName: fmcOrganizations.name,
        requestCount: count()
      })
      .from(maintenanceRequests)
      .innerJoin(fmcOrganizations, eq(maintenanceRequests.fmcOrganizationId, fmcOrganizations.id))
      .where(and(
        gte(maintenanceRequests.createdAt, dateRange.start),
        lte(maintenanceRequests.createdAt, dateRange.end)
      ))
      .groupBy(fmcOrganizations.id, fmcOrganizations.name)
      .orderBy(desc(count()))
      .limit(10);

    return {
      systemStats,
      topOrganizations
    };
  }

  private getDateRange(timeRange: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    return { start, end };
  }

  private getEmptyTenantStats() {
    return {
      totalRequests: 0,
      requestsByStatus: [],
      avgResponseTime: 0,
      satisfactionRate: 0
    };
  }
}

export const analyticsService = new AnalyticsService();