import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runQuery, getQuery, allQuery } from '../config/database.js';

const router = express.Router();

// Helper function to check if user has LEO access
function hasLEOAccess(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  
  const userRoles = JSON.parse(user.roles || '[]');
  const userRoleIds = userRoles.map(role => role.id);
  
  return userRoleIds.includes(process.env.VITE_LEO_ROLE_ID);
}

// Helper function to check if user has Judge access
function hasJudgeAccess(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  
  const userRoles = JSON.parse(user.roles || '[]');
  const userRoleIds = userRoles.map(role => role.id);
  
  return userRoleIds.includes(process.env.VITE_JUDGE_ROLE_ID);
}

// Get user's civilian characters
router.get('/characters', requireAuth, async (req, res) => {
  try {
    const characters = await allQuery(`
      SELECT * FROM civilian_characters 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Create new civilian character
router.post('/characters', requireAuth, async (req, res) => {
  try {
    const {
      name, date_of_birth, address, phone_number, profession,
      gender, race, hair_color, eye_color, height, weight,
      backstory, drivers_license_status, firearms_license_status
    } = req.body;

    if (!name || !date_of_birth || !address || !profession || !gender || !race) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = await runQuery(`
      INSERT INTO civilian_characters (
        user_id, name, date_of_birth, address, phone_number, profession,
        gender, race, hair_color, eye_color, height, weight, backstory,
        drivers_license_status, firearms_license_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, name, date_of_birth, address, phone_number, profession,
      gender, race, hair_color, eye_color, height, weight, backstory,
      drivers_license_status || 'Valid', firearms_license_status || 'None'
    ]);

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// Get character details with vehicles, citations, arrests, warrants
router.get('/characters/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get character
    const character = await getQuery(`
      SELECT * FROM civilian_characters WHERE id = ?
    `, [id]);

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check if user owns this character or has LEO/Judge access
    const isOwner = character.user_id === req.user.id;
    const isLEO = hasLEOAccess(req.user);
    const isJudge = hasJudgeAccess(req.user);
    const hasAccess = isOwner || isLEO || isJudge;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get vehicles
    const vehicles = await allQuery(`
      SELECT * FROM civilian_vehicles 
      WHERE character_id = ? 
      ORDER BY created_at DESC
    `, [id]);

    // Get citations
    const citations = await allQuery(`
      SELECT c.*, u.username as issued_by_name 
      FROM civilian_citations c
      LEFT JOIN users u ON c.issued_by = u.id
      WHERE c.character_id = ? 
      ORDER BY c.created_at DESC
    `, [id]);

    // Get arrests
    const arrests = await allQuery(`
      SELECT a.*, u.username as arrested_by_name 
      FROM civilian_arrests a
      LEFT JOIN users u ON a.arrested_by = u.id
      WHERE a.character_id = ? 
      ORDER BY a.created_at DESC
    `, [id]);

    // Get warrants - filter based on user type
    let warrantsQuery = `
      SELECT w.*, u.username as issued_by_name, u2.username as completed_by_name
      FROM civilian_warrants w
      LEFT JOIN users u ON w.issued_by = u.id
      LEFT JOIN users u2 ON w.completed_by = u2.id
      WHERE w.character_id = ?
    `;
    
    // Civilians can only see completed warrants
    if (isOwner && !isLEO && !isJudge) {
      warrantsQuery += ` AND w.status = 'Completed'`;
    }
    
    warrantsQuery += ` ORDER BY w.created_at DESC`;

    const warrants = await allQuery(warrantsQuery, [id]);

    res.json({
      character,
      vehicles,
      citations,
      arrests,
      warrants,
      isOwner,
      hasLEOAccess: isLEO,
      hasJudgeAccess: isJudge
    });
  } catch (error) {
    console.error('Error fetching character details:', error);
    res.status(500).json({ error: 'Failed to fetch character details' });
  }
});

// Update character
router.put('/characters/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get character to check ownership
    const character = await getQuery(`
      SELECT user_id FROM civilian_characters WHERE id = ?
    `, [id]);

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check permissions: owner or judge can edit
    const isOwner = character.user_id === req.user.id;
    const isJudge = hasJudgeAccess(req.user);
    
    if (!isOwner && !isJudge) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      name, date_of_birth, address, phone_number, profession,
      gender, race, hair_color, eye_color, height, weight,
      backstory, drivers_license_status, firearms_license_status
    } = req.body;

    await runQuery(`
      UPDATE civilian_characters SET
        name = ?, date_of_birth = ?, address = ?, phone_number = ?, profession = ?,
        gender = ?, race = ?, hair_color = ?, eye_color = ?, height = ?, weight = ?,
        backstory = ?, drivers_license_status = ?, firearms_license_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name, date_of_birth, address, phone_number, profession,
      gender, race, hair_color, eye_color, height, weight,
      backstory, drivers_license_status, firearms_license_status, id
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// Add vehicle to character
router.post('/characters/:id/vehicles', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, color, plate, registration_status, insurance_status } = req.body;

    // Check if user owns this character or is a judge
    const character = await getQuery(`
      SELECT user_id FROM civilian_characters WHERE id = ?
    `, [id]);

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const isOwner = character.user_id === req.user.id;
    const isJudge = hasJudgeAccess(req.user);

    if (!isOwner && !isJudge) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!make || !model || !color || !plate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if plate already exists
    const existingPlate = await getQuery(`
      SELECT id FROM civilian_vehicles WHERE plate = ?
    `, [plate]);

    if (existingPlate) {
      return res.status(400).json({ error: 'License plate already exists' });
    }

    const result = await runQuery(`
      INSERT INTO civilian_vehicles (
        character_id, make, model, color, plate, registration_status, insurance_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, make, model, color, plate, registration_status || 'Valid', insurance_status || 'Valid']);

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

// Update vehicle
router.put('/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, color, plate, registration_status, insurance_status } = req.body;

    // Get vehicle and character info
    const vehicle = await getQuery(`
      SELECT v.*, c.user_id 
      FROM civilian_vehicles v
      JOIN civilian_characters c ON v.character_id = c.id
      WHERE v.id = ?
    `, [id]);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check permissions: owner or judge can edit
    const isOwner = vehicle.user_id === req.user.id;
    const isJudge = hasJudgeAccess(req.user);

    if (!isOwner && !isJudge) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!make || !model || !color || !plate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if plate already exists (excluding current vehicle)
    const existingPlate = await getQuery(`
      SELECT id FROM civilian_vehicles WHERE plate = ? AND id != ?
    `, [plate, id]);

    if (existingPlate) {
      return res.status(400).json({ error: 'License plate already exists' });
    }

    await runQuery(`
      UPDATE civilian_vehicles SET
        make = ?, model = ?, color = ?, plate = ?,
        registration_status = ?, insurance_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [make, model, color, plate, registration_status, insurance_status, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle
router.delete('/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get vehicle and character info
    const vehicle = await getQuery(`
      SELECT v.*, c.user_id 
      FROM civilian_vehicles v
      JOIN civilian_characters c ON v.character_id = c.id
      WHERE v.id = ?
    `, [id]);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check permissions: owner or judge can delete
    const isOwner = vehicle.user_id === req.user.id;
    const isJudge = hasJudgeAccess(req.user);

    if (!isOwner && !isJudge) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runQuery(`DELETE FROM civilian_vehicles WHERE id = ?`, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// LEO: Search civilians
router.get('/search', requireAuth, async (req, res) => {
  try {
    if (!hasLEOAccess(req.user) && !hasJudgeAccess(req.user)) {
      return res.status(403).json({ error: 'LEO access required' });
    }

    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const characters = await allQuery(`
      SELECT id, name, date_of_birth, address 
      FROM civilian_characters 
      WHERE name LIKE ? OR address LIKE ?
      ORDER BY name
      LIMIT 20
    `, [`%${query}%`, `%${query}%`]);

    res.json(characters);
  } catch (error) {
    console.error('Error searching characters:', error);
    res.status(500).json({ error: 'Failed to search characters' });
  }
});

// LEO: Issue citation
router.post('/characters/:id/citations', requireAuth, async (req, res) => {
  try {
    if (!hasLEOAccess(req.user) && !hasJudgeAccess(req.user)) {
      return res.status(403).json({ error: 'LEO access required' });
    }

    const { id } = req.params;
    const { violation, fine_amount, notes } = req.body;

    if (!violation || !fine_amount) {
      return res.status(400).json({ error: 'Violation and fine amount required' });
    }

    const result = await runQuery(`
      INSERT INTO civilian_citations (
        character_id, violation, fine_amount, notes, issued_by
      ) VALUES (?, ?, ?, ?, ?)
    `, [id, violation, fine_amount, notes, req.user.id]);

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error issuing citation:', error);
    res.status(500).json({ error: 'Failed to issue citation' });
  }
});

// LEO: File arrest report
router.post('/characters/:id/arrests', requireAuth, async (req, res) => {
  try {
    if (!hasLEOAccess(req.user) && !hasJudgeAccess(req.user)) {
      return res.status(403).json({ error: 'LEO access required' });
    }

    const { id } = req.params;
    const { charges, location, notes } = req.body;

    if (!charges || !location) {
      return res.status(400).json({ error: 'Charges and location required' });
    }

    const result = await runQuery(`
      INSERT INTO civilian_arrests (
        character_id, charges, location, notes, arrested_by
      ) VALUES (?, ?, ?, ?, ?)
    `, [id, charges, location, notes, req.user.id]);

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error filing arrest report:', error);
    res.status(500).json({ error: 'Failed to file arrest report' });
  }
});

// Judge: Issue warrant
router.post('/characters/:id/warrants', requireAuth, async (req, res) => {
  try {
    if (!hasJudgeAccess(req.user)) {
      return res.status(403).json({ error: 'Judge access required' });
    }

    const { id } = req.params;
    const { charges, reason } = req.body;

    if (!charges || !reason) {
      return res.status(400).json({ error: 'Charges and reason required' });
    }

    const result = await runQuery(`
      INSERT INTO civilian_warrants (
        character_id, charges, reason, issued_by, status
      ) VALUES (?, ?, ?, ?, 'Active')
    `, [id, charges, reason, req.user.id]);

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error issuing warrant:', error);
    res.status(500).json({ error: 'Failed to issue warrant' });
  }
});

// LEO: Mark warrant as completed
router.put('/warrants/:id/complete', requireAuth, async (req, res) => {
  try {
    if (!hasLEOAccess(req.user) && !hasJudgeAccess(req.user)) {
      return res.status(403).json({ error: 'LEO access required' });
    }

    const { id } = req.params;

    await runQuery(`
      UPDATE civilian_warrants SET
        status = 'Completed',
        completed_by = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.user.id, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing warrant:', error);
    res.status(500).json({ error: 'Failed to complete warrant' });
  }
});

export default router;