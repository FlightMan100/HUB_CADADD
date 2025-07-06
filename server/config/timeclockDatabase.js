import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let timeclockPool = null;

export async function initializeTimeclockDatabase() {
  try {
    timeclockPool = mysql.createPool({
      host: '15.204.243.37',
      user: 'gcnnetwow',
      password: 'uYD6ZK5Y8cveYTF',
      database: 'gcnnetwow_vmenu',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    
    // Verify connection
    const connection = await timeclockPool.getConnection();
    await connection.release();
    console.log('? Connected to timeclock database');
    return timeclockPool;
  } catch (error) {
    console.error('? Failed to connect to timeclock database:', error);
    throw error;
  }
}

export function getTimeclockDatabase() {
  if (!timeclockPool) {
    throw new Error('Timeclock database not initialized');
  }
  return timeclockPool;
}

export async function getTimeclockDataByDiscordId(discordId) {
  try {
    const connection = getTimeclockDatabase();
    const [rows] = await connection.execute(
      'SELECT * FROM timeclock_i WHERE identifier = ? ORDER BY timestamp DESC LIMIT 100',
      [discordId]
    );
    return rows;
  } catch (error) {
    console.error('Error getting timeclock data:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeTimeclockDatabase() {
  if (timeclockPool) {
    await timeclockPool.end();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeTimeclockDatabase();
});

process.on('SIGTERM', async () => {
  await closeTimeclockDatabase();
});