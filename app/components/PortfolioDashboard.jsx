"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Icons ─────────────────────────────────────────────────────── */
const Icon = ({ d, size = "w-4 h-4", stroke = 1.8 }) => (
  <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const SearchIco  = () => <Icon size="w-4 h-4" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />;
const DownloadIco= () => <Icon d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />;
const PlusIco    = () => <Icon d="M12 5v14M5 12h14" stroke={2} />;
const EditIco    = () => <Icon d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />;
const TrashIco   = () => <Icon d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />;
const BellIco    = () => <Icon size="w-5 h-5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />;
const ChevronIco = ({ dir = "down" }) => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d={dir === "down" ? "M19 9l-7 7-7-7" : dir === "right" ? "M9 5l7 7-7 7" : "M5 15l7-7 7 7"} />
  </svg>
);

/* ── Utilities ─────────────────────────────────────────────────── */
const fmt = (v) => {
  if (!v && v !== 0) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString();
};

/* ── Zone Config ───────────────────────────────────────────────── */
const ZONE = {
  "III":  { color: "#ef4444", bg: "bg-red-500",    light: "bg-red-50",    border: "border-red-200",    text: "text-red-700"    },
  "IIb":  { color: "#f97316", bg: "bg-orange-500", light: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  "IIa":  { color: "#eab308", bg: "bg-yellow-500", light: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  "I":    { color: "#22c55e", bg: "bg-green-500",  light: "bg-green-50",  border: "border-green-200",  text: "text-green-700"  },
  "0":    { color: "#3b82f6", bg: "bg-blue-500",   light: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700"   },
};
const zoneColor = (z) => ZONE[z]?.color ?? "#6b7280";

/* ── Asset avatar letters per zone ────────────────────────────── */
const AVATARS = {
  "III": { grad: "from-red-400 to-red-600",       letter: "F" },
  "IIb": { grad: "from-orange-400 to-orange-600", letter: "P" },
  "IIa": { grad: "from-yellow-400 to-yellow-600", letter: "R" },
  "I":   { grad: "from-green-400 to-green-600",   letter: "T" },
  "0":   { grad: "from-blue-400 to-blue-600",     letter: "H" },
};

/* ── Static enrichment data ────────────────────────────────────── */
const SUBTYPES   = ["Industrial installation","Commercial installation","Real estate","Manufacturing facility","Distribution center"];
const CONSTRUCTS = [
  {type:"Reinforced concrete",year:2008},{type:"Steel + concrete",year:2016},
  {type:"Masonry structure",year:1998},{type:"Reinforced concrete",year:2019},{type:"Steel frame",year:2014},
];
const COMMUNES   = ["Rouiba","Bab Ezzouar","Bir El Djir","El Eulma","Hassi Messaoud","Kouba","Annaba Centre","Oran Centre"];
const NOTES      = ["Auto-zone from wilaya 16","Dense urban concentration","Coastal residential portfolio","High-value storage hub","Southern expansion portfolio"];

/* ── CSV Export ─────────────────────────────────────────────────── */
function exportCSV(rows) {
  const headers = ["Asset","Wilaya","Commune","Construction","Year","Zone","Capital","Prime"];
  const lines = rows.map((r, i) => [
    `${r.wilaya} Asset`,
    r.wilaya,
    COMMUNES[i % COMMUNES.length],
    CONSTRUCTS[i % CONSTRUCTS.length].type,
    CONSTRUCTS[i % CONSTRUCTS.length].year,
    r.zone,
    r.capital,
    r.prime,
  ].join(","));
  const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "portfolio_export.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* ── Zone Badge ─────────────────────────────────────────────────── */
function ZoneBadge({ zone, size = "sm" }) {
  const c = zoneColor(zone);
  const px = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs";
  return (
    <span className={`inline-flex items-center font-bold text-white rounded-full ${px}`}
      style={{ backgroundColor: c }}>
      Zone {zone}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function PortfolioDashboard() {
  const [summary, setSummary]         = useState(null);
  const [zones, setZones]             = useState(null);
  const [scenarioData, setScenarioData] = useState(null);
  const [wilayaData, setWilayaData]   = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);

  // Filters
  const [search, setSearch]           = useState("");
  const [typeTab, setTypeTab]         = useState("all");
  const [wilayaFilter, setWilayaFilter] = useState("");
  const [yearFilter, setYearFilter]   = useState("");
  const [showWilayaDrop, setShowWilayaDrop] = useState(false);
  const [showYearDrop, setShowYearDrop]     = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const [sR, zR, scR, wR] = await Promise.all([
          fetch("https://nexoria-vq48.onrender.com/api/portfolio/summary"),
          fetch("https://nexoria-vq48.onrender.com/api/scenario/zones"),
          fetch("https://nexoria-vq48.onrender.com/api/scenario/preview?year=2025"),
          fetch("https://nexoria-vq48.onrender.com/api/portfolio/by-wilaya?year=2025"),
        ]);
        const [s, z, sc, w] = await Promise.all([sR.json(), zR.json(), scR.json(), wR.json()]);
        setSummary(s); setZones(z); setScenarioData(sc); setWilayaData(w);
        setSelected(w[0] ?? null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  /* ── Derived lists ── */
  const uniqueWilayas = useMemo(() => [...new Set(wilayaData.map(d => d.wilaya))].sort(), [wilayaData]);
  const uniqueYears   = useMemo(() => [...new Set(CONSTRUCTS.map(c => String(c.year)))].sort(), []);

  const filtered = useMemo(() => wilayaData.filter((item, i) => {
    const s  = item.wilaya.toLowerCase().includes(search.toLowerCase());
    const t  = typeTab === "all"          ? true
             : typeTab === "zone-iii"     ? item.zone === "III"
             : typeTab === "industrial"   ? i % 3 === 0
             : typeTab === "commercial"   ? i % 3 === 1
             : true;
    const w  = wilayaFilter ? item.wilaya === wilayaFilter : true;
    const y  = yearFilter   ? String(CONSTRUCTS[i % CONSTRUCTS.length].year) === yearFilter : true;
    return s && t && w && y;
  }), [wilayaData, search, typeTab, wilayaFilter, yearFilter]);

  /* ── Stat cards ── */
  const z3 = scenarioData?.byZone?.find(z => z.zone === "III");
  const dq = summary?.dataQuality;
  const completeness = dq ? Math.round((dq.withRealCapital / (dq.withRealCapital + dq.estimated)) * 100) : 0;

  const CARDS = [
    {
      label: "Total insured assets",
      value: (summary?.totalContracts || 0).toLocaleString(),
      sub: "+184 assets imported this month",
      subOk: true,
      iconBg: "bg-[#1a4a1a]",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={1.8} fill="none"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeLinecap="round"/>
          <line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round"/><line x1="10" y1="14" x2="14" y2="14" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Portfolio capital",
      value: fmt(summary?.totalCapital || 0),
      sub: "DZD declared across 48 wilayas",
      subOk: null,
      iconBg: "bg-amber-400",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth={1.8} fill="none"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
    },
    {
      label: "Assets in Zone III",
      value: (z3?.contracts || 0).toLocaleString(),
      sub: `${(z3?.pctCapital || 0).toFixed(1)}% concentrated in high-risk areas`,
      subOk: false,
      iconBg: "bg-red-400",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01"/>
        </svg>
      ),
    },
    {
      label: "Data completeness",
      value: `${completeness}%`,
      sub: `${dq?.estimated || 0} records missing vulnerability details`,
      subOk: null,
      iconBg: "bg-blue-400",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
  ];

  const TABS = [
    { id: "all",        label: "All types" },
    { id: "industrial", label: "Industrial" },
    { id: "commercial", label: "Commercial" },
    { id: "real-estate",label: "Real estate" },
    { id: "zone-iii",   label: "Zone III only" },
  ];

  /* ── Custom Tooltip ── */
  const ChartTip = ({ active, payload, label }) => active && payload?.length ? (
    <div className="bg-white shadow-xl rounded-lg px-3 py-2 border border-gray-100 text-sm">
      <p className="font-semibold text-gray-800">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">{p.name}: <strong>{p.value?.toLocaleString()}</strong></p>
      ))}
    </div>
  ) : null;

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#2d7a2d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading portfolio…</p>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 lg:px-8 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Portfolio Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage insured assets, construction characteristics, seismic zone assignment, and underwriting exposure.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative hidden md:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIco /></span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search asset ID, wilaya, commune…"
            className="pl-9 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d7a2d]/30 focus:border-[#2d7a2d] bg-gray-50"
          />
        </div>

        {/* All Assets badge */}
        <span className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg border border-gray-200">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          All Assets
        </span>

        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <BellIco />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Updated badge */}
        <span className="hidden sm:block text-xs text-gray-400 font-medium">↻ updated today</span>

        <button className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition-all">
          <DownloadIco /> Import Cr V
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-[#2d7a2d] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5e1a] transition-all shadow-sm">
          <PlusIco /> Add Asset
        </button>
      </div>

      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium leading-snug">{c.label}</p>
                <div className={`${c.iconBg} w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0`}>
                  {c.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-none">{c.value}</p>
              <p className={`text-xs mt-2 font-medium ${c.subOk === true ? "text-[#2d7a2d]" : c.subOk === false ? "text-red-500" : "text-gray-500"}`}>
                {c.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Charts Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">Distribution by Seismic Zone</h3>
            <p className="text-xs text-gray-500 mb-4">Contract count per risk zone</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scenarioData?.byZone || []} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="contracts" name="Contracts" radius={[6, 6, 0, 0]} barSize={36}>
                  {scenarioData?.byZone?.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">Capital Exposure</h3>
            <p className="text-xs text-gray-500 mb-2">By seismic zone</p>
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Pie data={scenarioData?.byZone || []} dataKey="capital" nameKey="zone"
                  cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {scenarioData?.byZone?.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {scenarioData?.byZone?.map((e, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                  <span className="text-[11px] text-gray-500">Zone {e.zone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Table + Side Panel ─────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Left: Table ────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Register header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Insured assets register</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Filter, review and manage each insured location with auto-detected seismic zone.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-lg">
                    {filtered.length.toLocaleString()} records
                  </span>
                  <button
                    onClick={() => exportCSV(filtered)}
                    className="flex items-center gap-1.5 text-sm text-[#2d7a2d] font-semibold hover:text-[#1a5e1a] transition-colors border border-[#2d7a2d]/30 px-3 py-1.5 rounded-lg hover:bg-[#2d7a2d]/5"
                  >
                    <DownloadIco /> Export list
                  </button>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Type tabs */}
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTypeTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border
                      ${typeTab === t.id
                        ? "bg-[#1a4a1a] text-white border-[#1a4a1a] shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                    {t.label}
                  </button>
                ))}

                <div className="flex-1" />

                {/* Wilaya dropdown */}
                <div className="relative">
                  <button onClick={() => { setShowWilayaDrop(v => !v); setShowYearDrop(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                    {wilayaFilter || "Wilaya"} <ChevronIco />
                  </button>
                  {showWilayaDrop && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-48 py-1 max-h-56 overflow-y-auto">
                      <button onClick={() => { setWilayaFilter(""); setShowWilayaDrop(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">All wilayas</button>
                      {uniqueWilayas.map(w => (
                        <button key={w} onClick={() => { setWilayaFilter(w); setShowWilayaDrop(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${wilayaFilter === w ? "text-[#2d7a2d] font-semibold" : "text-gray-700"}`}>
                          {w}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Construction year dropdown */}
                <div className="relative">
                  <button onClick={() => { setShowYearDrop(v => !v); setShowWilayaDrop(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium">
                    {yearFilter || "Construction year"} <ChevronIco />
                  </button>
                  {showYearDrop && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-44 py-1">
                      <button onClick={() => { setYearFilter(""); setShowYearDrop(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">All years</button>
                      {uniqueYears.map(y => (
                        <button key={y} onClick={() => { setYearFilter(y); setShowYearDrop(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${yearFilter === y ? "text-[#2d7a2d] font-semibold" : "text-gray-700"}`}>
                          {y}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Asset</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Wilaya / Commune</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Construction</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Capital</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Prime</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-16 text-center">
                        <p className="text-gray-400 text-sm">No assets found. Try adjusting your filters.</p>
                      </td></tr>
                    ) : filtered.map((item, idx) => {
                      const av  = AVATARS[item.zone] ?? AVATARS["0"];
                      const ct  = CONSTRUCTS[idx % CONSTRUCTS.length];
                      const com = COMMUNES[idx % COMMUNES.length];
                      const sub = SUBTYPES[idx % SUBTYPES.length];
                      const isSelected = selected?.wilaya === item.wilaya;
                      return (
                        <tr key={idx} onClick={() => setSelected(item)}
                          className={`cursor-pointer transition-all duration-150
                            ${isSelected
                              ? "bg-[#f0f9f0] border-l-4 border-l-[#2d7a2d]"
                              : "hover:bg-gray-50 border-l-4 border-l-transparent"}`}>

                          {/* Asset */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${av.grad} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                                {av.letter}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 leading-tight">
                                  {item.wilaya.charAt(0) + item.wilaya.slice(1).toLowerCase()} Asset
                                </p>
                                <p className="text-xs text-gray-400">{sub} • #{item.zone}-{1000 + idx}</p>
                              </div>
                            </div>
                          </td>

                          {/* Wilaya / Commune */}
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <p className="font-medium text-gray-800">{item.wilaya} / {com}</p>
                            <p className="text-xs text-gray-400">{NOTES[idx % NOTES.length]}</p>
                          </td>

                          {/* Construction */}
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-gray-700">{ct.type}</p>
                            <p className="text-xs text-gray-400">Built {ct.year}</p>
                          </td>

                          {/* Zone */}
                          <td className="px-5 py-4 text-center">
                            <ZoneBadge zone={item.zone} />
                          </td>

                          {/* Capital */}
                          <td className="px-5 py-4 text-right">
                            <p className="font-bold text-gray-900">{fmt(item.capital)}</p>
                            <p className="text-xs text-gray-400">MZM</p>
                          </td>

                          {/* Prime */}
                          <td className="px-5 py-4 text-right hidden lg:table-cell">
                            <p className="font-semibold text-gray-700">{fmt(item.prime)}</p>
                            <p className="text-xs text-gray-400">DZD</p>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={e => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#2d7a2d] hover:bg-[#2d7a2d]/10 transition-colors" title="Edit">
                                <EditIco />
                              </button>
                              <button onClick={e => { e.stopPropagation(); setWilayaData(prev => prev.filter((_, i) => i !== idx)); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                                <TrashIco />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Right: Asset Detail Panel ───────────────────────── */}
          {selected && (
            <div className="w-full lg:w-72 shrink-0 sticky top-24">
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">

                {/* Panel header with zone color stripe */}
                <div className="relative px-5 pt-5 pb-4 border-b border-gray-100">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: zoneColor(selected.zone) }} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Selected asset</p>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5 leading-tight truncate">
                        {selected.wilaya.charAt(0) + selected.wilaya.slice(1).toLowerCase()} Asset
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selected.wilaya} • Industrial installation • Auto-detected RPA zone
                      </p>
                    </div>
                    <ZoneBadge zone={selected.zone} />
                  </div>
                </div>

                {/* Mini map placeholder */}
                <div className="mx-4 mt-4 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 h-28 relative border border-gray-200">
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "repeating-linear-gradient(0deg,#888 0,#888 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#888 0,#888 1px,transparent 1px,transparent 20px)" }} />
                  <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm text-xs font-medium text-gray-700 px-2 py-0.5 rounded-md shadow-sm">
                    Wilaya {selected.wilaya}
                  </div>
                  <div className="absolute" style={{ bottom: "35%", right: "30%" }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg ring-4 ring-red-200 animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 italic text-right">
                    ⚑ High vulnerability cluster
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="px-4 py-4 grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Insured capital", value: fmt(selected.capital), sub: "DZD" },
                    { label: "Construction type", value: "Reinforced concrete", sub: "" },
                    { label: "Year of construction", value: "2008", sub: "" },
                    { label: "Vulnerability level", value: "High (4.8 / 5)", sub: "", red: true },
                  ].map(({ label, value, sub, red }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold leading-tight">{label}</p>
                      <p className={`text-sm font-bold mt-1 leading-tight ${red ? "text-red-500" : "text-gray-900"}`}>{value}</p>
                      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="px-4 pb-4 space-y-3">
                  {[
                    { label: "Damage scenario sensitivity", value: 82, color: "#ef4444" },
                    { label: "Portfolio diversification score", value: 41, color: "#2d7a2d" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-600 font-medium">{label}</span>
                        <span className="text-xs font-bold text-gray-900">{value}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${value}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Zone info */}
                {zones?.[selected.zone] && (
                  <div className="mx-4 mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Zone Information</p>
                    <p className="text-xs font-semibold text-gray-800">{zones[selected.zone].label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Acceleration coefficient A = <strong>{zones[selected.zone].A}</strong>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#2d7a2d] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5e1a] transition-all shadow-sm">
                    <EditIco /> Edit asset
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                    3 pen profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}