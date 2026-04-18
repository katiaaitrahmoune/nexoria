export const RPA_ZONES = {
  "ADRAR": "0", "CHLEF": "IIb", "LAGHOUAT": "I", "OUM EL BOUAGHI": "I",
  "BATNA": "I", "BEJAIA": "IIa", "BISKRA": "I", "BECHAR": "0",
  "BLIDA": "III", "BOUIRA": "IIa", "TAMENRASSET": "0", "TEBESSA": "I",
  "TLEMCEN": "I", "TIARET": "I", "TIZI OUZOU": "IIb", "ALGER": "III",
  "DJELFA": "I", "JIJEL": "IIa", "SETIF": "IIa", "SAIDA": "I",
  "SKIKDA": "IIa", "SIDI BEL ABBES": "I", "ANNABA": "IIa", "GUELMA": "IIa",
  "CONSTANTINE": "IIa", "MEDEA": "IIb", "MOSTAGANEM": "III", "M'SILA": "IIa",
  "MASCARA": "IIa", "OUARGLA": "0", "ORAN": "IIa", "EL BAYADH": "I",
  "ILLIZI": "0", "B.B ARRERIDJ": "IIa", "BOUMERDES": "III", "EL TARF": "IIa",
  "TINDOUF": "0", "TISSEMSILT": "IIa", "EL OUED": "0", "KHENCHELA": "I",
  "SOUK AHRAS": "I", "TIPAZA": "III", "MILA": "IIa", "AIN DEFLA": "III",
  "NAAMA": "I", "AIN TEMOUCHENT": "IIa", "GHARDAIA": "0", "RELIZANE": "III",
};

export const ZONE_ACCELERATION = {
  "0":   { label: "Zone 0 — Négligeable",    color: "#22c55e", A: 0.00 },
  "I":   { label: "Zone I — Faible",          color: "#84cc16", A: 0.15 },
  "IIa": { label: "Zone IIa — Modéré",        color: "#eab308", A: 0.25 },
  "IIb": { label: "Zone IIb — Élevé",         color: "#f97316", A: 0.30 },
  "III": { label: "Zone III — Très élevé",    color: "#ef4444", A: 0.40 },
};

export const ZONE_BASE_LOSS_RATE = {
  "0":   0.01,   
  "I":   0.08,   
  "IIa": 0.22,   
  "IIb": 0.38,   
  "III": 0.60,   
};

export const TYPE_VULNERABILITY = {
  "Résidentiel":   1.30,  
  "Commerciale":   1.15,  
  "Industrielle":  0.90,   
};


export const PRIME_TO_CAPITAL_RATE = 0.0005;

export const ZONE_ORDER = { "0": 0, "I": 1, "IIa": 2, "IIb": 3, "III": 4 };