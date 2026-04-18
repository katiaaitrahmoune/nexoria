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

const WILAYAS = [
  "ADRAR","AIN DEFLA","AIN TEMOUCHENT","ALGER","ANNABA","BATNA","BECHAR",
  "BEJAIA","B.B ARRERIDJ","BISKRA","BLIDA","BOUMERDES","BOUIRA","CHLEF",
  "CONSTANTINE","DJELFA","EL BAYADH","EL OUED","EL TARF","GHARDAIA","GUELMA",
  "ILLIZI","JIJEL","KHENCHELA","LAGHOUAT","MASCARA","MEDEA","MILA","MOSTAGANEM",
  "MSILA","NAAMA","ORAN","OUM EL BOUAGHI","OUARGLA","RELIZANE","SAIDA",
  "SETIF","SIDI BEL ABBES","SKIKDA","SOUK AHRAS","TAMANRASSET","TEBESSA",
  "TIARET","TINDOUF","TIPAZA","TISSEMSILT","TIZI OUZOU","TLEMCEN",
];

const DEFAULT_FORM = {
  NUMERO_POLICE: "",
  client_name: "",
  WILAYA: "ALGER",
  COMMUNE: "",
  type_batiment: "Industriel",
  building_class: "3A",
  sum_insured: "",
  prime_nette: "",
  nb_niveaux: "",
  hauteur: "",
  longueur: "",
  largeur: "",
  surface_plancher: "",
  aire_murs: "",
  epaisseur_mur: "",
  distance_entre_murs: "",
  resistance_mortier: "",
  resistance_beton: "",
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
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "capitalize",
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
  border: "0.5px solid #d1d5db",
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 13,
  background: "#f9fafb",
  color: "#111827",
  width: "100%",
  fontFamily: "inherit",
  outline: "none",
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
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      readOnly={readOnly}
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

function Select({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, cursor: "pointer", borderColor: focused ? "#4ade80" : "#d1d5db" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

function ZoneBadge({ zone }) {
  const high = zone === "III";
  const mid = zone === "IIa" || zone === "IIb";
  const bg = high ? "#fef3c7" : mid ? "#dbeafe" : "#f0fdf4";
  const color = high ? "#92400e" : mid ? "#1e3a8a" : "#166534";
  const border = high ? "#fcd34d" : mid ? "#93c5fd" : "#86efac";
  const dot = high ? "#f59e0b" : mid ? "#3b82f6" : "#22c55e";
  const label = high ? "High seismic risk" : mid ? "Moderate seismic risk" : "Low seismic risk";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color, border: `0.5px solid ${border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />
      Zone {zone || "—"} — {label}
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

// ─── Right Panel: Conditional + Fiche ────────────────────────────────────────

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

  const {
    flag_review, predicted_damage_ratio, zone_sismique,
    suggested_premium, predicted_payout, tax_rate, NUMERO_POLICE,
  } = result;

  const decision = flag_review === "green" ? "ACCEPTED" : "CONDITIONAL";
  const decColor = flag_review === "green" ? "#16a34a" : flag_review === "orange" ? "#d97706" : "#dc2626";
  const badgeStyle = flag_review === "green"
    ? { bg: "#d1fae5", color: "#065f46", label: "Approved" }
    : { bg: "#fef3c7", color: "#92400e", label: "Under review" };
  const score = Math.round(40 + (parseFloat(predicted_damage_ratio) || 0) * 60);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Conditional warning block */}
      {flag_review !== "green" && (
        <div style={{ background: "#fefce8", border: "0.5px solid #fde68a", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#78350f" }}>CONDITIONAL</span>
            <span style={{ background: "#fde68a", color: "#92400e", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
              Under review
            </span>
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

      {/* Final fiche */}
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
            borderBottom: i < arr.length - 1 ? "0.5px solid #f3f4f6" : "none",
            gap: 8,
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
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 180,
          background: "#fff", border: "0.5px solid #d1d5db", borderRadius: 8, padding: "6px 10px",
        }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
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

      {/* Table */}
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
              <tr>
                <td colSpan={16} style={{ ...tdStyle, textAlign: "center", padding: 32, color: "#9ca3af" }}>
                  Loading portfolio data…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ ...tdStyle, textAlign: "center", padding: 32, color: "#9ca3af" }}>
                  No results match the current filters.
                </td>
              </tr>
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
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {r.tax_rate ? `${(parseFloat(r.tax_rate) * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {r.damage_ratio ? `${(parseFloat(r.damage_ratio) * 100).toFixed(1)}%` : "—"}
                    </td>
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

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AIRecommendation() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const zone = ZONE_MAP[form.WILAYA] || "IIa";

  // ── Load portfolio ──────────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const res = await fetch("/api/assets/read");
      if (!res.ok) throw new Error("Failed to load assets");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const headers = json.headers;
        const parsed = json.data.map(row => {
          // Handle quoted CSV values
          const values = row.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || row.split(",");
          const clean = values.map(v => v.replace(/^"|"$/g, "").trim());
          return Object.fromEntries(headers.map((h, i) => [h, clean[i] ?? ""]));
        });
        setAssets(parsed);
      }
    } catch (err) {
      console.error("Portfolio load error:", err);
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // ── Field setter ────────────────────────────────────────────────────────────
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // ── Generate AI assessment ──────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setError(null);
    setAiResult(null);
    setLoading(true);
    try {
      const body = {
        NUMERO_POLICE: form.NUMERO_POLICE,
        DATE_EFFET: form.DATE_EFFET,
        DATE_EXPIRATION: form.DATE_EXPIRATION,
        WILAYA: form.WILAYA,
        COMMUNE: form.COMMUNE,
        type_batiment: form.type_batiment,
        building_class: form.building_class,
        sum_insured: parseFloat(form.sum_insured),
        prime_nette: parseFloat(form.prime_nette),
        nb_niveaux: parseInt(form.nb_niveaux),
        hauteur: parseFloat(form.hauteur),
        longueur: parseFloat(form.longueur),
        largeur: parseFloat(form.largeur),
        surface_plancher: parseFloat(form.surface_plancher),
        aire_murs: parseFloat(form.aire_murs),
        epaisseur_mur: parseFloat(form.epaisseur_mur),
        distance_entre_murs: parseFloat(form.distance_entre_murs),
        resistance_mortier: parseFloat(form.resistance_mortier),
        resistance_beton: parseFloat(form.resistance_beton),
        age_construction: parseInt(form.age_construction),
      };
      const res = await fetch("/api/assets/predicted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${res.status}`);
      }
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  // ── Accept → save asset ─────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!aiResult) return;
    setError(null);
    try {
      const body = {
        NUMERO_POLICE: form.NUMERO_POLICE,
        DATE_EFFET: form.DATE_EFFET,
        DATE_EXPIRATION: form.DATE_EXPIRATION,
        WILAYA: form.WILAYA,
        COMMUNE: form.COMMUNE,
        type_batiment: form.type_batiment,
        building_class: form.building_class,
        sum_insured: parseFloat(form.sum_insured),
        prime_nette: parseFloat(form.prime_nette),
        nb_niveaux: parseInt(form.nb_niveaux),
        hauteur: parseFloat(form.hauteur),
        longueur: parseFloat(form.longueur),
        largeur: parseFloat(form.largeur),
        surface_plancher: parseFloat(form.surface_plancher),
        aire_murs: parseFloat(form.aire_murs),
        epaisseur_mur: parseFloat(form.epaisseur_mur),
        distance_entre_murs: parseFloat(form.distance_entre_murs),
        resistance_mortier: parseFloat(form.resistance_mortier),
        resistance_beton: parseFloat(form.resistance_beton),
        age_construction: parseInt(form.age_construction),
      };
      const res = await fetch("/api/assets/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Save failed: ${res.status}`);
      }
      // Reset form and reload portfolio
      setForm(DEFAULT_FORM);
      setAiResult(null);
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  }, [form, aiResult, loadAssets]);

  // ── Refuse / Cancel ─────────────────────────────────────────────────────────
  const handleRefuse = () => {
    setForm(DEFAULT_FORM);
    setAiResult(null);
    setError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#111827",
      background: "#f9fafb",
      minHeight: "100vh",
      padding: "24px 28px",
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
          AI Recommendation — Earthquake Subscription
        </h1>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 5, maxWidth: 700, lineHeight: 1.7 }}>
          Decision support tool to evaluate contract acceptance, calculate the technical premium,
          estimate indemnity, and justify an automated decision based on the RPA zone, structure type, and profitability.
        </p>
      </div>

      {/* Two-column: Form | Decision Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, alignItems: "start" }}>

        {/* ── LEFT: Asset Form ─────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Add Formulaire</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                Contract inputs — RPA zone auto-detected from wilaya.
              </div>
            </div>
            <button
              onClick={() => alert("Asset import wizard…")}
              style={{ padding: "6px 12px", background: "#1a4a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              + Add Assets
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

            <FormField label="Wilaya">
              <Select value={form.WILAYA} onChange={set("WILAYA")}>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </Select>
            </FormField>
            <FormField label="RPA zone (auto)">
              <div style={{ paddingTop: 2 }}><ZoneBadge zone={zone} /></div>
            </FormField>

            <FormField label="Commune">
              <Input value={form.COMMUNE} onChange={set("COMMUNE")} placeholder="Commune" />
            </FormField>
            <FormField label="Building type">
              <Select value={form.type_batiment} onChange={set("type_batiment")}>
                <option value="Industriel">Industrial</option>
                <option value="Commercial">Commercial</option>
                <option value="Résidentiel">Residential</option>
              </Select>
            </FormField>

            <FormField label="Building class">
              <Select value={form.building_class} onChange={set("building_class")}>
                {["3A","3B","2A","2B","1A","1B"].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Construction year">
              <Input type="number" value={form.age_construction} onChange={set("age_construction")} placeholder="e.g. 1990" min={1900} max={2025} />
            </FormField>

            <FormField label="Sum insured (DA)">
              <Input type="number" value={form.sum_insured} onChange={set("sum_insured")} placeholder="e.g. 5000000" />
            </FormField>
            <FormField label="Net premium (DA/yr)">
              <Input type="number" value={form.prime_nette} onChange={set("prime_nette")} placeholder="e.g. 25000" />
            </FormField>

            <FormField label="Number of floors">
              <Input type="number" value={form.nb_niveaux} onChange={set("nb_niveaux")} placeholder="e.g. 3" />
            </FormField>
            <FormField label="Height (m)">
              <Input type="number" value={form.hauteur} onChange={set("hauteur")} placeholder="e.g. 10" />
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
            <FormField label="Wall area (m²)">
              <Input type="number" value={form.aire_murs} onChange={set("aire_murs")} placeholder="e.g. 12" />
            </FormField>

            <FormField label="Wall thickness (cm)">
              <Input type="number" value={form.epaisseur_mur} onChange={set("epaisseur_mur")} placeholder="e.g. 20" />
            </FormField>
            <FormField label="Wall spacing (m)">
              <Input type="number" value={form.distance_entre_murs} onChange={set("distance_entre_murs")} placeholder="e.g. 6" />
            </FormField>

            <FormField label="Mortar resistance (MPa)">
              <Input type="number" value={form.resistance_mortier} onChange={set("resistance_mortier")} placeholder="e.g. 5" />
            </FormField>
            <FormField label="Concrete resistance (MPa)">
              <Input type="number" value={form.resistance_beton} onChange={set("resistance_beton")} placeholder="e.g. 15" />
            </FormField>

            {/* Generate button — full width */}
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  width: "100%", padding: "11px 0",
                  background: loading ? "#86efac" : "#4ade80",
                  color: "#14532d", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.02em", transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#22c55e"; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#4ade80"; }}
              >
                {loading ? "Generating AI Assessment…" : "Generate AI Assessment"}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ gridColumn: "1 / -1", background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#dc2626" }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* AI result cards + accept/refuse */}
          {aiResult && (
            <AIResultPanel result={aiResult} onAccept={handleAccept} onRefuse={handleRefuse} />
          )}
        </div>

        {/* ── RIGHT: Decision Panel ────────────────────────────────────── */}
        <RightPanel result={aiResult} form={form} />
      </div>

      {/* Portfolio table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Portfolio</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 14 }}>
          All insured assets — live from <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>/api/assets/read</code>
        </div>
        <PortfolioTable assets={assets} loading={assetsLoading} />
      </div>
    </div>
  );
}