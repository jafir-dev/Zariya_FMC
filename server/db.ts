import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from '@shared/schema';

// Load environment variables
config();

// Supabase database connection
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) {
  throw new Error('SUPABASE_DATABASE_URL environment variable is required');
}

// Create postgres client
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle database instance
export const db = drizzle(client, { schema });

// Export schema for use in other files
export { schema };

// Helper function to close database connection
export async function closeDatabase() {
  await client.end();
}