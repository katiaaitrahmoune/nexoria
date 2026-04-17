import express from 'express';
import pool from '../config/db.js';

const router = express.Router();
router.get('/wilayas', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT wilaya 
      FROM your_table_name 
      ORDER BY wilaya ASC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      count: result.rows.length,
      wilayas: result.rows.map(row => row.wilaya)
    });
    
  } catch (err) {
    console.error('Error fetching wilayas:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.get('/communes', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT commune 
      FROM your_table_name 
      ORDER BY commune ASC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      count: result.rows.length,
      communes: result.rows.map(row => row.commune)
    });
    
  } catch (err) {
    console.error('Error fetching communes:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});
router.get('/wilayas/:wilaya/communes', async (req, res) => {
  try {
    const { wilaya } = req.params;
    
    const query = `
      SELECT DISTINCT commune 
      FROM your_table_name 
      WHERE wilaya ILIKE $1
      ORDER BY commune ASC
    `;
    
    const result = await pool.query(query, [wilaya]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No communes found for wilaya: ${wilaya}`
      });
    }
    
    res.json({
      success: true,
      wilaya: wilaya,
      count: result.rows.length,
      communes: result.rows.map(row => row.commune)
    });
    
  } catch (err) {
    console.error('Error fetching communes by wilaya:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

export default router;