import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RPA_ZONES, TYPE_VULNERABILITY } from '../controllers/rpa_config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const CSV_PATH = path.join(__dirname, '../../public/assurance.csv');

// POST /api/assets/add
router.post('/add', (req, res) => {
  try {
    const {
      numero_police,
      code_sous_branche = 3302,
      num_avnt_cours = 0,
      date_effet,
      date_expiration,
      type_bien,
      wilaya,
      commune,
      capital_assure,
      prime_nette,
    } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!numero_police || !date_effet || !date_expiration || !wilaya || !commune || !capital_assure || !prime_nette || !type_bien) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // ── Auto-calculer zone_rpa + vulnerability_score ────────
    const wilayaClean = wilaya.trim().toUpperCase();
    const zone_rpa = RPA_ZONES[wilayaClean] || 'I';

    const typeKey = type_bien.includes('Industrielle') ? 'Industrielle'
                  : type_bien.includes('Commerciale')  ? 'Commerciale'
                  : 'Résidentiel';
    const vulnerability_score = TYPE_VULNERABILITY[typeKey] || 1.0;

    // ── Extraire l'année depuis date_effet ──────────────────
    const annee = new Date(date_effet).getFullYear();

    // ── Construire la nouvelle ligne CSV ────────────────────
    const newRow = [
      numero_police,
      code_sous_branche,
      num_avnt_cours,
      date_effet,
      date_expiration,
      type_bien,
      wilayaClean,
      commune.trim().toUpperCase(),
      capital_assure,
      prime_nette,
      annee,
      zone_rpa,
      vulnerability_score,
    ].join(',');

    // ── Append au CSV ───────────────────────────────────────
    fs.appendFileSync(CSV_PATH, '\n' + newRow, 'utf8');

    res.status(201).json({
      message: 'Asset ajouté avec succès',
      asset: {
        numero_police,
        wilaya: wilayaClean,
        commune: commune.trim().toUpperCase(),
        type_bien,
        capital_assure,
        prime_nette,
        annee,
        zone_rpa,
        vulnerability_score,
      },
    });

  } catch (err) {
    console.error('Add asset error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;