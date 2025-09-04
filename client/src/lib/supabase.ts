import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helper functions
export const db = {
  // Users
  getUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  updateUser: async (userId: string, updates: any) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // FMC Organizations
  getFmcOrganizations: async () => {
    const { data, error } = await supabase
      .from('fmc_organizations')
      .select('*')
      .eq('is_active', true);
    return { data, error };
  },

  getFmcOrganization: async (orgId: string) => {
    const { data, error } = await supabase
      .from('fmc_organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    return { data, error };
  },

  createFmcOrganization: async (orgData: any) => {
    const { data, error } = await supabase
      .from('fmc_organizations')
      .insert(orgData)
      .select()
      .single();
    return { data, error };
  },

  // Buildings
  getBuildings: async (orgId: string) => {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('fmc_organization_id', orgId)
      .eq('is_active', true);
    return { data, error };
  },

  // Properties
  getProperties: async (userId: string) => {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        building:buildings(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);
    return { data, error };
  },

  // Maintenance Requests
  getMaintenanceRequests: async (filters: any) => {
    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(*),
        assignedTechnician:users!assigned_technician_id(*),
        supervisor:users!supervisor_id(*),
        attachments:attachments(*)
      `);

    if (filters.fmcOrganizationId) {
      query = query.eq('fmc_organization_id', filters.fmcOrganizationId);
    }
    if (filters.userId) {
      query = query.eq('property.user_id', filters.userId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.buildingId) {
      query = query.eq('property.building_id', filters.buildingId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  createMaintenanceRequest: async (requestData: any) => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert(requestData)
      .select()
      .single();
    return { data, error };
  },

  updateMaintenanceRequest: async (requestId: string, updates: any) => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();
    return { data, error };
  },

  // Attachments
  createAttachment: async (attachmentData: any) => {
    const { data, error } = await supabase
      .from('attachments')
      .insert(attachmentData)
      .select()
      .single();
    return { data, error };
  },

  // Timeline
  addTimelineEntry: async (timelineData: any) => {
    const { data, error } = await supabase
      .from('request_timeline')
      .insert(timelineData)
      .select()
      .single();
    return { data, error };
  },

  // Notifications
  getNotifications: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  markNotificationAsRead: async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();
    return { data, error };
  },

  // Subscription Tiers
  getSubscriptionTiers: async () => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    return { data, error };
  },

  createSubscriptionTier: async (tierData: any) => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .insert(tierData)
      .select()
      .single();
    return { data, error };
  },

  // User Subscriptions
  getUserSubscription: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        tier:subscription_tiers(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    return { data, error };
  },

  // Technicians
  getTechnicians: async (orgId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('fmc_organization_id', orgId)
      .eq('role', 'fmc_technician')
      .eq('is_active', true);
    return { data, error };
  },

  // Stats
  getTenantStats: async (userId: string) => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('property.user_id', userId);
    
    if (error) return { data: null, error };
    
    const stats = {
      total: data.length,
      open: data.filter(r => r.status === 'open').length,
      inProgress: data.filter(r => r.status === 'in_progress').length,
      completed: data.filter(r => r.status === 'completed').length,
    };
    
    return { data: stats, error: null };
  },

  getSupervisorStats: async (supervisorId: string, orgId: string) => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .eq('fmc_organization_id', orgId);
    
    if (error) return { data: null, error };
    
    const stats = {
      total: data.length,
      open: data.filter(r => r.status === 'open').length,
      assigned: data.filter(r => r.status === 'assigned').length,
      inProgress: data.filter(r => r.status === 'in_progress').length,
      completed: data.filter(r => r.status === 'completed').length,
    };
    
    return { data: stats, error: null };
  },

  getTechnicianStats: async (technicianId: string) => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('assigned_technician_id', technicianId);
    
    if (error) return { data: null, error };
    
    const stats = {
      total: data.length,
      assigned: data.filter(r => r.status === 'assigned').length,
      inProgress: data.filter(r => r.status === 'in_progress').length,
      completed: data.filter(r => r.status === 'completed').length,
    };
    
    return { data: stats, error: null };
  },
};

export default supabase;
