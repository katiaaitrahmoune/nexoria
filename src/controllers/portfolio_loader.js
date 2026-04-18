import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { RPA_ZONES, PRIME_TO_CAPITAL_RATE } from './rpa_config.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function cleanWilaya(raw) {
  if (!raw) return 'INCONNU';
  return String(raw)
    .replace(/^\d+\s*-\s*/, '') 
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
      const wilayaRaw = row['Wilaya'] || row['WILAYA'] || row['wilaya'] || '';
      const typeRaw   = row['TYPE'] || row['Type'] || row['type'] || '';
      const commune   = row['commune_du_risque'] || row['COMMUNE'] || row['Commune'] || '';

      const capitalRaw = parseNumber(row['CAPITAL_ASSURE'] || row['VALEUR_ASSURÉE'] || row['Capital']);
      const primeRaw   = parseNumber(row['PRIME_NETTE'] || row['Prime'] || row['prime']);
      
      let capital = capitalRaw;
      let hasRealCapital = capitalRaw > 0;
    
      if (!hasRealCapital && primeRaw > 0) {
        capital = primeRaw / PRIME_TO_CAPITAL_RATE;
      }

      const wilaya = cleanWilaya(wilayaRaw);
      const type   = cleanType(typeRaw);
      const zone   = RPA_ZONES[wilaya] || 'I';  

      return {
        police:   String(row['NUMERO_POLICE'] || row['PolNo'] || ''),
        year,
        wilaya,
        commune:  String(commune).replace(/^\d+\s*-\s*/, '').trim(),
        type,
        zone,
        prime:    primeRaw,
        capital,                        
        hasRealCapital,                   
      };
    }).filter(r => r.prime > 0 || r.capital > 0);
  } catch (e) {
    console.warn(`⚠️  Error loading ${filePath}: ${e.message}`);
    return [];
  }
}


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
    const numContracts = year === 2023 ? 500 : (year === 2024 ? 800 : 1000);
    
    for (let i = 0; i < numContracts; i++) {
      let zone;
      const rand = Math.random();
      if (rand < 0.35) zone = 'III';
      else if (rand < 0.55) zone = 'IIb';
      else if (rand < 0.75) zone = 'IIa';
      else if (rand < 0.90) zone = 'I';
      else zone = '0';
      
      const wilayaList = wilayas[zone];
      const wilaya = wilayaList[Math.floor(Math.random() * wilayaList.length)];
      
      let type;
      let typeRand = Math.random();
      if (typeRand < 0.65) type = 'Résidentiel';
      else if (typeRand < 0.85) type = 'Commerciale';
      else type = 'Industrielle';

      let baseCapital;
      if (type === 'Résidentiel') baseCapital = 8_000_000;
      else if (type === 'Commerciale') baseCapital = 15_000_000;
      else baseCapital = 50_000_000;
      const zoneMultipliers = { 'III': 1.5, 'IIb': 1.3, 'IIa': 1.1, 'I': 0.9, '0': 0.7 };
      const multiplier = zoneMultipliers[zone];

      const variation = 0.5 + Math.random();
      let capital = Math.round(baseCapital * multiplier * variation / 1000) * 1000;

      const hasRealCapital = Math.random() < 0.7;

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
  
  console.log(`Created SAMPLE portfolio: ${allContracts.length} total contracts`);
  
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


let _portfolio = null;

export function loadPortfolio() {
  if (_portfolio) return _portfolio;
  const dataDir = path.join(__dirname, '../../data');
  const files = [
    { path: path.join(dataDir, 'CATNAT_2023_2025.xlsx'), year: 2023 },
  ];

  const allContracts = [];

  for (const f of files) {
    const rows = loadSheet(f.path, f.year);
    if (rows.length > 0) {
      allContracts.push(...rows);
      console.log(` Loaded ${rows.length} contracts from ${f.year}`);
    }
  }
  if (allContracts.length === 0) {
    console.warn(' No Excel files found. Creating sample data for testing...');
    _portfolio = createSamplePortfolio();
    return _portfolio;
  }

  const byZoneYear = {};

  const byWilaya = {};
  const byTypeZone = {};

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