import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if using Cloud SQL Unix socket (path starts with /cloudsql/)
const isCloudSqlSocket = (process.env.DATABASE_HOST || '').startsWith('/cloudsql/');

const poolConfig: PoolConfig = {
  // For Cloud SQL Unix socket, use 'host' for the socket path
  host: isCloudSqlSocket ? process.env.DATABASE_HOST : (process.env.DATABASE_HOST || 'localhost'),
  // Port is ignored for Unix sockets but required for TCP connections
  port: isCloudSqlSocket ? undefined : parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'catchup_db',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  // Cloud SQL Unix socket doesn't use SSL - the connection is already secure
  // For other production connections, enforce SSL
  ssl: isCloudSqlSocket
    ? false
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

export default pool;
