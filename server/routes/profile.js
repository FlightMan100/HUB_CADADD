import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { findUserByDiscordId, getUserPunitiveRecords } from '../config/staffDatabase.js';

const router = express.Router();

// Get user profile data
router.get('/:discordId', requireAuth, async (req, res) => {
  try {
    const { discordId } = req.params;
    
    // Ensure user can only access their own profile (unless admin)
    if (req.user.discord_id !== discordId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Find user in staff database
    const staffUser = await findUserByDiscordId(discordId);
    
    if (!staffUser) {
      return res.status(404).json({ error: 'User not found in staff database' });
    }
    
    // Get punitive records
    const punitiveRecords = await getUserPunitiveRecords(discordId);
    
    // Prepare response data
    const profileData = {
      trustScore: staffUser.trustscore || 0,
      kicks: punitiveRecords.kicks,
      warnings: punitiveRecords.warnings,
      bans: punitiveRecords.bans,
      commends: punitiveRecords.commends
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

export default router;