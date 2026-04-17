"""
Seismic Insurance Risk API  —  RPA99 / XGBoost
================================================
Run:  uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

# ─────────────────────────────────────────────────────────────────────────────
# Load model
# ─────────────────────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "risk_assessment.pkl"
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

FEATURES = [
    "zone_ord", "nb_niveaux", "hauteur", "ratio_longlarg", "ratio_hauteur_larg",
    "densite_murs", "distance_entre_murs", "epaisseur_mur", "resistance_mortier",
    "resistance_beton", "age_batiment", "rpa_conforme", "rpa_nb_violations",
    "viol_hauteur", "viol_etages", "viol_ratio_plan", "viol_densite_murs",
    "viol_epaisseur", "viol_mortier", "viol_beton", "viol_dist_murs", "tax_rate",
]

ZONE_ORD  = {"0": 0, "I": 1, "IIa": 2, "IIb": 3, "III": 4}
LOADING_FACTOR = 1.25

TAX_MATRIX = {
    ("1A","0"):0.05, ("1A","I"):0.15, ("1A","IIa"):0.25, ("1A","IIb"):0.30, ("1A","III"):0.40,
    ("1B","0"):0.06, ("1B","I"):0.12, ("1B","IIa"):0.20, ("1B","IIb"):0.25, ("1B","III"):0.30,
    ("2A","0"):0.04, ("2A","I"):0.10, ("2A","IIa"):0.15, ("2A","IIb"):0.20, ("2A","III"):0.25,
    ("2B","0"):0.05, ("2B","I"):0.08, ("2B","IIa"):0.12, ("2B","IIb"):0.17, ("2B","III"):0.22,
    ("3A","0"):0.03, ("3A","I"):0.07, ("3A","IIa"):0.10, ("3A","IIb"):0.14, ("3A","III"):0.18,
    ("3B","0"):0.04, ("3B","I"):0.06, ("3B","IIa"):0.09, ("3B","IIb"):0.12, ("3B","III"):0.16,
}

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────
class PolicyInput(BaseModel):
    """One insured building — mirrors the input column list."""

    # Identity
    NUMERO_POLICE:      int
    wilaya_id:          Optional[int]   = None
    WILAYA:             Optional[str]   = None
    COMMUNE:            Optional[str]   = None
    type_batiment:      Optional[str]   = None

    # Zone & class
    zone_sismique:      str   = Field(..., pattern="^(0|I|IIa|IIb|III)$",
                                      description="RPA99 zone: 0, I, IIa, IIb, III")
    building_class:     str   = Field(..., pattern="^[123][AB]$",
                                      description="Building class: 1A,1B,2A,2B,3A,3B")

    # Insurance
    sum_insured:        float = Field(..., gt=0)
    prime_nette:        Optional[float] = None

    # Geometry (required — used for feature derivation)
    nb_niveaux:         int   = Field(..., ge=1, le=10)
    hauteur:            float = Field(..., gt=0)
    longueur:           float = Field(..., gt=0)
    largeur:            float = Field(..., gt=0)
    surface_plancher:   float = Field(..., gt=0)
    aire_murs:          float = Field(..., gt=0)
    epaisseur_mur:      float = Field(..., gt=0)
    distance_entre_murs: float = Field(..., gt=0)

    # Materials
    resistance_mortier: float = Field(..., gt=0)
    resistance_beton:   float = Field(..., gt=0)

    # Age
    age_construction:   int   = Field(..., ge=1900, le=2025)

    # Pre-computed RPA flags (optional — will be recomputed if missing)
    rpa_conforme:           Optional[int] = None
    rpa_nb_violations:      Optional[int] = None
    viol_hauteur:           Optional[int] = None
    viol_etages:            Optional[int] = None
    viol_ratio_plan:        Optional[int] = None
    viol_densite_murs:      Optional[int] = None
    viol_epaisseur:         Optional[int] = None
    viol_mortier:           Optional[int] = None
    viol_beton:             Optional[int] = None
    viol_dist_murs:         Optional[int] = None

    # Optional pre-computed fields (ignored — recomputed server-side)
    zone_ord:               Optional[int]   = None
    tax_rate:               Optional[float] = None
    taux_prime_brut:        Optional[float] = None
    DATE_EFFET:             Optional[str]   = None
    DATE_EXPIRATION:        Optional[str]   = None
    duree_police_jours:     Optional[int]   = None
    densite_murs:           Optional[float] = None
    ratio_longlarg:         Optional[float] = None
    ratio_hauteur_larg:     Optional[float] = None
    age_batiment:           Optional[int]   = None
    annee_construction:     Optional[int]   = None
    damage_ratio:           Optional[float] = None
    expected_payout:        Optional[float] = None


class PolicyOutput(BaseModel):
    NUMERO_POLICE:            int
    predicted_damage_ratio:   float
    tax_rate:                 float
    suggested_premium:        float
    flag_review:              str   # "green" | "orange" | "red"
    # Extra context
    predicted_payout:         float
    delta_vs_tax:             float
    zone_sismique:            str
    building_class:           str


class BatchInput(BaseModel):
    policies: list[PolicyInput]


class BatchOutput(BaseModel):
    results: list[PolicyOutput]
    total:   int


# ─────────────────────────────────────────────────────────────────────────────
# RPA checker  (exact copy from notebook)
# ─────────────────────────────────────────────────────────────────────────────
def verifier_vulnerabilite_maconnerie(d: dict) -> dict:
    res = {"conforme": True, "alertes": []}
    limites = {"I":{"h_max":17,"n":5},"IIa":{"h_max":14,"n":4},"IIb":{"h_max":14,"n":4},"III":{"h_max":11,"n":3}}
    z = d["zone_sismique"]
    if z in limites:
        if d["hauteur"]    > limites[z]["h_max"]: res["conforme"]=False; res["alertes"].append("Hauteur excessive")
        if d["nb_niveaux"] > limites[z]["n"]:     res["conforme"]=False; res["alertes"].append("Étages excessif")
    if d["longueur"]/d["largeur"] > 3.5:          res["conforme"]=False; res["alertes"].append("Rapport longueur/largeur > 3.5")
    if d["aire_murs"]/d["surface_plancher"] < 0.04: res["conforme"]=False; res["alertes"].append("Densité murs insuffisante")
    if d["epaisseur_mur"] < 20:                   res["conforme"]=False; res["alertes"].append("Épaisseur mur insuffisante")
    if d["resistance_mortier"] < 5:               res["conforme"]=False; res["alertes"].append("Résistance mortier < 5 MPa")
    if d["resistance_beton"]   < 15:              res["conforme"]=False; res["alertes"].append("Résistance béton < 15 MPa")
    dist_max = {"I":10,"IIa":8,"IIb":8,"III":6}
    if z in dist_max and d["distance_entre_murs"] > dist_max[z]:
        res["conforme"]=False; res["alertes"].append("Distance entre murs excessive")
    return res


# ─────────────────────────────────────────────────────────────────────────────
# Core prediction logic
# ─────────────────────────────────────────────────────────────────────────────
def predict_single(p: PolicyInput) -> PolicyOutput:
    d = p.model_dump()

    # ── Derived features ──────────────────────────────────────────────────────
    d["age_batiment"]       = 2025 - d["age_construction"]
    d["ratio_longlarg"]     = d["longueur"] / d["largeur"]
    d["densite_murs"]       = d["aire_murs"] / d["surface_plancher"]
    d["ratio_hauteur_larg"] = d["hauteur"] / d["largeur"]
    d["zone_ord"]           = ZONE_ORD.get(d["zone_sismique"], 1)

    # ── Tax rate ──────────────────────────────────────────────────────────────
    d["tax_rate"] = TAX_MATRIX.get((d["building_class"], d["zone_sismique"]), 0.15)

    # ── RPA flags (recompute if any are missing) ──────────────────────────────
    rpa_keys = ["rpa_conforme","rpa_nb_violations","viol_hauteur","viol_etages",
                "viol_ratio_plan","viol_densite_murs","viol_epaisseur",
                "viol_mortier","viol_beton","viol_dist_murs"]

    if any(d.get(k) is None for k in rpa_keys):
        rpa = verifier_vulnerabilite_maconnerie(d)
        alerts = rpa["alertes"]
        d["rpa_conforme"]       = int(rpa["conforme"])
        d["rpa_nb_violations"]  = len(alerts)
        d["viol_hauteur"]       = int(any("Hauteur"    in a for a in alerts))
        d["viol_etages"]        = int(any("Étages"     in a for a in alerts))
        d["viol_ratio_plan"]    = int(any("longueur"   in a for a in alerts))
        d["viol_densite_murs"]  = int(any("Densité"    in a for a in alerts))
        d["viol_epaisseur"]     = int(any("Épaisseur"  in a for a in alerts))
        d["viol_mortier"]       = int(any("mortier"    in a for a in alerts))
        d["viol_beton"]         = int(any("béton"      in a for a in alerts))
        d["viol_dist_murs"]     = int(any("Distance"   in a for a in alerts))

    # ── Predict ───────────────────────────────────────────────────────────────
    X = pd.DataFrame([{f: d[f] for f in FEATURES}])
    predicted_dr = float(np.clip(model.predict(X)[0], 0, 1))

    # ── Premium & flag ────────────────────────────────────────────────────────
    predicted_payout   = predicted_dr * d["sum_insured"]
    suggested_premium  = predicted_payout * LOADING_FACTOR
    delta              = predicted_dr - d["tax_rate"]

    if   abs(delta) > 0.20: flag = "red"
    elif abs(delta) > 0.15: flag = "orange"
    else:                   flag = "green"

    return PolicyOutput(
        NUMERO_POLICE           = p.NUMERO_POLICE,
        predicted_damage_ratio  = round(predicted_dr, 4),
        tax_rate                = round(d["tax_rate"], 4),
        suggested_premium       = round(suggested_premium, 2),
        flag_review             = flag,
        predicted_payout        = round(predicted_payout, 2),
        delta_vs_tax            = round(delta, 4),
        zone_sismique           = d["zone_sismique"],
        building_class          = d["building_class"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Seismic Insurance Risk API",
    description="XGBoost damage ratio prediction based on RPA99 structural compliance",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "model": "XGBoost RPA99 v1.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "features": len(FEATURES)}


@app.post("/predict", response_model=PolicyOutput, tags=["Prediction"])
def predict(policy: PolicyInput):
    """
    Score a **single** insurance policy.

    Returns predicted damage ratio, suggested premium, and review flag.
    """
    try:
        return predict_single(policy)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/predict/batch", response_model=BatchOutput, tags=["Prediction"])
def predict_batch(payload: BatchInput):
    """
    Score a **batch** of policies in one call.

    Accepts a list of policies and returns results for each.
    """
    results = []
    for policy in payload.policies:
        try:
            results.append(predict_single(policy))
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Error on NUMERO_POLICE={policy.NUMERO_POLICE}: {e}"
            )
    return BatchOutput(results=results, total=len(results))


@app.get("/features", tags=["Info"])
def get_features():
    """List all features used by the model."""
    return {"features": FEATURES, "count": len(FEATURES)}


@app.get("/tax-matrix", tags=["Info"])
def get_tax_matrix():
    """Return the current tax matrix (building_class × zone → rate)."""
    return {f"{k[0]}_{k[1]}": v for k, v in TAX_MATRIX.items()}
