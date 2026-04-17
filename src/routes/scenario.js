import express from 'express';
import { loadPortfolio } from '../controllers/portfolio_loader.js';
import {
  ZONE_ACCELERATION,
  ZONE_BASE_LOSS_RATE,
  TYPE_VULNERABILITY,
  ZONE_ORDER,
} from '../controllers/rpa_config.js';

const router = express.Router();

// Helper function
function formatDZD(n) {
  return Math.round(n).toLocaleString('fr-DZ');
}

// ============================================================
//  POST /api/scenario/simulate
// ============================================================

router.post('/simulate', (req, res) => {
  try {
    const {
      targetZones = ['III'],
      magnitude = 7.0,
      retentionCapacity = 5_000_000_000,
      year = 2025,
    } = req.body;

    // ── 1. Validate inputs ──────────────────────────────────
    const validZones = ['0', 'I', 'IIa', 'IIb', 'III'];
    const zones = targetZones.filter(z => validZones.includes(z));
    if (zones.length === 0) {
      return res.status(400).json({ error: 'Aucune zone valide fournie' });
    }
    const mag = Math.min(Math.max(parseFloat(magnitude), 5.0), 8.5);

    // ── 2. Magnitude amplifier ──────────────────────────────
    const refMagnitude = 6.8;
    const magnitudeAmplifier = Math.pow(10, 0.5 * (mag - refMagnitude) * 0.6);
    const clampedAmplifier = Math.min(Math.max(magnitudeAmplifier, 0.3), 2.5);

    // ── 3. Load portfolio ───────────────────────────────────
    const portfolio = loadPortfolio();
    const contracts = portfolio.contracts.filter(c => c.year === year);

    if (contracts.length === 0) {
      return res.status(404).json({ error: `Aucun contrat pour l'année ${year}` });
    }

    // ── 4. Compute losses per contract ─────────────────────
    const affectedContracts = [];
    const unaffectedContracts = [];

    for (const c of contracts) {
      if (!zones.includes(c.zone)) {
        unaffectedContracts.push(c);
        continue;
      }

      const baseLossRate    = ZONE_BASE_LOSS_RATE[c.zone] || 0.10;
      const typeMultiplier  = TYPE_VULNERABILITY[c.type]  || 1.0;
      const rawRate         = baseLossRate * typeMultiplier * clampedAmplifier;
      const lossRate        = Math.min(rawRate, 0.95);

      const lossAmount = c.capital * lossRate;

      affectedContracts.push({
        ...c,
        lossRate: parseFloat(lossRate.toFixed(4)),
        lossAmount: Math.round(lossAmount),
      });
    }

    // ── 5. Aggregate results ────────────────────────────────
    const totalAffectedCapital = affectedContracts.reduce((s, c) => s + c.capital, 0);
    const totalLoss            = affectedContracts.reduce((s, c) => s + c.lossAmount, 0);
    const totalPortfolioCapital = contracts.reduce((s, c) => s + c.capital, 0);

    // Breakdown by zone
    const byZone = {};
    for (const c of affectedContracts) {
      if (!byZone[c.zone]) {
        byZone[c.zone] = {
          zone: c.zone,
          zoneLabel: ZONE_ACCELERATION[c.zone]?.label || c.zone,
          color: ZONE_ACCELERATION[c.zone]?.color || '#888',
          contracts: 0,
          capitalExposed: 0,
          estimatedLoss: 0,
          avgLossRate: 0,
        };
      }
      byZone[c.zone].contracts++;
      byZone[c.zone].capitalExposed += c.capital;
      byZone[c.zone].estimatedLoss  += c.lossAmount;
    }
    for (const z of Object.values(byZone)) {
      z.avgLossRate = z.capitalExposed > 0
        ? parseFloat((z.estimatedLoss / z.capitalExposed).toFixed(4))
        : 0;
      z.capitalExposed  = Math.round(z.capitalExposed);
      z.estimatedLoss   = Math.round(z.estimatedLoss);
    }

    // Breakdown by type
    const byType = {};
    for (const c of affectedContracts) {
      if (!byType[c.type]) byType[c.type] = { type: c.type, contracts: 0, capitalExposed: 0, estimatedLoss: 0 };
      byType[c.type].contracts++;
      byType[c.type].capitalExposed += c.capital;
      byType[c.type].estimatedLoss  += c.lossAmount;
    }
    for (const t of Object.values(byType)) {
      t.capitalExposed = Math.round(t.capitalExposed);
      t.estimatedLoss  = Math.round(t.estimatedLoss);
    }

    // Breakdown by wilaya (top 10 by loss)
    const byWilaya = {};
    for (const c of affectedContracts) {
      if (!byWilaya[c.wilaya]) byWilaya[c.wilaya] = {
        wilaya: c.wilaya, zone: c.zone, contracts: 0, capitalExposed: 0, estimatedLoss: 0
      };
      byWilaya[c.wilaya].contracts++;
      byWilaya[c.wilaya].capitalExposed += c.capital;
      byWilaya[c.wilaya].estimatedLoss  += c.lossAmount;
    }
    const topWilayas = Object.values(byWilaya)
      .sort((a, b) => b.estimatedLoss - a.estimatedLoss)
      .slice(0, 10)
      .map(w => ({
        ...w,
        capitalExposed: Math.round(w.capitalExposed),
        estimatedLoss:  Math.round(w.estimatedLoss),
      }));

    // ── 6. Financial assessment ─────────────────────────────
    const retentionGap   = totalLoss - retentionCapacity;
    const coverageRatio  = retentionCapacity / Math.max(totalLoss, 1);
    const portfolioImpact = totalPortfolioCapital > 0
      ? totalLoss / totalPortfolioCapital
      : 0;

    let riskLevel, riskMessage;
    if (coverageRatio >= 2.0) {
      riskLevel = 'LOW';
      riskMessage = 'Capacité de rétention largement suffisante. Portefeuille résilient.';
    } else if (coverageRatio >= 1.0) {
      riskLevel = 'MODERATE';
      riskMessage = 'La rétention couvre les pertes mais avec peu de marge. Surveiller.';
    } else if (coverageRatio >= 0.5) {
      riskLevel = 'HIGH';
      riskMessage = 'Rétention insuffisante. La compagnie doit puiser dans ses réserves.';
    } else {
      riskLevel = 'CRITICAL';
      riskMessage = 'Risque de ruine technique. Recapitalisation ou réassurance urgente requise.';
    }

    // ── 7. Recommendations ─────────────────────────────────
    const recommendations = [];
    const totalCapitalZone3 = byZone['III']?.capitalExposed || 0;
    const zone3pct = totalCapitalZone3 / Math.max(totalPortfolioCapital, 1);
    if (zone3pct > 0.30) {
      recommendations.push({
        priority: 'HAUTE',
        action: `Zone III représente ${(zone3pct * 100).toFixed(1)}% du capital. Plafonner les nouveaux contrats dans ces wilayas.`,
      });
    }
    if (byType['Résidentiel']?.estimatedLoss > (byType['Industrielle']?.estimatedLoss || 0)) {
      recommendations.push({
        priority: 'MOYENNE',
        action: 'Les biens résidentiels génèrent les pertes les plus élevées. Imposer une inspection technique parasismique à la souscription.',
      });
    }
    if (retentionGap > 0) {
      recommendations.push({
        priority: 'HAUTE',
        action: `Déficit de rétention : ${formatDZD(retentionGap)} DZD. Négocier un traité de réassurance catastrophe (Cat XL).`,
      });
    }
    if (portfolio.dataQuality.estimated > portfolio.dataQuality.withRealCapital) {
      recommendations.push({
        priority: 'OPÉRATIONNELLE',
        action: `${portfolio.dataQuality.estimated.toLocaleString()} contrats sans capital assuré renseigné. Mettre à jour la base pour affiner les calculs.`,
      });
    }

    // ── 8. Response ─────────────────────────────────────────
    res.json({
      meta: {
        year,
        targetZones: zones,
        magnitude: mag,
        magnitudeAmplifier: parseFloat(clampedAmplifier.toFixed(3)),
        retentionCapacity,
        generatedAt: new Date().toISOString(),
      },
      exposure: {
        totalContracts:       contracts.length,
        affectedContracts:    affectedContracts.length,
        unaffectedContracts:  unaffectedContracts.length,
        totalPortfolioCapital: Math.round(totalPortfolioCapital),
        totalAffectedCapital:  Math.round(totalAffectedCapital),
        concentrationRatio: parseFloat((totalAffectedCapital / Math.max(totalPortfolioCapital, 1)).toFixed(4)),
      },
      losses: {
        totalEstimatedLoss: Math.round(totalLoss),
        byZone:   Object.values(byZone).sort((a, b) => ZONE_ORDER[b.zone] - ZONE_ORDER[a.zone]),
        byType:   Object.values(byType),
        byWilaya: topWilayas,
      },
      financial: {
        retentionCapacity,
        retentionGap:    Math.round(retentionGap),
        coverageRatio:   parseFloat(coverageRatio.toFixed(3)),
        portfolioImpact: parseFloat(portfolioImpact.toFixed(4)),
        riskLevel,
        riskMessage,
      },
      recommendations,
      dataQuality: portfolio.dataQuality,
    });

  } catch (err) {
    console.error('Scenario error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  GET /api/scenario/zones
// ============================================================
router.get('/zones', (req, res) => {
  res.json(ZONE_ACCELERATION);
});

// ============================================================
//  GET /api/scenario/preview?year=2025
// ============================================================
router.get('/preview', (req, res) => {
  try {
    const year = parseInt(req.query.year) || 2025;
    const portfolio = loadPortfolio();
    const contracts = portfolio.contracts.filter(c => c.year === year);

    const byZone = {};
    for (const c of contracts) {
      if (!byZone[c.zone]) byZone[c.zone] = { zone: c.zone, contracts: 0, capital: 0, prime: 0 };
      byZone[c.zone].contracts++;
      byZone[c.zone].capital += c.capital;
      byZone[c.zone].prime   += c.prime;
    }

    const totalCapital = contracts.reduce((s, c) => s + c.capital, 0);
    const result = Object.values(byZone).map(z => ({
      ...z,
      capital:    Math.round(z.capital),
      prime:      Math.round(z.prime),
      pctCapital: totalCapital > 0 ? parseFloat((z.capital / totalCapital * 100).toFixed(2)) : 0,
      color:      ZONE_ACCELERATION[z.zone]?.color || '#888',
      label:      ZONE_ACCELERATION[z.zone]?.label || z.zone,
    })).sort((a, b) => ZONE_ORDER[b.zone] - ZONE_ORDER[a.zone]);

    res.json({
      year,
      totalContracts: contracts.length,
      totalCapital:   Math.round(totalCapital),
      totalPrime:     Math.round(contracts.reduce((s,c) => s + c.prime, 0)),
      byZone:         result,
      dataQuality:    portfolio.dataQuality,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;