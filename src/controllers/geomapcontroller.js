import express from "express";
import pool from "../config/db.js";

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

// UPDATE - Update just the danger level for a specific wilaya
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

export default router;