import express from 'express';
import { loadPortfolio } from '../controllers/portfolio_loader.js';
import { ZONE_ACCELERATION, ZONE_ORDER } from '../controllers/rpa_config.js';

const router = express.Router();
router.get('/summary', (req, res) => {
  try {
    const p = loadPortfolio();
    res.json({
      totalContracts: p.totalContracts,
      totalCapital: Math.round(p.totalCapital),
      totalPrime: Math.round(p.totalPrime),
      byYear: p.byYear,
      dataQuality: p.dataQuality,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-zone', (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const p = loadPortfolio();
    let data = p.byZoneYear;
    if (year) data = data.filter(d => d.year === year);

    const totalCapital = data.reduce((s, d) => s + d.capital, 0);
    const result = data.map(d => ({
      ...d,
      capital: Math.round(d.capital),
      prime: Math.round(d.prime),
      pctCapital: totalCapital > 0 ? parseFloat((d.capital / totalCapital * 100).toFixed(2)) : 0,
      color: ZONE_ACCELERATION[d.zone]?.color || '#888',
      label: ZONE_ACCELERATION[d.zone]?.label || d.zone,
    })).sort((a, b) => ZONE_ORDER[b.zone] - ZONE_ORDER[a.zone]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/contracts', (req, res) => {
  try {
    const { year, wilaya, type, zone } = req.query;
    const p = loadPortfolio();
    
    let contracts = p.contracts;
    
    if (year) contracts = contracts.filter(c => c.year === parseInt(year));
    if (wilaya) contracts = contracts.filter(c => c.wilaya === wilaya.toUpperCase());
    if (type) contracts = contracts.filter(c => c.type === type);
    if (zone) contracts = contracts.filter(c => c.zone === zone);
    
    res.json({
      count: contracts.length,
      contracts: contracts.slice(0, 100), 
      totalCapital: Math.round(contracts.reduce((s, c) => s + c.capital, 0)),
      totalPrime: Math.round(contracts.reduce((s, c) => s + c.prime, 0)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wilayas', (req, res) => {
  try {
    const p = loadPortfolio();
    const wilayas = [...new Set(p.contracts.map(c => c.wilaya))].sort();
    res.json(wilayas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;