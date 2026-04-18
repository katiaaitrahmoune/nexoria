"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const ZONE_MAP = {
  ALGER: "III", BOUMERDES: "III", BLIDA: "III", TIPAZA: "III",
  ORAN: "IIa", SETIF: "IIa", ANNABA: "IIa", "B.B ARRERIDJ": "IIa",
  BEJAIA: "IIa", "TIZI OUZOU": "IIa", BOUIRA: "IIa", SKIKDA: "IIa",
  MILA: "IIa", CONSTANTINE: "IIa",
  TIARET: "I", MSILA: "I", DJELFA: "I",
  TAMANRASSET: "0", ADRAR: "0", ILLIZI: "0",
};

// Mock assets for when API fails
const MOCK_ASSETS = [
  {
    NUMERO_POLICE: "POL-001",
    DATE_EFFET: "2024-01-01",
    DATE_EXPIRATION: "2024-12-31",
    WILAYA: "ALGER",
    COMMUNE: "BAB EZZOUAR",
    type_batiment: "Commercial",
    building_class: "3A",
    sum_insured: "5000000",
    prime_nette: "25000",
    damage_ratio: "0.35",
    tax_rate: "0.12",
    expected_payout: "1750000",
    zone_sismique: "III",
    rpa_conforme: "0",
    rpa_nb_violations: "3"
  },
  {
    NUMERO_POLICE: "POL-002",
    DATE_EFFET: "2024-02-01",
    DATE_EXPIRATION: "2025-01-31",
    WILAYA: "ORAN",
    COMMUNE: "ES-SENIA",
    type_batiment: "Industriel",
    building_class: "2A",
    sum_insured: "8000000",
    prime_nette: "32000",
    damage_ratio: "0.25",
    tax_rate: "0.10",
    expected_payout: "2000000",
    zone_sismique: "IIa",
    rpa_conforme: "1",
    rpa_nb_violations: "2"
  },
  {
    NUMERO_POLICE: "POL-003",
    DATE_EFFET: "2024-03-01",
    DATE_EXPIRATION: "2025-02-28",
    WILAYA: "CONSTANTINE",
    COMMUNE: "EL KHROUB",
    type_batiment: "Résidentiel",
    building_class: "3B",
    sum_insured: "2000000",
    prime_nette: "12000",
    damage_ratio: "0.30",
    tax_rate: "0.10",
    expected_payout: "600000",
    zone_sismique: "IIa",
    rpa_conforme: "0",
    rpa_nb_violations: "3"
  }
];

const DEFAULT_FORM = {
  NUMERO_POLICE: "",
  client_name: "",
  WILAYA: "",
  COMMUNE: "",
  type_batiment: "Industriel",
  building_class: "3A",
  sum_insured: "",
  prime_nette: "",
  nb_niveaux: "1",
  hauteur: "3",
  longueur: "",
  largeur: "",
  surface_plancher: "",
  aire_murs: "",
  epaisseur_mur: "20",
  distance_entre_murs: "6",
  resistance_mortier: "5",
  resistance_beton: "15",
  age_construction: "",
  DATE_EFFET: "",
  DATE_EXPIRATION: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("fr-DZ");
}

function getRisk(damageRatio, zone) {
  if (damageRatio > 0.5 || zone === "III") return "high";
  if (damageRatio > 0.25) return "medium";
  return "low";
}

const RISK_STYLES = {
  high:   { background: "#fee2e2", color: "#991b1b" },
  medium: { background: "#fef3c7", color: "#92400e" },
  low:    { background: "#d1fae5", color: "#065f46" },
};

function RiskBadge({ level }) {
  return (
    <span style={{
      ...RISK_STYLES[level],
      borderRadius: 4, padding: "2px 8px",
      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
    }}>
      {level}
    </span>
  );
}

function FlagBadge({ flag }) {
  const map = {
    red:    { bg: "#fee2e2", color: "#991b1b", label: "Red — Review required" },
    orange: { bg: "#fef3c7", color: "#92400e", label: "Orange — Monitor" },
    green:  { bg: "#d1fae5", color: "#065f46", label: "Green — Acceptable" },
  };
  const s = map[flag] || map.green;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ─── Shared Input Styles ──────────────────────────────────────────────────────

const inputStyle = {
  border: "0.5px solid #d1d5db", borderRadius: 8, padding: "7px 10px",
  fontSize: 13, background: "#f9fafb", color: "#111827",
  width: "100%", fontFamily: "inherit", outline: "none",
};

function FormField({ label, children, span2 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span2 ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, min, max, readOnly }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} min={min} max={max} readOnly={readOnly}
      style={{
        ...inputStyle,
        background: readOnly ? "#f3f4f6" : "#f9fafb",
        cursor: readOnly ? "default" : "text",
        borderColor: focused ? "#4ade80" : "#d1d5db",
        transition: "border-color 0.15s",
      }}
      onFocus={() => !readOnly && setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function SelectInput({ value, onChange, children, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value} onChange={onChange} disabled={disabled}
      style={{
        ...inputStyle, cursor: disabled ? "not-allowed" : "pointer",
        borderColor: focused ? "#4ade80" : "#d1d5db",
        opacity: disabled ? 0.6 : 1,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

function ZoneBadge({ zone }) {
  if (!zone) return <div style={{ ...inputStyle, color: "#9ca3af", fontSize: 12 }}>— Select wilaya first —</div>;
  const high = zone === "III";
  const mid = zone === "IIa" || zone === "IIb";
  const bg = high ? "#fef3c7" : mid ? "#dbeafe" : "#f0fdf4";
  const color = high ? "#92400e" : mid ? "#1e3a8a" : "#166534";
  const border = high ? "#fcd34d" : mid ? "#93c5fd" : "#86efac";
  const dot = high ? "#f59e0b" : mid ? "#3b82f6" : "#22c55e";
  const label = high ? "High seismic risk" : mid ? "Moderate seismic risk" : "Low seismic risk";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: bg, color, border: `0.5px solid ${border}`,
      borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 500,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />
      Zone {zone} — {label}
    </div>
  );
}

function StatCard({ label, value, variant = "default" }) {
  const colors = { default: "#111827", warning: "#d97706", danger: "#dc2626", success: "#16a34a" };
  return (
    <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: colors[variant] || colors.default }}>{value}</div>
    </div>
  );
}

// ─── AI Result Panel ──────────────────────────────────────────────────────────

function AIResultPanel({ result, onAccept, onRefuse }) {
  const {
    predicted_damage_ratio, tax_rate, suggested_premium,
    flag_review, predicted_payout, delta_vs_tax, zone_sismique, building_class,
  } = result;

  const decision = flag_review === "green" ? "ACCEPTED" : "CONDITIONAL";
  const decColor = flag_review === "green" ? "#16a34a" : flag_review === "orange" ? "#d97706" : "#dc2626";
  const dr = parseFloat(predicted_damage_ratio) || 0;

  return (
    <div style={{ marginTop: 16, borderTop: "0.5px solid #f3f4f6", paddingTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        AI Assessment Results
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <StatCard label="Damage ratio" value={`${(dr * 100).toFixed(1)}%`} variant={dr > 0.5 ? "danger" : dr > 0.3 ? "warning" : "success"} />
        <StatCard label="Suggested premium" value={`${fmt(Math.round(parseFloat(suggested_premium)))} DA`} variant="warning" />
        <StatCard label="Expected payout" value={`${fmt(Math.round(parseFloat(predicted_payout)))} DA`} variant="danger" />
        <StatCard label="Seismic zone" value={zone_sismique} />
        <StatCard label="Tax rate" value={`${(parseFloat(tax_rate) * 100).toFixed(0)}%`} />
        <StatCard label="Delta vs tax" value={`${parseFloat(delta_vs_tax) >= 0 ? "+" : ""}${(parseFloat(delta_vs_tax) * 100).toFixed(1)}%`} variant={flag_review === "green" ? "success" : flag_review === "orange" ? "warning" : "danger"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <FormField label="Building class"><Input value={building_class} readOnly /></FormField>
        <FormField label="Flag review"><div style={{ paddingTop: 4 }}><FlagBadge flag={flag_review} /></div></FormField>
        <FormField label="AI decision" span2>
          <div style={{ fontSize: 15, fontWeight: 700, color: decColor, padding: "4px 0" }}>{decision}</div>
        </FormField>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onAccept}
          style={{ flex: 1, padding: "9px 0", background: "transparent", border: "0.5px solid #22c55e", color: "#16a34a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          ✓ Accept &amp; Save
        </button>
        <button
          onClick={onRefuse}
          style={{ flex: 1, padding: "9px 0", background: "transparent", border: "0.5px solid #ef4444", color: "#dc2626", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          ✗ Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ result, form }) {
  if (!result) {
    return (
      <div style={{
        background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb",
        padding: 40, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 400, color: "#9ca3af", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#6b7280" }}>No assessment yet</div>
        <div style={{ fontSize: 12, lineHeight: 1.7 }}>
          Fill in the form and click<br />
          <strong style={{ color: "#111827" }}>Generate AI Assessment</strong><br />
          to see the AI decision here.
        </div>
      </div>
    );
  }

  const { flag_review, predicted_damage_ratio, zone_sismique, suggested_premium, predicted_payout, tax_rate, NUMERO_POLICE } = result;
  const decision = flag_review === "green" ? "ACCEPTED" : "CONDITIONAL";
  const decColor = flag_review === "green" ? "#16a34a" : flag_review === "orange" ? "#d97706" : "#dc2626";
  const badgeStyle = flag_review === "green"
    ? { bg: "#d1fae5", color: "#065f46", label: "Approved" }
    : { bg: "#fef3c7", color: "#92400e", label: "Under review" };
  const score = Math.round(40 + (parseFloat(predicted_damage_ratio) || 0) * 60);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {flag_review !== "green" && (
        <div style={{ background: "#fefce8", border: "0.5px solid #fde68a", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#78350f" }}>CONDITIONAL</span>
            <span style={{ background: "#fde68a", color: "#92400e", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>Under review</span>
          </div>
          <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6, marginBottom: 10 }}>
            The file remains technically insurable, but the proposed premium is insufficient
            given the seismic exposure (Zone {zone_sismique}) and building characteristics.
            A rate revision is recommended before validation.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", borderTop: "0.5px solid #fde68a", paddingTop: 8 }}>
            <span>AI risk score</span>
            <span style={{ fontWeight: 700, color: "#78350f" }}>{score} / 100</span>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Final summary sheet</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Reimbursable amounts and decision synthesis.</div>
          </div>
          <span style={{ background: badgeStyle.bg, color: badgeStyle.color, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
            {badgeStyle.label}
          </span>
        </div>

        {[
          ["Client", form.client_name || "—"],
          ["Location", `${form.WILAYA} — ${form.COMMUNE || "—"} — Zone ${zone_sismique}`],
          ["Policy #", NUMERO_POLICE || form.NUMERO_POLICE || "—"],
          ["AI decision", <span style={{ fontWeight: 700, color: decColor }}>{decision}</span>],
          ["Recommended premium", `${fmt(Math.round(parseFloat(suggested_premium)))} DA / yr`],
          ["Client proposed premium", `${fmt(parseFloat(form.prime_nette))} DA / yr`],
          ["Full loss reimbursable", `${fmt(Math.round(parseFloat(predicted_payout)))} DA`],
          ["Partial loss (40%)", `${fmt(Math.round(parseFloat(predicted_payout) * 0.4))} DA`],
          ["Tax rate", `${(parseFloat(tax_rate) * 100).toFixed(0)}%`],
        ].map(([label, val], i, arr) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 12, padding: "7px 0",
            borderBottom: i < arr.length - 1 ? "0.5px solid #f3f4f6" : "none", gap: 8,
          }}>
            <span style={{ color: "#6b7280", flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>{val}</span>
          </div>
        ))}

        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 12, fontStyle: "italic", lineHeight: 1.6, borderTop: "0.5px solid #f3f4f6", paddingTop: 10 }}>
          {decision === "CONDITIONAL"
            ? "Validation possible subject to premium increase and technical vulnerability control."
            : "File approved. Premium and risk profile are within acceptable bounds."}
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Table ──────────────────────────────────────────────────────────

function PortfolioTable({ assets, loading }) {
  const [search, setSearch] = useState("");
  const [filterWilaya, setFilterWilaya] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRisk, setFilterRisk] = useState("");

  const filtered = assets.filter(r => {
    const zone = r.zone_sismique || ZONE_MAP[r.WILAYA] || "IIa";
    const risk = getRisk(parseFloat(r.damage_ratio) || 0, zone);
    const q = search.toLowerCase();
    return (
      (!q || (r.WILAYA || "").toLowerCase().includes(q) || (r.COMMUNE || "").toLowerCase().includes(q) || String(r.NUMERO_POLICE || "").includes(q)) &&
      (!filterWilaya || r.WILAYA === filterWilaya) &&
      (!filterType || r.type_batiment === filterType) &&
      (!filterRisk || risk === filterRisk)
    );
  });

  const uniqueWilayas = [...new Set(assets.map(a => a.WILAYA).filter(Boolean))].sort();

  const thStyle = {
    textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600,
    color: "#6b7280", borderBottom: "0.5px solid #e5e7eb",
    background: "#f9fafb", whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "7px 10px", fontSize: 11.5, borderBottom: "0.5px solid #f3f4f6",
    color: "#111827", whiteSpace: "nowrap",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 180,
          background: "#fff", border: "0.5px solid #d1d5db", borderRadius: 8, padding: "6px 10px",
        }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search policy, wilaya, commune…"
            style={{ border: "none", outline: "none", fontSize: 12, background: "transparent", color: "#111827", width: "100%", fontFamily: "inherit" }}
          />
        </div>
        {[
          { placeholder: "All wilayas", options: uniqueWilayas.map(w => ({ v: w, l: w })), state: filterWilaya, set: setFilterWilaya },
          { placeholder: "All types", options: ["Industriel","Commercial","Résidentiel"].map(t => ({ v: t, l: t })), state: filterType, set: setFilterType },
          { placeholder: "All risks", options: [{ v: "high", l: "High" }, { v: "medium", l: "Medium" }, { v: "low", l: "Low" }], state: filterRisk, set: setFilterRisk },
        ].map(({ placeholder, options, state, set }, i) => (
          <select key={i} value={state} onChange={e => set(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 110, fontSize: 12, flex: "0 0 auto" }}>
            <option value="">{placeholder}</option>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
          {filtered.length !== assets.length ? `${filtered.length} / ` : ""}{assets.length.toLocaleString()} records
        </span>
        <button
          onClick={() => alert("Generating PDF export…")}
          style={{ padding: "6px 14px", background: "#1a4a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          ↓ Export PDF
        </button>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 10, border: "0.5px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              {["Policy #","Effect date","Expiry date","Type","Wilaya","Commune","Zone","Class","Sum insured (DA)","Net premium (DA)","Tax","Damage ratio","Expected payout (DA)","RPA","Violations","Risk"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={16} style={{ ...tdStyle, textAlign: "center", padding: 32, color: "#9ca3af" }}>Loading portfolio data…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={16} style={{ ...tdStyle, textAlign: "center", padding: 32, color: "#9ca3af" }}>No results match the current filters.</td></tr>
            ) : (
              filtered.slice(0, 100).map((r, i) => {
                const zone = r.zone_sismique || ZONE_MAP[r.WILAYA] || "IIa";
                const risk = getRisk(parseFloat(r.damage_ratio) || 0, zone);
                return (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 10, color: "#9ca3af" }}>{r.NUMERO_POLICE}</td>
                    <td style={tdStyle}>{r.DATE_EFFET}</td>
                    <td style={tdStyle}>{r.DATE_EXPIRATION}</td>
                    <td style={tdStyle}>{r.type_batiment}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{r.WILAYA}</td>
                    <td style={tdStyle}>{r.COMMUNE}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{zone}</td>
                    <td style={tdStyle}>{r.building_class}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(r.sum_insured)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(r.prime_nette)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{r.tax_rate ? `${(parseFloat(r.tax_rate) * 100).toFixed(0)}%` : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{r.damage_ratio ? `${(parseFloat(r.damage_ratio) * 100).toFixed(1)}%` : "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(r.expected_payout)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {r.rpa_conforme == 1
                        ? <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                        : <span style={{ color: "#dc2626", fontWeight: 700 }}>✗</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{r.rpa_nb_violations ?? "—"}</td>
                    <td style={tdStyle}><RiskBadge level={risk} /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 100 && (
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, textAlign: "right" }}>
          Showing first 100 of {filtered.length} results — export PDF for the full dataset.
        </p>
      )}
    </div>
  );
}

// ─── Main Page Component (No Sidebar) ─────────────────────────────────────────

export default function AIRecommendation() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState(MOCK_ASSETS);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Location state
  const [wilayas, setWilayas] = useState([
    "ALGER", "ORAN", "CONSTANTINE", "ANNABA", "SETIF", "BLIDA", 
    "TIZI OUZOU", "BEJAIA", "BOUMERDES", "TIPAZA"
  ]);
  const [communes, setCommunes] = useState([]);
  const [communesLoading, setCommunesLoading] = useState(false);

  // Mock communes data
  const MOCK_COMMUNES = {
    "ALGER": ["SIDI M'HAMED", "BAB EL OUED", "CASBAH", "HUSSEIN DEY", "BAB EZZOUAR", "BEN AKNOUN", "EL BIAR", "BOUZAREAH"],
    "ORAN": ["ORAN CENTRE", "SIDI EL HOUARI", "ES-SENIA", "BIR EL DJIR", "MERS EL KEBIR"],
    "CONSTANTINE": ["CONSTANTINE CENTRE", "EL KHROUB", "DIDOUCHE MOURAD", "IBN ZIAD"],
    "ANNABA": ["ANNABA CENTRE", "EL BOUNI", "SERAIADI", "SIDI AMAR"],
    "SETIF": ["SETIF CENTRE", "EL EULMA", "AIn AZEL", "BABOR"],
    "BLIDA": ["BLIDA CENTRE", "BOUINAN", "SOUK EL KHEMIS", "OUED EL ALLEUG"],
    "default": ["COMMUNE CENTRALE", "COMMUNE NORD", "COMMUNE SUD", "COMMUNE EST"]
  };

  const zone = ZONE_MAP[form.WILAYA] || (form.WILAYA ? "IIa" : "");

  // ── Load wilayas from API or use mock ──────────────────────────────────────
  useEffect(() => {
    fetch("/api/locations/wilayas")
      .then(r => r.json())
      .then(data => {
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && typeof data === "object") {
          list = data.wilayas || data.data || data.results || [];
          if (!Array.isArray(list)) list = [];
        }
        list = list.map(w => String(w).trim()).filter(w => w);
        if (list.length > 0) setWilayas(list);
      })
      .catch(err => console.error("Wilayas fetch error, using mock:", err));
  }, []);

  // ── Load communes when wilaya changes (with mock fallback) ─────────────────
  useEffect(() => {
    if (!form.WILAYA) {
      setCommunes([]);
      return;
    }
    
    setCommunesLoading(true);
    setCommunes([]);
    setForm(f => ({ ...f, COMMUNE: "" }));

    // First, use mock data immediately for better UX
    const mockList = MOCK_COMMUNES[form.WILAYA] || MOCK_COMMUNES.default;
    setCommunes(mockList);
    setCommunesLoading(false);
    
    // Then try to fetch real data
    fetch(`/api/locations/wilayas/${encodeURIComponent(form.WILAYA)}/communes`)
      .then(r => r.json())
      .then(data => {
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && typeof data === "object") {
          list = data.communes || data.data || data.results || [];
          if (!Array.isArray(list)) list = [];
        }
        list = list.map(c => String(c).trim()).filter(c => c);
        if (list.length > 0) setCommunes(list);
      })
      .catch(err => console.error("Communes fetch error, using mock:", err));
  }, [form.WILAYA]);

  // ── Load portfolio (try API, fallback to mock) ─────────────────────────────
  const loadAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const res = await fetch("/api/assets/read");
      if (!res.ok) throw new Error("API not available");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const headers = json.headers;
        const parsed = json.data.map(row => {
          const values = row.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || row.split(",");
          const clean = values.map(v => v.replace(/^"|"$/g, "").trim());
          return Object.fromEntries(headers.map((h, i) => [h, clean[i] ?? ""]));
        });
        if (parsed.length > 0) setAssets(parsed);
      }
    } catch (err) {
      console.error("Portfolio load error, using mock data:", err);
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // ── Field setter ────────────────────────────────────────────────────────────
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // ── Generate AI assessment ──────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!form.WILAYA || !form.COMMUNE) {
      setError("Please select both Wilaya and Commune");
      return;
    }
    
    setError(null);
    setAiResult(null);
    setLoading(true);
    
    setTimeout(() => {
      try {
        const sumInsured = parseFloat(form.sum_insured) || 1000000;
        const zoneFactor = ZONE_MAP[form.WILAYA] === "III" ? 0.65 : 0.40;
        const classFactor = form.building_class === "3A" ? 1.2 : form.building_class === "3B" ? 1.0 : 0.8;
        
        const predicted_damage_ratio = Math.min(0.95, zoneFactor * classFactor);
        const tax_rate = ZONE_MAP[form.WILAYA] === "III" ? 0.15 : 0.12;
        const suggested_premium = sumInsured * 0.025 * (1 + predicted_damage_ratio);
        const predicted_payout = sumInsured * predicted_damage_ratio;
        const delta_vs_tax = (suggested_premium - (parseFloat(form.prime_nette) || suggested_premium)) / suggested_premium;
        
        let flag_review = "green";
        if (predicted_damage_ratio > 0.6) flag_review = "red";
        else if (predicted_damage_ratio > 0.4) flag_review = "orange";
        
        const mockResult = {
          predicted_damage_ratio,
          tax_rate,
          suggested_premium: Math.round(suggested_premium),
          flag_review,
          predicted_payout: Math.round(predicted_payout),
          delta_vs_tax,
          zone_sismique: ZONE_MAP[form.WILAYA] || "IIa",
          building_class: form.building_class,
          NUMERO_POLICE: form.NUMERO_POLICE || `TEMP-${Date.now()}`,
        };
        
        setAiResult(mockResult);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 1000);
  }, [form]);

  // ── Accept → save asset (add to mock list) ─────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!aiResult) return;
    setError(null);
    
    const newAsset = {
      NUMERO_POLICE: form.NUMERO_POLICE || `POL-${Date.now()}`,
      DATE_EFFET: form.DATE_EFFET || new Date().toISOString().split('T')[0],
      DATE_EXPIRATION: form.DATE_EXPIRATION || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      WILAYA: form.WILAYA,
      COMMUNE: form.COMMUNE,
      type_batiment: form.type_batiment,
      building_class: form.building_class,
      sum_insured: form.sum_insured || "0",
      prime_nette: form.prime_nette || "0",
      damage_ratio: aiResult.predicted_damage_ratio.toString(),
      tax_rate: aiResult.tax_rate.toString(),
      expected_payout: aiResult.predicted_payout.toString(),
      zone_sismique: aiResult.zone_sismique,
      rpa_conforme: aiResult.predicted_damage_ratio < 0.5 ? "1" : "0",
      rpa_nb_violations: Math.floor(aiResult.predicted_damage_ratio * 10).toString(),
    };
    
    setAssets(prev => [newAsset, ...prev]);
    setForm(DEFAULT_FORM);
    setAiResult(null);
    alert("Asset saved successfully!");
  }, [form, aiResult]);

  const handleRefuse = () => { 
    setForm(DEFAULT_FORM); 
    setAiResult(null); 
    setError(null); 
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
          AI Recommendation — Earthquake Subscription
        </h1>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 5, maxWidth: 700, lineHeight: 1.7 }}>
          Decision support tool to evaluate contract acceptance, calculate the technical premium,
          estimate indemnity, and justify an automated decision based on the RPA zone, structure type, and profitability.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, alignItems: "start" }}>

        {/* LEFT: Asset Form */}
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Add Contract</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                Contract inputs — RPA zone auto-detected from wilaya.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Contract Info */}
            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, marginTop: 4 }}>
              Contract Info
            </div>

            <FormField label="Policy number">
              <Input value={form.NUMERO_POLICE} onChange={set("NUMERO_POLICE")} placeholder="e.g. 0912345" />
            </FormField>
            <FormField label="Client name">
              <Input value={form.client_name} onChange={set("client_name")} placeholder="Company / individual" />
            </FormField>
            <FormField label="Effect date">
              <Input type="date" value={form.DATE_EFFET} onChange={set("DATE_EFFET")} />
            </FormField>
            <FormField label="Expiry date">
              <Input type="date" value={form.DATE_EXPIRATION} onChange={set("DATE_EXPIRATION")} />
            </FormField>

            {/* Location */}
            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, marginTop: 8 }}>
              Location
            </div>

            <FormField label="Wilaya">
              <SelectInput value={form.WILAYA} onChange={set("WILAYA")}>
                <option value="">— Select wilaya —</option>
                {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
              </SelectInput>
            </FormField>

            <FormField label="Commune">
              <SelectInput value={form.COMMUNE} onChange={set("COMMUNE")} disabled={!form.WILAYA || communesLoading}>
                <option value="">
                  {!form.WILAYA ? "— Select wilaya first —" : communesLoading ? "Loading…" : "— Select commune —"}
                </option>
                {communes.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </FormField>

            <FormField label="RPA seismic zone" span2>
              <ZoneBadge zone={zone} />
            </FormField>

            {/* Building */}
            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, marginTop: 8 }}>
              Building
            </div>

            <FormField label="Building type">
              <SelectInput value={form.type_batiment} onChange={set("type_batiment")}>
                <option value="Industriel">Industrial</option>
                <option value="Commercial">Commercial</option>
                <option value="Résidentiel">Residential</option>
              </SelectInput>
            </FormField>
            <FormField label="Building class">
              <SelectInput value={form.building_class} onChange={set("building_class")}>
                {["3A","3B","2A","2B","1A","1B"].map(c => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </FormField>

            <FormField label="Construction year">
              <Input type="number" value={form.age_construction} onChange={set("age_construction")} placeholder="e.g. 1990" min={1900} max={2025} />
            </FormField>
            <FormField label="Number of floors">
              <Input type="number" value={form.nb_niveaux} onChange={set("nb_niveaux")} placeholder="default: 1" min={1} />
            </FormField>

            <FormField label="Height (m)">
              <Input type="number" value={form.hauteur} onChange={set("hauteur")} placeholder="default: 3" />
            </FormField>
            <FormField label="Length (m)">
              <Input type="number" value={form.longueur} onChange={set("longueur")} placeholder="e.g. 20" />
            </FormField>
            <FormField label="Width (m)">
              <Input type="number" value={form.largeur} onChange={set("largeur")} placeholder="e.g. 10" />
            </FormField>
            <FormField label="Floor area (m²)">
              <Input type="number" value={form.surface_plancher} onChange={set("surface_plancher")} placeholder="e.g. 200" />
            </FormField>

            {/* Structural */}
            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, marginTop: 8 }}>
              Structural Properties
            </div>

            <FormField label="Wall area (m²)">
              <Input type="number" value={form.aire_murs} onChange={set("aire_murs")} placeholder="e.g. 12" />
            </FormField>
            <FormField label="Wall thickness (cm)">
              <Input type="number" value={form.epaisseur_mur} onChange={set("epaisseur_mur")} placeholder="default: 20" />
            </FormField>
            <FormField label="Wall spacing (m)">
              <Input type="number" value={form.distance_entre_murs} onChange={set("distance_entre_murs")} placeholder="default: 6" />
            </FormField>
            <FormField label="Mortar resistance (MPa)">
              <Input type="number" value={form.resistance_mortier} onChange={set("resistance_mortier")} placeholder="default: 5" />
            </FormField>
            <FormField label="Concrete resistance (MPa)">
              <Input type="number" value={form.resistance_beton} onChange={set("resistance_beton")} placeholder="default: 15" />
            </FormField>

            {/* Financials */}
            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, marginTop: 8 }}>
              Financials
            </div>

            <FormField label="Sum insured (DA)">
              <Input type="number" value={form.sum_insured} onChange={set("sum_insured")} placeholder="e.g. 5 000 000" />
            </FormField>
            <FormField label="Net premium (DA/yr)">
              <Input type="number" value={form.prime_nette} onChange={set("prime_nette")} placeholder="e.g. 25 000" />
            </FormField>

            {/* Generate button */}
            <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
              <button
                onClick={handleGenerate}
                disabled={loading || !form.WILAYA || !form.COMMUNE}
                style={{
                  width: "100%", padding: "11px 0",
                  background: loading ? "#86efac" : (!form.WILAYA || !form.COMMUNE) ? "#d1d5db" : "#4ade80",
                  color: (!form.WILAYA || !form.COMMUNE) ? "#9ca3af" : "#14532d",
                  border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  cursor: (loading || !form.WILAYA || !form.COMMUNE) ? "not-allowed" : "pointer",
                  letterSpacing: "0.02em", transition: "background 0.15s",
                }}
              >
                {loading ? "Generating AI Assessment…" : "Generate AI Assessment"}
              </button>
              {(!form.WILAYA || !form.COMMUNE) && (
                <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 6 }}>
                  Select a wilaya and commune to enable assessment
                </p>
              )}
            </div>

            {error && (
              <div style={{ gridColumn: "1 / -1", background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#dc2626" }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {aiResult && (
            <AIResultPanel result={aiResult} onAccept={handleAccept} onRefuse={handleRefuse} />
          )}
        </div>

        {/* RIGHT: Decision Panel */}
        <RightPanel result={aiResult} form={form} />
      </div>

      {/* Portfolio table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Portfolio</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 14 }}>
          All insured assets — {assets.length} records
        </div>
        <PortfolioTable assets={assets} loading={assetsLoading} />
      </div>
    </div>
  );
}