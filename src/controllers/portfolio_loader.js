import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { RPA_ZONES, PRIME_TO_CAPITAL_RATE } from './rpa_config.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ────────────────────────────────────────────────

function cleanWilaya(raw) {
  if (!raw) return 'INCONNU';
  return String(raw)
    .replace(/^\d+\s*-\s*/, '')   // "16  - ALGER" → "ALGER"
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function cleanType(raw) {
  if (!raw || raw === 'NULL') return 'Résidentiel';
  const s = String(raw);
  if (s.includes('Industrielle') || s.includes('INDUSTRIELLE')) return 'Industrielle';
  if (s.includes('Commerciale') || s.includes('COMMERCIALE')) return 'Commerciale';
  return 'Résidentiel';
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : Math.abs(n);
}

function loadSheet(filePath, year) {
  try {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    return rows.map((row) => {
      // Support multiple column naming conventions
      const wilayaRaw = row['Wilaya'] || row['WILAYA'] || row['wilaya'] || '';
      const typeRaw   = row['TYPE'] || row['Type'] || row['type'] || '';
      const commune   = row['commune_du_risque'] || row['COMMUNE'] || row['Commune'] || '';

      // Capital: prefer CAPITAL_ASSURE if present and valid, else estimate from prime
      const capitalRaw = parseNumber(row['CAPITAL_ASSURE'] || row['VALEUR_ASSURÉE'] || row['Capital']);
      const primeRaw   = parseNumber(row['PRIME_NETTE'] || row['Prime'] || row['prime']);
      
      let capital = capitalRaw;
      let hasRealCapital = capitalRaw > 0;
      
      // If no real capital, estimate from premium
      if (!hasRealCapital && primeRaw > 0) {
        capital = primeRaw / PRIME_TO_CAPITAL_RATE;
      }

      const wilaya = cleanWilaya(wilayaRaw);
      const type   = cleanType(typeRaw);
      const zone   = RPA_ZONES[wilaya] || 'I';   // fallback Zone I if unknown

      return {
        police:   String(row['NUMERO_POLICE'] || row['PolNo'] || ''),
        year,
        wilaya,
        commune:  String(commune).replace(/^\d+\s*-\s*/, '').trim(),
        type,
        zone,
        prime:    primeRaw,
        capital,                          // DZD
        hasRealCapital,                   // flag: vrai capital ou estimé ?
      };
    }).filter(r => r.prime > 0 || r.capital > 0);
  } catch (e) {
    console.warn(`⚠️  Error loading ${filePath}: ${e.message}`);
    return [];
  }
}

// ─── Sample data generator for testing ────────────────────

function createSamplePortfolio() {
  const zones = ['0', 'I', 'IIa', 'IIb', 'III'];
  const wilayas = {
    'III': ['ALGER', 'BLIDA', 'BOUMERDES', 'TIPAZA'],
    'IIb': ['CHLEF', 'TIZI OUZOU', 'MEDEA'],
    'IIa': ['ORAN', 'CONSTANTINE', 'SETIF', 'ANNABA', 'BEJAIA'],
    'I': ['TLEMCEN', 'BATNA', 'BISKRA'],
    '0': ['ADRAR', 'BECHAR', 'OUARGLA']
  };
  const types = ['Résidentiel', 'Commerciale', 'Industrielle'];
  
  const allContracts = [];
  
  for (const year of [2023, 2024, 2025]) {
    // Different portfolio sizes per year
    const numContracts = year === 2023 ? 500 : (year === 2024 ? 800 : 1000);
    
    for (let i = 0; i < numContracts; i++) {
      // Select zone with realistic distribution
      let zone;
      const rand = Math.random();
      if (rand < 0.35) zone = 'III';
      else if (rand < 0.55) zone = 'IIb';
      else if (rand < 0.75) zone = 'IIa';
      else if (rand < 0.90) zone = 'I';
      else zone = '0';
      
      // Select wilaya from zone
      const wilayaList = wilayas[zone];
      const wilaya = wilayaList[Math.floor(Math.random() * wilayaList.length)];
      
      // Select type with weights
      let type;
      let typeRand = Math.random();
      if (typeRand < 0.65) type = 'Résidentiel';
      else if (typeRand < 0.85) type = 'Commerciale';
      else type = 'Industrielle';
      
      // Generate realistic capital
      let baseCapital;
      if (type === 'Résidentiel') baseCapital = 8_000_000;
      else if (type === 'Commerciale') baseCapital = 15_000_000;
      else baseCapital = 50_000_000;
      
      // Zone multiplier
      const zoneMultipliers = { 'III': 1.5, 'IIb': 1.3, 'IIa': 1.1, 'I': 0.9, '0': 0.7 };
      const multiplier = zoneMultipliers[zone];
      
      // Random variation
      const variation = 0.5 + Math.random();
      let capital = Math.round(baseCapital * multiplier * variation / 1000) * 1000;
      
      // 70% have real capital
      const hasRealCapital = Math.random() < 0.7;
      
      // Premium at 0.05% rate
      const prime = Math.round(capital * 0.0005);
      
      allContracts.push({
        police: `SAMPLE-${year}-${String(i).padStart(5, '0')}`,
        year,
        wilaya,
        commune: 'CENTRE',
        type,
        zone,
        prime,
        capital,
        hasRealCapital,
      });
    }
  }
  
  // Pre-aggregate
  const byZoneYear = {};
  const byWilaya = {};
  
  for (const c of allContracts) {
    const zyKey = `${c.zone}__${c.year}`;
    if (!byZoneYear[zyKey]) {
      byZoneYear[zyKey] = { zone: c.zone, year: c.year, contracts: 0, prime: 0, capital: 0 };
    }
    byZoneYear[zyKey].contracts++;
    byZoneYear[zyKey].prime += c.prime;
    byZoneYear[zyKey].capital += c.capital;
    
    const wKey = `${c.wilaya}__${c.year}`;
    if (!byWilaya[wKey]) {
      byWilaya[wKey] = { wilaya: c.wilaya, zone: c.zone, year: c.year, contracts: 0, prime: 0, capital: 0 };
    }
    byWilaya[wKey].contracts++;
    byWilaya[wKey].prime += c.prime;
    byWilaya[wKey].capital += c.capital;
  }
  
  console.log(`✅ Created SAMPLE portfolio: ${allContracts.length} total contracts`);
  
  return {
    contracts: allContracts,
    byZoneYear: Object.values(byZoneYear),
    byWilaya: Object.values(byWilaya),
    byTypeZone: [],
    totalContracts: allContracts.length,
    totalCapital: allContracts.reduce((s, c) => s + c.capital, 0),
    totalPrime: allContracts.reduce((s, c) => s + c.prime, 0),
    dataQuality: {
      withRealCapital: allContracts.filter(c => c.hasRealCapital).length,
      estimated: allContracts.filter(c => !c.hasRealCapital).length,
    }
  };
}

// ─── Main loader ────────────────────────────────────────────

let _portfolio = null;

export function loadPortfolio() {
  if (_portfolio) return _portfolio;

  // Adjust path to where your Excel files are
  const dataDir = path.join(__dirname, '../../data');
  const files = [
    { path: path.join(dataDir, 'catnat_2023.xlsx'), year: 2023 },
    { path: path.join(dataDir, 'Catnat_2024.xlsx'), year: 2024 },
    { path: path.join(dataDir, 'catnat_2025.xlsx'), year: 2025 },
  ];

  const allContracts = [];

  for (const f of files) {
    const rows = loadSheet(f.path, f.year);
    if (rows.length > 0) {
      allContracts.push(...rows);
      console.log(`✅ Loaded ${rows.length} contracts from ${f.year}`);
    }
  }

  // If no data loaded, create sample data for testing
  if (allContracts.length === 0) {
    console.warn('⚠️  No Excel files found. Creating sample data for testing...');
    _portfolio = createSamplePortfolio();
    return _portfolio;
  }

  // ─── Pre-aggregate for fast API responses ───

  // By zone × year
  const byZoneYear = {};
  // By wilaya (all years)
  const byWilaya = {};
  // By type × zone
  const byTypeZone = {};

  for (const c of allContracts) {
    // Zone × Year
    const zyKey = `${c.zone}__${c.year}`;
    if (!byZoneYear[zyKey]) {
      byZoneYear[zyKey] = { zone: c.zone, year: c.year, contracts: 0, prime: 0, capital: 0 };
    }
    byZoneYear[zyKey].contracts++;
    byZoneYear[zyKey].prime += c.prime;
    byZoneYear[zyKey].capital += c.capital;

    // Wilaya (keyed by wilaya+year)
    const wKey = `${c.wilaya}__${c.year}`;
    if (!byWilaya[wKey]) {
      byWilaya[wKey] = { wilaya: c.wilaya, zone: c.zone, year: c.year, contracts: 0, prime: 0, capital: 0 };
    }
    byWilaya[wKey].contracts++;
    byWilaya[wKey].prime += c.prime;
    byWilaya[wKey].capital += c.capital;

    // Type × Zone
    const tzKey = `${c.type}__${c.zone}`;
    if (!byTypeZone[tzKey]) {
      byTypeZone[tzKey] = { type: c.type, zone: c.zone, contracts: 0, prime: 0, capital: 0 };
    }
    byTypeZone[tzKey].contracts++;
    byTypeZone[tzKey].prime += c.prime;
    byTypeZone[tzKey].capital += c.capital;
  }

  _portfolio = {
    contracts: allContracts,
    byZoneYear: Object.values(byZoneYear),
    byWilaya: Object.values(byWilaya),
    byTypeZone: Object.values(byTypeZone),
    totalContracts: allContracts.length,
    totalCapital: allContracts.reduce((s, c) => s + c.capital, 0),
    totalPrime: allContracts.reduce((s, c) => s + c.prime, 0),
    dataQuality: {
      withRealCapital: allContracts.filter(c => c.hasRealCapital).length,
      estimated: allContracts.filter(c => !c.hasRealCapital).length,
    }
  };

  return _portfolio;
}