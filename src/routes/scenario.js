import express from 'express';
import pkg from 'pg';
import { loadPortfolio } from '../controllers/portfolio_loader.js';
import {
  ZONE_ACCELERATION,
  ZONE_BASE_LOSS_RATE,
  TYPE_VULNERABILITY,
  ZONE_ORDER,
} from '../controllers/rpa_config.js';
import pool from '../config/db.js';

const router = express.Router();
async function getDangerZoneFromDB(wilaya, commune) {
  try {
    const query = `
      SELECT level 
      FROM your_table_name 
      WHERE wilaya = $1 AND commune = $2 
      LIMIT 1
    `;
    const result = await pool.query(query, [wilaya, commune]);
    
    if (result.rows.length > 0) {
      return result.rows[0].level;
    }
    return null;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

function formatDZD(n) {
  return Math.round(n).toLocaleString('fr-DZ');
}

router.post('/simulate', async (req, res) => {
  try {
    const {
      magnitude = 7.0,
      retentionCapacity = 5_000_000_000,
      year = 2025,
      selectedWilaya = null,
      selectedCommune = null,  
      selectedType = null,
    } = req.body;

    let zones = [];
    let zoneSource = 'user_input';
    if (selectedWilaya && selectedCommune && selectedWilaya !== 'TOUS' && selectedCommune !== 'TOUS') {
      const dbZone = await getDangerZoneFromDB(selectedWilaya, selectedCommune);
      
      if (!dbZone) {
        return res.status(404).json({ 
          error: `Aucune zone de danger trouvée pour ${selectedWilaya} - ${selectedCommune}` 
        });
      }
      
      zones = [dbZone];
      zoneSource = 'database';
    } else {
      
      return res.status(400).json({ 
        error: 'Veuillez fournir une wilaya et une commune pour déterminer la zone de danger' 
      });
    }
    
    const mag = Math.min(Math.max(parseFloat(magnitude), 5.0), 8.5);
    const refMagnitude = 6.8;
    const magnitudeAmplifier = Math.pow(10, 0.5 * (mag - refMagnitude) * 0.6);
    const clampedAmplifier = Math.min(Math.max(magnitudeAmplifier, 0.3), 2.5);

    const portfolio = loadPortfolio();
    let contracts = portfolio.contracts.filter(c => c.year === year);
    
  
    if (selectedWilaya && selectedWilaya !== 'TOUS') {
      contracts = contracts.filter(c => c.wilaya === selectedWilaya);
    }
    if (selectedType && selectedType !== 'TOUS') {
      contracts = contracts.filter(c => c.type === selectedType);
    }

    if (contracts.length === 0) {
      return res.status(404).json({ error: `Aucun contrat pour les critères sélectionnés` });
    }

    const affectedContracts = [];
    const unaffectedContracts = [];

    for (const c of contracts) {
      if (!zones.includes(c.zone)) {
        unaffectedContracts.push(c);
        continue;
      }

      const baseLossRate = ZONE_BASE_LOSS_RATE[c.zone] || 0.10;
      const typeMultiplier = TYPE_VULNERABILITY[c.type] || 1.0;
      const rawRate = baseLossRate * typeMultiplier * clampedAmplifier;
      const lossRate = Math.min(rawRate, 0.95);
      const lossAmount = c.capital * lossRate;

      affectedContracts.push({
        ...c,
        lossRate: parseFloat(lossRate.toFixed(4)),
        lossAmount: Math.round(lossAmount),
      });
    }

    const totalAffectedCapital = affectedContracts.reduce((s, c) => s + c.capital, 0);
    const totalLoss = affectedContracts.reduce((s, c) => s + c.lossAmount, 0);
    const totalPortfolioCapital = contracts.reduce((s, c) => s + c.capital, 0);

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
      byZone[c.zone].estimatedLoss += c.lossAmount;
    }
    
    for (const z of Object.values(byZone)) {
      z.avgLossRate = z.capitalExposed > 0
        ? parseFloat((z.estimatedLoss / z.capitalExposed).toFixed(4))
        : 0;
      z.capitalExposed = Math.round(z.capitalExposed);
      z.estimatedLoss = Math.round(z.estimatedLoss);
    }

    const retentionGap = totalLoss - retentionCapacity;
    const coverageRatio = retentionCapacity / Math.max(totalLoss, 1);
    const portfolioImpact = totalPortfolioCapital > 0 ? totalLoss / totalPortfolioCapital : 0;

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

    res.json({
      meta: {
        year,
        location: {
          wilaya: selectedWilaya,
          commune: selectedCommune,
          dangerZone: zones[0]  
        },
        magnitude: mag,
        magnitudeAmplifier: parseFloat(clampedAmplifier.toFixed(3)),
        retentionCapacity,
        filters: { 
          wilaya: selectedWilaya || 'TOUS', 
          commune: selectedCommune || 'TOUS',
          type: selectedType || 'TOUS' 
        },
        generatedAt: new Date().toISOString(),
      },
      exposure: {
        totalContracts: contracts.length,
        affectedContracts: affectedContracts.length,
        unaffectedContracts: unaffectedContracts.length,
        totalPortfolioCapital: Math.round(totalPortfolioCapital),
        totalAffectedCapital: Math.round(totalAffectedCapital),
        concentrationRatio: parseFloat((totalAffectedCapital / Math.max(totalPortfolioCapital, 1)).toFixed(4)),
      },
      losses: {
        totalEstimatedLoss: Math.round(totalLoss),
        byZone: Object.values(byZone).sort((a, b) => ZONE_ORDER[b.zone] - ZONE_ORDER[a.zone]),
      },
      financial: {
        retentionCapacity,
        retentionGap: Math.round(retentionGap),
        coverageRatio: parseFloat(coverageRatio.toFixed(3)),
        portfolioImpact: parseFloat(portfolioImpact.toFixed(4)),
        riskLevel,
        riskMessage,
      },
    });
  } catch (err) {
    console.error('Scenario error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/zones', (req, res) => {
  res.json(ZONE_ACCELERATION);
});

export default router;