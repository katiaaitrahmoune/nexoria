import express from "express";
import pool from "../config/db.js";
import path  from 'path';
import  fs from 'fs';
import { fileURLToPath } from 'url';
import calculate from './dashboardController.js'
const router = express.Router();

router.get("/danger-zones", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT geojson FROM danger_zones ORDER BY id DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No GeoJSON found" });
    }

    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/danger-building", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM map "
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No GeoJSON found" });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/danger-zones/level", async (req, res) => {
  try {
    const { wilaya, level } = req.body;
    
    if (!wilaya || !level) {
      return res.status(400).json({ error: "Wilaya and Level are required" });
    }
    
    const result = await pool.query(
      `UPDATE danger_zones 
       SET geojson = jsonb_set(
         geojson,
         '{features}',
         (
           SELECT jsonb_agg(
             CASE 
               WHEN feature->'properties'->>'Wilaya' = $1 
               THEN jsonb_set(
                 feature,
                 '{properties,Level}',
                 to_jsonb($2)
               )
               ELSE feature
             END
           )
           FROM jsonb_array_elements(geojson->'features') AS feature
         )
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM danger_zones ORDER BY id DESC LIMIT 1)
       RETURNING id`,
      [wilaya, level]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No danger zone record found" });
    }
    
    res.json({ 
      message: `Updated ${wilaya} danger level to ${level}`, 
      id: result.rows[0].id 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, './assurance.csv');

router.get('/csv', (req, res) => {
  if (!fs.existsSync(CSV_PATH)) {
    return res.status(404).json({ error: 'CSV file not found. Place assurance.csv in /data folder.' });
  }
  res.download(CSV_PATH, 'assurance.csv');
});

router.post("/calculer", calculate);
export default router;
