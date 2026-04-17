import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RPA_ZONES } from '../controllers/rpa_config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const CSV_PATH = path.join(__dirname, '../../public/assurance.csv');

// ── Calcul damage_ratio selon RPA chap.9 ──────────────────
function computeDamageRatio({
  zone_sismique, nb_niveaux, hauteur, longueur, largeur,
  epaisseur_mur, densite_murs, distance_entre_murs,
  resistance_mortier, resistance_beton,
  age_batiment, type_batiment,
}) {
  // Base loss rate par zone (calibré sur Boumerdès 2003)
  const BASE = { '0': 0.01, 'I': 0.08, 'IIa': 0.14, 'IIb': 0.22, 'III': 0.30 };
  let ratio = BASE[zone_sismique] || 0.14;

  // ── Violations RPA ch.9 → chaque violation ajoute au ratio ──
  const violations = [];

  // Hauteur max (tableau 9.1 RPA)
  const MAX_H = { '0': 99, 'I': 17, 'IIa': 17, 'IIb': 14, 'III': 11 };
  if (hauteur > (MAX_H[zone_sismique] || 17)) {
    violations.push('viol_hauteur'); ratio += 0.08;
  }

  // Nb étages max (tableau 9.1 RPA)
  const MAX_N = { '0': 99, 'I': 5, 'IIa': 5, 'IIb': 4, 'III': 3 };
  if (nb_niveaux > (MAX_N[zone_sismique] || 5)) {
    violations.push('viol_etages'); ratio += 0.08;
  }

  // Ratio longueur/largeur ≤ 3.5 (RPA 9.1.3)
  const ratio_ll = longueur / largeur;
  if (ratio_ll > 3.5) {
    violations.push('viol_ratio_plan'); ratio += 0.05;
  }

  // Densité murs ≥ 4% (RPA 9.1.4)
  if (densite_murs < 0.04) {
    violations.push('viol_densite_murs'); ratio += 0.07;
  }

  // Épaisseur mur ≥ 20cm (RPA 9.3.2)
  if (epaisseur_mur < 20) {
    violations.push('viol_epaisseur'); ratio += 0.05;
  }

  // Résistance mortier ≥ 5 MPa (RPA 9.2.2.3)
  if (resistance_mortier < 5) {
    violations.push('viol_mortier'); ratio += 0.06;
  }

  // Résistance béton ≥ 15 MPa (RPA 9.2.2.5)
  if (resistance_beton < 15) {
    violations.push('viol_beton'); ratio += 0.06;
  }

  // Distance entre murs porteurs (RPA 9.1.4)
  const MAX_DIST = { '0': 99, 'I': 10, 'IIa': 10, 'IIb': 8, 'III': 6 };
  if (distance_entre_murs > (MAX_DIST[zone_sismique] || 10)) {
    violations.push('viol_dist_murs'); ratio += 0.05;
  }

  // Âge du bâtiment → dégradation
  if (age_batiment > 50) ratio += 0.10;
  else if (age_batiment > 30) ratio += 0.05;
  else if (age_batiment > 15) ratio += 0.02;

  // Building class (3A plus résilient que 3B)
  const typeMultiplier = type_batiment === 'Industriel' ? 0.9
    : type_batiment === 'Commercial' ? 1.15 : 1.3;
  ratio *= typeMultiplier;

  return {
    damage_ratio:    parseFloat(Math.min(ratio, 0.95).toFixed(4)),
    rpa_nb_violations: violations.length,
    rpa_conforme:    violations.length === 0 ? 1 : 0,
    violations,      // liste détaillée
  };
}

// POST /api/assets/add
router.post('/add', (req, res) => {
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

    // ── Validation champs obligatoires ──────────────────────
    if (!NUMERO_POLICE || !DATE_EFFET || !DATE_EXPIRATION ||
        !WILAYA || !COMMUNE || !sum_insured || !longueur || !largeur) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // ── Auto-calculs ────────────────────────────────────────
    const wilayaClean    = WILAYA.trim().toUpperCase();
    const communeClean   = COMMUNE.trim().toUpperCase();
    const zone_sismique  = RPA_ZONES[wilayaClean] || 'I';
    const zone_ord       = { '0': 0, 'I': 1, 'IIa': 2, 'IIb': 3, 'III': 4 }[zone_sismique];
    const annee          = new Date(DATE_EFFET).getFullYear();
    const age_batiment   = age_construction ? annee - age_construction : 0;
    const duree          = Math.round((new Date(DATE_EXPIRATION) - new Date(DATE_EFFET)) / 86400000);
    const densite_murs   = aire_murs && surface_plancher ? parseFloat((aire_murs / surface_plancher).toFixed(4)) : 0.04;
    const ratio_ll       = parseFloat((longueur / largeur).toFixed(3));
    const ratio_hl       = parseFloat((hauteur / largeur).toFixed(3));
    const taux_prime     = parseFloat((prime_nette / sum_insured).toFixed(6));
    const wilaya_id      = parseInt(NUMERO_POLICE.toString().substring(0, 2)) || 0;
    const tax_rate       = { '0': 0, 'I': 0.10, 'IIa': 0.14, 'IIb': 0.22, 'III': 0.38 }[zone_sismique];

    // ── Damage ratio via RPA ch.9 ───────────────────────────
    const { damage_ratio, rpa_nb_violations, rpa_conforme, violations } = computeDamageRatio({
      zone_sismique, nb_niveaux, hauteur, longueur, largeur,
      epaisseur_mur, densite_murs, distance_entre_murs,
      resistance_mortier, resistance_beton,
      age_batiment, type_batiment,
    });

    const expected_payout = Math.round(sum_insured * damage_ratio);

    // ── Construire la ligne CSV ─────────────────────────────
    const viol = violations;
    const newRow = [
      NUMERO_POLICE, wilaya_id, wilayaClean, communeClean,
      zone_sismique, zone_ord, type_batiment, building_class,
      sum_insured, prime_nette, taux_prime,
      DATE_EFFET, DATE_EXPIRATION, duree,
      nb_niveaux, hauteur, longueur, largeur,
      surface_plancher || (longueur * largeur),
      aire_murs || '',
      densite_murs, epaisseur_mur, distance_entre_murs,
      ratio_ll, ratio_hl,
      resistance_mortier, resistance_beton,
      age_construction || '', age_batiment,
      rpa_conforme, rpa_nb_violations,
      viol.includes('viol_hauteur')      ? 1 : 0,
      viol.includes('viol_etages')       ? 1 : 0,
      viol.includes('viol_ratio_plan')   ? 1 : 0,
      viol.includes('viol_densite_murs') ? 1 : 0,
      viol.includes('viol_epaisseur')    ? 1 : 0,
      viol.includes('viol_mortier')      ? 1 : 0,
      viol.includes('viol_beton')        ? 1 : 0,
      viol.includes('viol_dist_murs')    ? 1 : 0,
      tax_rate, damage_ratio, expected_payout,
    ].join(',');

    fs.appendFileSync(CSV_PATH, '\n' + newRow, 'utf8');

    res.status(201).json({
      message: 'Asset ajouté avec succès',
      computed: {
        zone_sismique,
        damage_ratio,
        expected_payout,
        rpa_conforme: rpa_conforme === 1,
        rpa_nb_violations,
        violations,          // ← ce qui a été violé exactement
      },
      row: newRow,
    });

  } catch (err) {
    console.error('Add asset error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;