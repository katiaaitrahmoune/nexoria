# Nexoria — Seismic Insurance Risk Platform

A Node.js/Express backend for seismic risk assessment and insurance portfolio management in Algeria, built on the **RPA 99 / Version 2003** standard (Règles Parasismiques Algériennes).

---
# Base_url backend = https://nexoria-vq48.onrender.com
# Base_url Frontend = https://gam2026.netlify.app/LoginScreen
## user to login = admin@nexoria.com / admin123
## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database**: PostgreSQL via Neon (serverless, SSL required)
- **Auth**: JWT (access tokens via `jsonwebtoken`, passwords hashed with `bcryptjs`)
- **File I/O**: `xlsx` for Excel reading, `csv-parser` / `csv-writer` for CSV operations
- **Dev**: `nodemon` with `--env-file` for environment loading

---

## Project Structure

```
.
├── server.js                      # Entry point
├── .env                           # Environment variables (never commit)
├── .env.example
├── public/
│   ├── assurance.csv              # Reference insurance data
│   └── addassurance.csv           # User-submitted assets (append-only)
├── src/
│   ├── config/
│   │   └── db.js                  # PostgreSQL pool (Neon SSL)
│   ├── controllers/
│   │   ├── rpa_config.js          # RPA 99 constants & lookup tables
│   │   ├── portfolio_loader.js    # XLSX ingestion + in-memory cache
│   │   └── geomapcontroller.js    # GeoJSON danger zone DB queries
|   |   └── reiassurance.js        # give recomendation to the admin bazed on a provided capital informations
│   ├── models/
│   │   └── userModel.js           # findUserByEmail()
│   ├── routes/
│   │   ├── authRoutes.js          # POST /api/auth/login
│   │   ├── scenario.js            # POST /api/scenario/simulate
│   │   ├── portfolio.js           # GET  /api/portfolio/*
│   │   ├── assetRouter.js         # POST /api/assets/add, GET /api/assets/read
│   │   └── lacation.js            # GET  /api/locations/wilayas|communes
│   ├── services/
│   │   └── authService.js         # loginUser() — bcrypt + JWT
│   └── validators/
│       └── app.js                 # Express app setup, middleware, route mounting
└── tests/
```

---

## Environment Variables

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require&channel_binding=require
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

> **Important**: Run with `node --env-file=.env server.js` or `nodemon --env-file=.env server.js`. Do NOT use `dotenv` imports — the `--env-file` flag loads variables before any module resolves, avoiding ES module hoisting issues.

---

## Running

```bash
npm run dev      # nodemon --env-file=.env server.js
npm run start    # node  --env-file=.env server.js
```

---

## API Routes & Calculation Details

### Auth — `/api/auth`

#### `POST /api/auth/login`

Authenticates a user against the `users` table.

**Request body:**
```json
{ "email": "admin@example.com", "password": "plaintext" }
```

**Logic:**
1. Query `users` table for `email` → returns row or `null`.
2. `bcrypt.compare(password, user.password)` — rejects if hash doesn't match.
3. `jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '1d' })` — issues a signed token.

**Response:**
```json
{
  "message": "Login successful",
  "token": "<JWT>",
  "user": { "id": 1, "name": "Admin", "email": "...", "role": "admin" }
}
```

---

### Scenario Simulation — `/api/scenario`

#### `POST /api/scenario/simulate`

Runs a seismic loss scenario over the insurance portfolio for a given wilaya/commune, earthquake magnitude, and retention capacity.

**Request body:**
```json
{
  "magnitude": 7.0,
  "retentionCapacity": 5000000000,
  "year": 2025,
  "selectedWilaya": "ALGER",
  "selectedCommune": "HUSSEIN DEY",
  "selectedType": null
}
```

**Calculation pipeline:**

**Step 1 — Fetch danger zone from DB**
```sql
SELECT level FROM your_table_name
WHERE wilaya = $1 AND commune = $2 LIMIT 1
```
Returns the seismic zone code (e.g. `"III"`). Returns `404` if not found.

**Step 2 — Magnitude amplifier**
```
mag         = clamp(magnitude, 5.0, 8.5)
refMag      = 6.8   (Boumerdès Mw 6.8 reference earthquake)
amplifier   = 10^(0.5 × (mag − 6.8) × 0.6)
amplifier   = clamp(amplifier, 0.3, 2.5)
```
This exponential scaling means Mw 7.5 produces roughly 2× the loss of Mw 6.8.

**Step 3 — Filter contracts**
Portfolio contracts (loaded from XLSX) are filtered by `year`, `wilaya`, and optionally `type`. Only contracts whose `zone` matches the DB-fetched danger zone are considered affected.

**Step 4 — Per-contract loss**
```
baseLossRate  = ZONE_BASE_LOSS_RATE[zone]
              → "0":0.01  "I":0.08  "IIa":0.22  "IIb":0.38  "III":0.60

typeMultiplier = TYPE_VULNERABILITY[type]
              → Résidentiel:1.30  Commerciale:1.15  Industrielle:0.90

rawRate   = baseLossRate × typeMultiplier × amplifier
lossRate  = min(rawRate, 0.95)
lossAmount = contract.capital × lossRate
```

**Step 5 — Financial analysis**
```
retentionGap   = totalLoss − retentionCapacity
coverageRatio  = retentionCapacity / totalLoss

Risk level:
  ≥ 2.0  → LOW      (retention is more than double the loss)
  ≥ 1.0  → MODERATE (retention covers loss, low margin)
  ≥ 0.5  → HIGH     (retention insufficient, reserves needed)
  < 0.5  → CRITICAL (technical ruin risk)

portfolioImpact = totalLoss / totalPortfolioCapital
```

**Response structure:**
```json
{
  "meta": { "year", "location", "magnitude", "magnitudeAmplifier", "retentionCapacity" },
  "exposure": { "totalContracts", "affectedContracts", "concentrationRatio" },
  "losses": { "totalEstimatedLoss", "byZone": [...] },
  "financial": { "retentionGap", "coverageRatio", "portfolioImpact", "riskLevel", "riskMessage" }
}
```

#### `GET /api/scenario/zones`

Returns the full `ZONE_ACCELERATION` lookup table (label, color, acceleration coefficient A).

---

### Portfolio — `/api/portfolio`

Data is loaded once from `CATNAT_2023_2025.xlsx` and cached in memory. If the file is missing, synthetic sample data (2,300 contracts across 2023–2025) is generated automatically.

#### `GET /api/portfolio/summary`

Returns total contracts, capital, premiums, and breakdown by year.

#### `GET /api/portfolio/by-zone?year=2025`

Returns capital and premium aggregated by seismic zone for a given year, with zone colors and percentage of total capital.

#### `GET /api/portfolio/contracts?year&wilaya&type&zone`

Returns filtered contracts (max 100 rows for performance).

#### `GET /api/portfolio/wilayas`

Returns the list of distinct wilayas present in the portfolio.

---

### Asset Management — `/api/assets`

#### `POST /api/assets/add`

Adds a new insurance asset to `public/addassurance.csv`. Computes all derived fields including the RPA 99 Chapter 9 damage ratio.

**Request body (required fields):**
```json
{
  "NUMERO_POLICE": "160001",
  "DATE_EFFET": "2025-01-01",
  "DATE_EXPIRATION": "2026-01-01",
  "WILAYA": "ALGER",
  "COMMUNE": "BIRKHADEM",
  "sum_insured": 50000000,
  "longueur": 12,
  "largeur": 8
}
```

**Optional fields:** `type_batiment`, `nb_niveaux`, `hauteur`, `epaisseur_mur`, `distance_entre_murs`, `resistance_mortier`, `resistance_beton`, `age_construction`, `surface_plancher`, `aire_murs`, `prime_nette`, `building_class`.

**Computed fields & RPA 99 Chapter 9 damage ratio logic:**

```
zone_sismique  = RPA_ZONES[WILAYA]        (lookup from rpa_config.js)
age_batiment   = currentYear − age_construction
densite_murs   = aire_murs / surface_plancher   (or default 0.04)
ratio_ll       = longueur / largeur
ratio_hl       = hauteur  / largeur
taux_prime     = prime_nette / sum_insured
```

**damage_ratio** starts from a base value per zone, then violations of RPA 99 constraints add penalty increments:

| RPA 99 Rule | Violation Condition | Penalty |
|---|---|---|
| §9.1.3 — Max height | `hauteur > MAX_H[zone]` (III→11m, IIb→14m, I→17m) | +0.08 |
| §9.1.3 — Max floors | `nb_niveaux > MAX_N[zone]` (III→3, IIb→4, I→5) | +0.08 |
| §9.1.3 — Plan ratio | `longueur/largeur > 3.5` | +0.05 |
| §9.1.4 — Wall density | `densite_murs < 4%` of floor area | +0.07 |
| §9.3.2 — Wall thickness | `epaisseur_mur < 20 cm` | +0.05 |
| §9.2.2.3 — Mortar strength | `resistance_mortier < 5 MPa` | +0.06 |
| §9.2.2.5 — Concrete strength | `resistance_beton < 15 MPa` | +0.06 |
| §9.1.4 — Max wall spacing | `distance_entre_murs > MAX_DIST[zone]` (III→6m, IIb→8m, I→10m) | +0.05 |
| Building age | > 50 years | +0.10 |
| Building age | 30–50 years | +0.05 |
| Building age | 15–30 years | +0.02 |

Then a **type multiplier** is applied:
```
Industriel   × 0.90   (stricter construction norms)
Commercial   × 1.15
Résidentiel  × 1.30   (often non-compliant masonry)
```

```
damage_ratio   = min(ratio × typeMultiplier, 0.95)
expected_payout = sum_insured × damage_ratio
```

**Base damage ratios by zone:**
```
Zone 0:   1%
Zone I:   8%
Zone IIa: 14%
Zone IIb: 22%
Zone III: 30%
```

The row is **appended** to `public/addassurance.csv` (headers written only on first creation).

#### `GET /api/assets/read`

Returns the full content of `addassurance.csv` as parsed rows.

---

### Locations — `/api/locations`

Queries the `your_table_name` table (to be renamed to your actual table).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/locations/wilayas` | All distinct wilayas |
| GET | `/api/locations/communes` | All distinct communes |
| GET | `/api/locations/wilayas/:wilaya/communes` | Communes for a specific wilaya |

---

### GeoJSON Map — `/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/danger-zones` | Latest GeoJSON from `danger_zones` table |
| GET | `/api/danger-building` | All rows from `map` table |
| PUT | `/api/danger-zones/level` | Update danger level for a wilaya in the stored GeoJSON |
| GET | `/api/csv` | Download `assurance.csv` |

---
### rieasureur POST api/calculate
Computes reinsurance repartition based on a given insured capital and annual premium.
Takes a tauxCession (%) to split capital and premium between the company and the reinsurer, applies a fixed 22% return commission on the ceded premium, and returns the final financial breakdown for both parties.
## RPA 99 Zone Reference

| Zone | Acceleration A | Description |
|---|---|---|
| 0 | 0.00 | Negligible seismicity |
| I | 0.15 | Low seismicity |
| IIa | 0.25 | Moderate seismicity |
| IIb | 0.30 | High seismicity |
| III | 0.40 | Very high seismicity |

Key wilayas at Zone III: **Alger, Blida, Boumerdès, Tipaza, Mostaganem, Aïn Defla, Relizane**.

---
