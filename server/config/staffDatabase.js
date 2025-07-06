import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let staffPool = null;

export async function initializeStaffDatabase() {
  try {
    staffPool = mysql.createPool({
      host: process.env.STAFF_DB_HOST,
      port: process.env.STAFF_DB_PORT || 3306,
      user: process.env.STAFF_DB_USER,
      password: process.env.STAFF_DB_PASSWORD,
      database: process.env.STAFF_DB_NAME,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    
    // Verify connection
    const connection = await staffPool.getConnection();
    await connection.release();
    console.log('? Connected to staff database');
    return staffPool;
  } catch (error) {
    console.error('? Failed to connect to staff database:', error);
    throw error;
  }
}

export function getStaffDatabase() {
  if (!staffPool) {
    throw new Error('Staff database not initialized');
  }
  return staffPool;
}

export async function findUserByDiscordId(discordId) {
  try {
    const connection = getStaffDatabase();
    const [rows] = await connection.execute(
      'SELECT * FROM players WHERE discord = ?',
      [`discord:${discordId}`]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error finding user by Discord ID:', error);
    throw error;
  }
}

export async function getUserPunitiveRecords(discordId) {
  try {
    const connection = getStaffDatabase();
    const [players] = await connection.execute(
      'SELECT license FROM players WHERE discord = ?',
      [`discord:${discordId}`]
    );

    if (players.length === 0) {
      console.warn(`No player found with discord:${discordId}`);
      return {
        kicks: [],
        bans: []
      };
    }

    const license = players[0].license;
    
    // Get kicks and bans in parallel
    const [kicks, bans] = await Promise.all([
      connection.execute('SELECT * FROM kicks WHERE license = ? ORDER BY id DESC', [license])
        .then(([rows]) => rows),
      connection.execute('SELECT * FROM bans WHERE identifier = ? ORDER BY id DESC', [license])
        .then(([rows]) => rows)
    ]);

    return {
      kicks,
      bans
    };
  } catch (error) {
    console.error('Error getting user punitive records:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeStaffDatabase() {
  if (staffPool) {
    await staffPool.end();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeStaffDatabase();
});

process.on('SIGTERM', async () => {
  await closeStaffDatabase();
});