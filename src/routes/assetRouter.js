import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RPA_ZONES } from '../controllers/rpa_config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CSV_PATH = path.join(PROJECT_ROOT, 'public', 'addassurance.csv');

const ML_ENDPOINT = 'https://ai-assesments.onrender.com/predict';

// ── CSV Headers (aligned with DataFrame) ──────────────────
const CSV_HEADERS = [
  'NUMERO_POLICE', 'wilaya_id', 'WILAYA', 'COMMUNE',
  'zone_sismique', 'zone_ord', 'type_batiment', 'building_class',
  'sum_insured', 'prime_nette', 'taux_prime_brut',
  'DATE_EFFET', 'DATE_EXPIRATION', 'duree_police_jours',
  'nb_niveaux', 'hauteur', 'longueur', 'largeur',
  'surface_plancher', 'aire_murs', 'densite_murs', 'epaisseur_mur',
  'distance_entre_murs', 'ratio_longlarg', 'ratio_hauteur_larg',
  'resistance_mortier', 'resistance_beton',
  'age_construction', 'age_batiment',
  'rpa_conforme', 'rpa_nb_violations',
  'viol_hauteur', 'viol_etages', 'viol_ratio_plan', 'viol_densite_murs',
  'viol_epaisseur', 'viol_mortier', 'viol_beton', 'viol_dist_murs',
  'tax_rate', 'damage_ratio', 'expected_payout', 'annee_construction',
];

// ── Calcul damage_ratio selon RPA chap.9 ──────────────────
function computeDamageRatio({
  zone_sismique, nb_niveaux, hauteur, longueur, largeur,
  epaisseur_mur, densite_murs, distance_entre_murs,
  resistance_mortier, resistance_beton,
  age_batiment, type_batiment,
}) {
  const BASE = { '0': 0.01, 'I': 0.08, 'IIa': 0.14, 'IIb': 0.22, 'III': 0.30 };
  let ratio = BASE[zone_sismique] || 0.14;

  const violations = [];

  const MAX_H = { '0': 99, 'I': 17, 'IIa': 17, 'IIb': 14, 'III': 11 };
  if (hauteur > (MAX_H[zone_sismique] || 17)) {
    violations.push('viol_hauteur'); ratio += 0.08;
  }

  const MAX_N = { '0': 99, 'I': 5, 'IIa': 5, 'IIb': 4, 'III': 3 };
  if (nb_niveaux > (MAX_N[zone_sismique] || 5)) {
    violations.push('viol_etages'); ratio += 0.08;
  }

  const ratio_ll = longueur / largeur;
  if (ratio_ll > 3.5) {
    violations.push('viol_ratio_plan'); ratio += 0.05;
  }

  if (densite_murs < 0.04) {
    violations.push('viol_densite_murs'); ratio += 0.07;
  }

  if (epaisseur_mur < 20) {
    violations.push('viol_epaisseur'); ratio += 0.05;
  }

  if (resistance_mortier < 5) {
    violations.push('viol_mortier'); ratio += 0.06;
  }

  if (resistance_beton < 15) {
    violations.push('viol_beton'); ratio += 0.06;
  }

  const MAX_DIST = { '0': 99, 'I': 10, 'IIa': 10, 'IIb': 8, 'III': 6 };
  if (distance_entre_murs > (MAX_DIST[zone_sismique] || 10)) {
    violations.push('viol_dist_murs'); ratio += 0.05;
  }

  if (age_batiment > 50) ratio += 0.10;
  else if (age_batiment > 30) ratio += 0.05;
  else if (age_batiment > 15) ratio += 0.02;

  const typeMultiplier = type_batiment === 'Industriel' ? 0.9
    : type_batiment === 'Commercial' ? 1.15 : 1.3;
  ratio *= typeMultiplier;

  return {
    damage_ratio:      parseFloat(Math.min(ratio, 0.95).toFixed(4)),
    rpa_nb_violations: violations.length,
    rpa_conforme:      violations.length === 0 ? 1 : 0,
    violations,
  };
}

// ── Helper: write one row to CSV ───────────────────────────
function appendToCSV(rowData) {
  const newRow = rowData.join(',');
  const dir = path.dirname(CSV_PATH);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(CSV_PATH)) {
    fs.appendFileSync(CSV_PATH, CSV_HEADERS.join(',') + '\n' + newRow, 'utf8');
    return { isNewFile: true, newRow };
  } else {
    fs.appendFileSync(CSV_PATH, '\n' + newRow, 'utf8');
    return { isNewFile: false, newRow };
  }
}

// ── Helper: POST body to ML endpoint ──────────────────────
async function postToML(body) {
  try {
    const response = await fetch(ML_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (err) {
    console.error('ML endpoint error:', err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================
// POST /api/assets/add
// Ajouter une assurance + calculer + poster au ML
// ============================================================
router.post('/add', async (req, res) => {
  try {
    const {
      NUMERO_POLICE, DATE_EFFET, DATE_EXPIRATION,
      WILAYA, COMMUNE, type_batiment = 'Industriel',
      building_class = '3A', sum_insured, prime_nette,
      nb_niveaux = 1, hauteur = 3, longueur, largeur,
      surface_plancher, aire_murs,
      epaisseur_mur = 20, distance_entre_murs = 6,
      resistance_mortier = 5, resistance_beton = 15,
      age_construction,
    } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!NUMERO_POLICE || !DATE_EFFET || !DATE_EXPIRATION ||
        !WILAYA || !COMMUNE || !sum_insured || !longueur || !largeur) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // ── Auto-calculs ────────────────────────────────────────
    const wilayaClean       = WILAYA.trim().toUpperCase();
    const communeClean      = COMMUNE.trim().toUpperCase();
    const zone_sismique     = RPA_ZONES[wilayaClean] || 'I';
    const zone_ord          = { '0': 0, 'I': 1, 'IIa': 2, 'IIb': 3, 'III': 4 }[zone_sismique];
    const annee             = new Date(DATE_EFFET).getFullYear();
    const age_batiment      = age_construction ? annee - age_construction : 0;
    const annee_construction = age_construction || '';
    const duree_police_jours = Math.round((new Date(DATE_EXPIRATION) - new Date(DATE_EFFET)) / 86400000);
    const densite_murs      = aire_murs && surface_plancher ? parseFloat((aire_murs / surface_plancher).toFixed(4)) : 0.04;
    const ratio_longlarg    = parseFloat((longueur / largeur).toFixed(3));
    const ratio_hauteur_larg = parseFloat((hauteur / largeur).toFixed(3));
    const taux_prime_brut   = parseFloat((prime_nette / sum_insured).toFixed(6));
    const wilaya_id         = parseInt(NUMERO_POLICE.toString().substring(0, 2)) || 0;
    const tax_rate          = { '0': 0, 'I': 0.10, 'IIa': 0.14, 'IIb': 0.22, 'III': 0.38 }[zone_sismique];

    // ── Damage ratio via RPA ch.9 ───────────────────────────
    const { damage_ratio, rpa_nb_violations, rpa_conforme, violations } = computeDamageRatio({
      zone_sismique, nb_niveaux, hauteur, longueur, largeur,
      epaisseur_mur, densite_murs, distance_entre_murs,
      resistance_mortier, resistance_beton,
      age_batiment, type_batiment,
    });

    const expected_payout = Math.round(sum_insured * damage_ratio);

    // ── Construire le body complet ──────────────────────────
    const fullBody = {
      NUMERO_POLICE, wilaya_id, WILAYA: wilayaClean, COMMUNE: communeClean,
      zone_sismique, zone_ord, type_batiment, building_class,
      sum_insured, prime_nette, taux_prime_brut,
      DATE_EFFET, DATE_EXPIRATION, duree_police_jours,
      nb_niveaux, hauteur, longueur, largeur,
      surface_plancher: surface_plancher || (longueur * largeur),
      aire_murs: aire_murs || '',
      densite_murs, epaisseur_mur, distance_entre_murs,
      ratio_longlarg, ratio_hauteur_larg,
      resistance_mortier, resistance_beton,
      age_construction: age_construction || '',
      age_batiment,
      rpa_conforme, rpa_nb_violations,
      viol_hauteur:       violations.includes('viol_hauteur') ? 1 : 0,
      viol_etages:        violations.includes('viol_etages') ? 1 : 0,
      viol_ratio_plan:    violations.includes('viol_ratio_plan') ? 1 : 0,
      viol_densite_murs:  violations.includes('viol_densite_murs') ? 1 : 0,
      viol_epaisseur:     violations.includes('viol_epaisseur') ? 1 : 0,
      viol_mortier:       violations.includes('viol_mortier') ? 1 : 0,
      viol_beton:         violations.includes('viol_beton') ? 1 : 0,
      viol_dist_murs:     violations.includes('viol_dist_murs') ? 1 : 0,
      tax_rate, damage_ratio, expected_payout,
      annee_construction,
    };

    // ── POST vers ML endpoint ───────────────────────────────
    const mlResult = await postToML(fullBody);
    console.log('🤖 ML response:', mlResult);

    res.status(201).json({
      message: isNewFile ? 'Nouveau fichier créé avec succès' : 'Asset ajouté avec succès',
      action: isNewFile ? 'created' : 'appended',
      computed: {
        zone_sismique, damage_ratio, expected_payout,
        rpa_conforme: rpa_conforme === 1, rpa_nb_violations, violations,
      },
      ml_result: mlResult,
      new_row: newRow,
    });

  } catch (err) {
    console.error('Add asset error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/assets/add-predicted
// Reçoit un body déjà complet (depuis ML ou frontend)
// Re-calcule exactement comme /add et écrit dans le CSV
// ============================================================
router.post('/add-predicted', async (req, res) => {
  try {
    const {
      NUMERO_POLICE, DATE_EFFET, DATE_EXPIRATION,
      WILAYA, COMMUNE, type_batiment = 'Industriel',
      building_class = '3A', sum_insured, prime_nette,
      nb_niveaux = 1, hauteur = 3, longueur, largeur,
      surface_plancher, aire_murs,
      epaisseur_mur = 20, distance_entre_murs = 6,
      resistance_mortier = 5, resistance_beton = 15,
      age_construction,
    } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!NUMERO_POLICE || !DATE_EFFET || !DATE_EXPIRATION ||
        !WILAYA || !COMMUNE || !sum_insured || !longueur || !largeur) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // ── Auto-calculs (identiques à /add) ───────────────────
    const wilayaClean        = WILAYA.trim().toUpperCase();
    const communeClean       = COMMUNE.trim().toUpperCase();
    const zone_sismique      = RPA_ZONES[wilayaClean] || 'I';
    const zone_ord           = { '0': 0, 'I': 1, 'IIa': 2, 'IIb': 3, 'III': 4 }[zone_sismique];
    const annee              = new Date(DATE_EFFET).getFullYear();
    const age_batiment       = age_construction ? annee - age_construction : 0;
    const annee_construction = age_construction || '';
    const duree_police_jours = Math.round((new Date(DATE_EXPIRATION) - new Date(DATE_EFFET)) / 86400000);
    const densite_murs       = aire_murs && surface_plancher ? parseFloat((aire_murs / surface_plancher).toFixed(4)) : 0.04;
    const ratio_longlarg     = parseFloat((longueur / largeur).toFixed(3));
    const ratio_hauteur_larg = parseFloat((hauteur / largeur).toFixed(3));
    const taux_prime_brut    = parseFloat((prime_nette / sum_insured).toFixed(6));
    const wilaya_id          = parseInt(NUMERO_POLICE.toString().substring(0, 2)) || 0;
    const tax_rate           = { '0': 0, 'I': 0.10, 'IIa': 0.14, 'IIb': 0.22, 'III': 0.38 }[zone_sismique];

    const { damage_ratio, rpa_nb_violations, rpa_conforme, violations } = computeDamageRatio({
      zone_sismique, nb_niveaux, hauteur, longueur, largeur,
      epaisseur_mur, densite_murs, distance_entre_murs,
      resistance_mortier, resistance_beton,
      age_batiment, type_batiment,
    });

    const expected_payout = Math.round(sum_insured * damage_ratio);

    // ── Body complet (inclut tout ce qui vient du req.body aussi) ──
    const fullBody = {
      ...req.body,                          // preserve any extra fields from caller
      NUMERO_POLICE, wilaya_id, WILAYA: wilayaClean, COMMUNE: communeClean,
      zone_sismique, zone_ord, type_batiment, building_class,
      sum_insured, prime_nette, taux_prime_brut,
      DATE_EFFET, DATE_EXPIRATION, duree_police_jours,
      nb_niveaux, hauteur, longueur, largeur,
      surface_plancher: surface_plancher || (longueur * largeur),
      aire_murs: aire_murs || '',
      densite_murs, epaisseur_mur, distance_entre_murs,
      ratio_longlarg, ratio_hauteur_larg,
      resistance_mortier, resistance_beton,
      age_construction: age_construction || '',
      age_batiment,
      rpa_conforme, rpa_nb_violations,
      viol_hauteur:      violations.includes('viol_hauteur') ? 1 : 0,
      viol_etages:       violations.includes('viol_etages') ? 1 : 0,
      viol_ratio_plan:   violations.includes('viol_ratio_plan') ? 1 : 0,
      viol_densite_murs: violations.includes('viol_densite_murs') ? 1 : 0,
      viol_epaisseur:    violations.includes('viol_epaisseur') ? 1 : 0,
      viol_mortier:      violations.includes('viol_mortier') ? 1 : 0,
      viol_beton:        violations.includes('viol_beton') ? 1 : 0,
      viol_dist_murs:    violations.includes('viol_dist_murs') ? 1 : 0,
      tax_rate, damage_ratio, expected_payout,
      annee_construction,
    };

    // ── Écrire dans le CSV ──────────────────────────────────
    const rowData = CSV_HEADERS.map(h => fullBody[h] ?? '');
    const { isNewFile, newRow } = appendToCSV(rowData);
    console.log(isNewFile ? '📁 Nouveau fichier CSV créé' : '📝 Ligne ajoutée au CSV');

  
  } catch (err) {
    console.error('Add predicted asset error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/assets/read
// ============================================================
router.get('/read', (req, res) => {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      return res.status(404).json({ error: 'Fichier non trouvé', path: CSV_PATH });
    }

    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.trim().split('\n');

    res.json({
      success: true,
      path: CSV_PATH,
      total_rows: lines.length - 1,
      headers: lines[0] ? lines[0].split(',') : [],
      data: lines.slice(1),
      full_content: content,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;