import express from 'express';
import { loadPortfolio } from '../controllers/portfolio_loader.js';
import { ZONE_ACCELERATION, ZONE_ORDER } from '../controllers/rpa_config.js';

const router = express.Router();

// GET /api/portfolio/summary
router.get('/summary', (req, res) => {
  try {
    const p = loadPortfolio();
    res.json({
      totalContracts: p.totalContracts,
      totalCapital:   Math.round(p.totalCapital),
      totalPrime:     Math.round(p.totalPrime),
      dataQuality:    p.dataQuality,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/by-zone?year=2025
router.get('/by-zone', (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const p = loadPortfolio();
    let data = p.byZoneYear;
    if (year) data = data.filter(d => d.year === year);

    const totalCapital = data.reduce((s, d) => s + d.capital, 0);
    const result = data.map(d => ({
      ...d,
      capital:    Math.round(d.capital),
      prime:      Math.round(d.prime),
      pctCapital: totalCapital > 0 ? parseFloat((d.capital / totalCapital * 100).toFixed(2)) : 0,
      color:      ZONE_ACCELERATION[d.zone]?.color || '#888',
      label:      ZONE_ACCELERATION[d.zone]?.label || d.zone,
    })).sort((a, b) => ZONE_ORDER[b.zone] - ZONE_ORDER[a.zone]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/by-wilaya?year=2025
router.get('/by-wilaya', (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const p = loadPortfolio();
    let data = p.byWilaya;
    if (year) data = data.filter(d => d.year === year);

    const result = data.map(d => ({
      ...d,
      capital: Math.round(d.capital),
      prime:   Math.round(d.prime),
      color:   ZONE_ACCELERATION[d.zone]?.color || '#888',
    })).sort((a, b) => b.capital - a.capital);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/trends
router.get('/trends', (req, res) => {
  try {
    const p = loadPortfolio();
    const zones = ['0', 'I', 'IIa', 'IIb', 'III'];
    const years = [2023, 2024, 2025];

    const trends = zones.map(zone => {
      const series = years.map(year => {
        const entry = p.byZoneYear.find(d => d.zone === zone && d.year === year);
        return {
          year,
          contracts: entry?.contracts || 0,
          capital:   Math.round(entry?.capital || 0),
          prime:     Math.round(entry?.prime || 0),
        };
      });
      return {
        zone,
        label: ZONE_ACCELERATION[zone]?.label || zone,
        color: ZONE_ACCELERATION[zone]?.color || '#888',
        series,
      };
    });

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;