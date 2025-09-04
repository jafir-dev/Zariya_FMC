import { config } from 'dotenv';
import { db } from './db';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load environment variables from the project root
config({ path: path.resolve(process.cwd(), '../.env') });
import { 
  fmcOrganizations, 
  subscriptionTiers, 
  users, 
  buildings, 
  properties, 
  maintenanceRequests,
  inviteCodes,
  notifications 
} from '@shared/schema';
import { nanoid } from 'nanoid';

// Supabase client for auth operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await db.delete(notifications);
    await db.delete(maintenanceRequests);
    await db.delete(properties);
    await db.delete(buildings);
    await db.delete(inviteCodes);
    await db.delete(users);
    await db.delete(subscriptionTiers);
    await db.delete(fmcOrganizations);

    // Create subscription tiers
    console.log('Creating subscription tiers...');
    const tiers = await db.insert(subscriptionTiers).values([
      {
        name: 'Basic Plan',
        tier: 'basic',
        description: 'Perfect for small FMCs',
        price: 29.00,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Up to 5 buildings', 'Up to 10 users', 'Basic maintenance tracking', 'Email notifications'],
        maxUsers: 10,
        maxBuildings: 5,
        maxRequestsPerMonth: 100,
        isActive: true,
      },
      {
        name: 'Professional Plan',
        tier: 'professional',
        description: 'Ideal for growing FMCs',
        price: 79.00,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Up to 25 buildings', 'Up to 50 users', 'Advanced analytics', 'Push notifications', 'WhatsApp integration'],
        maxUsers: 50,
        maxBuildings: 25,
        maxRequestsPerMonth: 500,
        isActive: true,
      },
      {
        name: 'Enterprise Plan',
        tier: 'enterprise',
        description: 'For large FMC organizations',
        price: 199.00,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Unlimited buildings', 'Unlimited users', 'Advanced reporting', 'API access', 'Custom integrations'],
        maxUsers: null,
        maxBuildings: null,
        maxRequestsPerMonth: null,
        isActive: true,
      },
    ]).returning();

    // Create FMC organizations
    console.log('Creating FMC organizations...');
    const organizations = await db.insert(fmcOrganizations).values([
      {
        name: 'Metro Facility Management',
        description: 'Leading facility management company serving the metropolitan area',
        contactEmail: 'contact@metrofm.com',
        contactPhone: '+1-555-0123',
        address: '123 Business District, Metro City, MC 12345',
        isActive: true,
      },
      {
        name: 'Urban Property Services',
        description: 'Comprehensive property management and maintenance services',
        contactEmail: 'info@urbanproperty.com',
        contactPhone: '+1-555-0456',
        address: '456 Downtown Ave, Urban City, UC 67890',
        isActive: true,
      },
      {
        name: 'Premier Building Solutions',
        description: 'Premium facility management for high-end properties',
        contactEmail: 'hello@premierbuildings.com',
        contactPhone: '+1-555-0789',
        address: '789 Luxury Lane, Premium City, PC 11111',
        isActive: true,
      },
    ]).returning();

    // Create users (without Supabase Auth for now due to connection issues)
    console.log('Creating users (skipping Supabase Auth due to connection issues)...');
    
    // Test account credentials
    const testAccounts = [
      {
        email: 'admin@zariya.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const,
        phoneNumber: '+1-555-0000',
      },
      {
        email: 'john.smith@metrofm.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'fmc_head' as const,
        phoneNumber: '+1-555-0001',
        fmcOrganizationId: organizations[0].id,
      },
      {
        email: 'sarah.jones@metrofm.com',
        firstName: 'Sarah',
        lastName: 'Jones',
        role: 'fmc_supervisor' as const,
        phoneNumber: '+1-555-0002',
        fmcOrganizationId: organizations[0].id,
      },
      {
        email: 'mike.wilson@metrofm.com',
        firstName: 'Mike',
        lastName: 'Wilson',
        role: 'fmc_technician' as const,
        phoneNumber: '+1-555-0003',
        fmcOrganizationId: organizations[0].id,
      },
      {
        email: 'lisa.brown@urbanproperty.com',
        firstName: 'Lisa',
        lastName: 'Brown',
        role: 'fmc_head' as const,
        phoneNumber: '+1-555-0004',
        fmcOrganizationId: organizations[1].id,
      },
      {
        email: 'david.clark@urbanproperty.com',
        firstName: 'David',
        lastName: 'Clark',
        role: 'fmc_supervisor' as const,
        phoneNumber: '+1-555-0005',
        fmcOrganizationId: organizations[1].id,
      },
      {
        email: 'tenant1@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'tenant' as const,
        phoneNumber: '+1-555-0101',
      },
      {
        email: 'tenant2@example.com',
        firstName: 'Bob',
        lastName: 'Davis',
        role: 'tenant' as const,
        phoneNumber: '+1-555-0102',
      },
      {
        email: 'owner1@example.com',
        firstName: 'Carol',
        lastName: 'Miller',
        role: 'building_owner' as const,
        phoneNumber: '+1-555-0103',
      },
    ];

    const createdUsers = [];

    for (const account of testAccounts) {
      try {
        // Create user profile in our database with a generated ID
        const userId = nanoid();
        const userProfile = await db.insert(users).values({
          id: userId,
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          role: account.role,
          phoneNumber: account.phoneNumber,
          fmcOrganizationId: account.fmcOrganizationId,
          isActive: true,
        }).returning();

        createdUsers.push(userProfile[0]);
        console.log(`✅ Created user: ${account.email} (${account.role})`);
      } catch (error) {
        console.error(`Error creating user ${account.email}:`, error);
      }
    }

    // Create buildings
    console.log('Creating buildings...');
    const buildingData = await db.insert(buildings).values([
      {
        id: nanoid(),
        name: 'Metro Tower A',
        address: '100 Metro Street, Metro City, MC 12345',
        fmcOrganizationId: organizations[0].id,
        isActive: true,
      },
      {
        id: nanoid(),
        name: 'Metro Tower B',
        address: '200 Metro Street, Metro City, MC 12345',
        fmcOrganizationId: organizations[0].id,
        isActive: true,
      },
      {
        id: nanoid(),
        name: 'Urban Plaza',
        address: '300 Downtown Ave, Urban City, UC 67890',
        fmcOrganizationId: organizations[1].id,
        isActive: true,
      },
      {
        id: nanoid(),
        name: 'Premier Heights',
        address: '400 Luxury Lane, Premium City, PC 11111',
        fmcOrganizationId: organizations[2].id,
        isActive: true,
      },
    ]).returning();

    // Create properties
    console.log('Creating properties...');
    const propertyData = await db.insert(properties).values([
      {
        id: nanoid(),
        buildingId: buildingData[0].id,
        unitNumber: 'A101',
        userId: createdUsers[6].id, // tenant1@example.com
        contractExpiryDate: new Date('2025-12-31'),
        isActive: true,
      },
      {
        id: nanoid(),
        buildingId: buildingData[0].id,
        unitNumber: 'A102',
        userId: createdUsers[7].id, // tenant2@example.com
        contractExpiryDate: new Date('2025-12-31'),
        isActive: true,
      },
      {
        id: nanoid(),
        buildingId: buildingData[1].id,
        unitNumber: 'B201',
        userId: createdUsers[8].id, // owner1@example.com
        contractExpiryDate: new Date('2025-12-31'),
        isActive: true,
      },
      {
        id: nanoid(),
        buildingId: buildingData[2].id,
        unitNumber: 'P301',
        userId: createdUsers[6].id, // tenant1@example.com
        contractExpiryDate: new Date('2025-12-31'),
        isActive: true,
      },
    ]).returning();

    // Create maintenance requests
    console.log('Creating maintenance requests...');
    const requestData = await db.insert(maintenanceRequests).values([
      {
        id: nanoid(),
        requestNumber: 'MR-2024-001',
        title: 'AC Unit Not Working',
        description: 'The air conditioning unit in the living room is not cooling properly. It makes strange noises and the temperature is not dropping.',
        category: 'hvac',
        priority: 'high',
        status: 'assigned',
        propertyId: propertyData[0].id,
        fmcOrganizationId: organizations[0].id,
        assignedTechnicianId: createdUsers[3].id, // mike.wilson@metrofm.com
        supervisorId: createdUsers[2].id, // sarah.jones@metrofm.com
        preferredDate: new Date('2024-01-15'),
        preferredTimeSlot: 'morning',
        schedulingNotes: 'Tenant prefers morning appointments',
      },
      {
        id: nanoid(),
        requestNumber: 'MR-2024-002',
        title: 'Leaky Faucet',
        description: 'The kitchen faucet is leaking water. It drips constantly and needs to be fixed.',
        category: 'plumbing',
        priority: 'medium',
        status: 'in_progress',
        propertyId: propertyData[1].id,
        fmcOrganizationId: organizations[0].id,
        assignedTechnicianId: createdUsers[3].id, // mike.wilson@metrofm.com
        supervisorId: createdUsers[2].id, // sarah.jones@metrofm.com
        preferredDate: new Date('2024-01-16'),
        preferredTimeSlot: 'afternoon',
      },
      {
        id: nanoid(),
        requestNumber: 'MR-2024-003',
        title: 'Electrical Outlet Issue',
        description: 'One of the electrical outlets in the bedroom is not working. No power is coming through.',
        category: 'electrical',
        priority: 'high',
        status: 'open',
        propertyId: propertyData[2].id,
        fmcOrganizationId: organizations[1].id,
        supervisorId: createdUsers[5].id, // david.clark@urbanproperty.com
        preferredDate: new Date('2024-01-17'),
        preferredTimeSlot: 'morning',
      },
      {
        id: nanoid(),
        requestNumber: 'MR-2024-004',
        title: 'General Cleaning Request',
        description: 'Request for deep cleaning of the apartment. Carpets need shampooing and general maintenance.',
        category: 'cleaning',
        priority: 'low',
        status: 'completed',
        propertyId: propertyData[3].id,
        fmcOrganizationId: organizations[2].id,
        preferredDate: new Date('2024-01-14'),
        preferredTimeSlot: 'morning',
        actualCompletionDate: new Date('2024-01-14'),
        isCustomerApproved: true,
      },
    ]).returning();

    // Create invite codes
    console.log('Creating invite codes...');
    await db.insert(inviteCodes).values([
      {
        id: nanoid(),
        code: 'METRO2024',
        fmcOrganizationId: organizations[0].id,
        role: 'tenant',
        expiresAt: new Date('2025-12-31'),
        isActive: true,
        createdBy: createdUsers[1].id, // john.smith@metrofm.com
      },
      {
        id: nanoid(),
        code: 'URBAN2024',
        fmcOrganizationId: organizations[1].id,
        role: 'tenant',
        expiresAt: new Date('2025-12-31'),
        isActive: true,
        createdBy: createdUsers[4].id, // lisa.brown@urbanproperty.com
      },
      {
        id: nanoid(),
        code: 'PREMIER2024',
        fmcOrganizationId: organizations[2].id,
        role: 'tenant',
        expiresAt: new Date('2025-12-31'),
        isActive: true,
        createdBy: createdUsers[0].id, // admin@zariya.com
      },
    ]);

    // Create notifications
    console.log('Creating notifications...');
    await db.insert(notifications).values([
      {
        id: nanoid(),
        userId: createdUsers[6].id, // tenant1@example.com
        title: 'Maintenance Request Assigned',
        message: 'Your maintenance request MR-2024-001 has been assigned to a technician.',
        type: 'info',
        isRead: false,
        data: { requestId: requestData[0].id },
      },
      {
        id: nanoid(),
        userId: createdUsers[2].id, // sarah.jones@metrofm.com
        title: 'New Maintenance Request',
        message: 'A new high-priority maintenance request has been submitted.',
        type: 'warning',
        isRead: false,
        data: { requestId: requestData[0].id },
      },
      {
        id: nanoid(),
        userId: createdUsers[3].id, // mike.wilson@metrofm.com
        title: 'Task Assigned',
        message: 'You have been assigned a new maintenance task.',
        type: 'info',
        isRead: false,
        data: { requestId: requestData[0].id },
      },
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log(`Created ${tiers.length} subscription tiers`);
    console.log(`Created ${organizations.length} FMC organizations`);
    console.log(`Created ${createdUsers.length} users (without Supabase Auth)`);
    console.log(`Created ${buildingData.length} buildings`);
    console.log(`Created ${propertyData.length} properties`);
    console.log(`Created ${requestData.length} maintenance requests`);

    console.log('\n📋 Test Account Emails:');
    console.log('============================');
    testAccounts.forEach(account => {
      console.log(`${account.role.toUpperCase()}: ${account.email}`);
    });
    console.log('\n⚠️  Note: Users were created without Supabase Auth due to connection issues.');
    console.log('You may need to create these users manually in Supabase Auth later.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };
