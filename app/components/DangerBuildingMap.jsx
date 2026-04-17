"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

export const ZONE_CONFIG = {
  "Zone III":  { color: "#ef4444", dot: "#fca5a5", label: "Zone III — Very High Seismic Risk", score: 4 },
  "Zone IIb":  { color: "#f97316", dot: "#fdba74", label: "Zone IIb — High Seismic Risk",       score: 3 },
  "Zone IIa":  { color: "#eab308", dot: "#fde047", label: "Zone IIa — Moderate Seismic Risk",     score: 2 },
  "Zone II":   { color: "#eab308", dot: "#fde047", label: "Zone II — Moderate Seismic Risk",      score: 2 },
  "Zone I":    { color: "#22c55e", dot: "#86efac", label: "Zone I — Low Seismic Risk",        score: 1 },
  "Zone 0":    { color: "#3b82f6", dot: "#93c5fd", label: "Zone 0 — Very Low Seismic Risk",   score: 0 },
};

const LEGEND = [
  { key: "Zone III",  label: "Zone III",  sublabel: "Very High Seismic Risk" },
  { key: "Zone IIb",  label: "Zone IIb",  sublabel: "High Seismic Risk" },
  { key: "Zone IIa",  label: "Zone IIa",  sublabel: "Moderate Seismic Risk" },
  { key: "Zone I",    label: "Zone I",    sublabel: "Low Seismic Risk" },
  { key: "Zone 0",    label: "Zone 0",    sublabel: "Very Low Seismic Risk" },
];

const MapInner = dynamic(() => import("./DangerBuildingMapInner"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-[#0f1a0f]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#2d7a2d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/50 text-sm">Loading map...</p>
      </div>
    </div>
  )
});

function computeStats(communes) {
  const totals = {};
  communes.forEach(c => {
    const key = c.Level;
    if (!totals[key]) totals[key] = { count: 0, buildings: 0 };
    totals[key].count++;
    totals[key].buildings += c.count || 0;
  });
  return totals;
}

export default function DangerBuildingMap() {
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);

  const [activeZones, setActiveZones] = useState(new Set(Object.keys(ZONE_CONFIG)));
  const [search, setSearch]           = useState("");

  useEffect(() => {
    fetch("https://nexoria-vq48.onrender.com/api/danger-building")
      .then(r => r.json())
      .then(json => {
        let dataArray = [];
        
        // Extract from rows array
        if (json?.rows && Array.isArray(json.rows)) {
          dataArray = json.rows.map(row => {
            if (row.data && typeof row.data === 'string') {
              try {
                return JSON.parse(row.data);
              } catch (e) {
                console.error("Failed to parse JSON:", e);
                return row;
              }
            }
            return row;
          });
        }
        
        if (dataArray.length === 0) {
          setError("No data received from API");
          setLoading(false);
          return;
        }
        
        // Normalize the data - your data already has the correct fields
        const normalizedData = dataArray.map(item => ({
          ...item,
          lat: item.lat,
          lon: item.lon,
          COMMUNE: item.COMMUNE,
          Level: item.Level,
          count: item.count || 0,
          POLICE_LIST: item.POLICE_LIST || [],
        }));
        
        console.log(`✅ Loaded ${normalizedData.length} communes`);
        console.log("Sample:", normalizedData[0]);
        
        setCommunes(normalizedData);
        setLoading(false);
      })
      .catch(e => { 
        console.error("Fetch error:", e);
        setError(e.message); 
        setLoading(false); 
      });
  }, []);

  const filtered = useMemo(() => communes.filter(c => {
    const zoneMatch  = activeZones.has(c.Level);
    const searchMatch = !search || c.COMMUNE?.toLowerCase().includes(search.toLowerCase());
    return zoneMatch && searchMatch;
  }), [communes, activeZones, search]);

  const stats = useMemo(() => computeStats(communes), [communes]);
  const totalBuildings = useMemo(() => communes.reduce((a, c) => a + (c.count || 0), 0), [communes]);

  const toggleZone = (key) => {
    setActiveZones(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (loading) return (
    <div className="flex flex-col h-full w-full bg-[#0f1a0f] items-center justify-center gap-3">
      <div className="w-9 h-9 border-2 border-[#2d7a2d] border-t-transparent rounded-full animate-spin" />
      <p className="text-white/50 text-sm">Loading seismic data...</p>
    </div>
  );

  if (error) return (
    <div className="flex h-full w-full bg-[#0f1a0f] items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-sm">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-[#2d7a2d] text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );

  if (communes.length === 0) return (
    <div className="flex h-full w-full bg-[#0f1a0f] items-center justify-center">
      <p className="text-white/50 text-sm">No data available</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#0f1a0f] text-white font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">Risk Building Map</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {filtered.length.toLocaleString()} communes · {totalBuildings.toLocaleString()} insured buildings
          </p>
        </div>

        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commune…"
            className="pl-8 pr-3 py-1.5 w-52 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#2d7a2d]/60"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 shrink-0 overflow-x-auto">
        {LEGEND.map(({ key, label }) => {
          const cfg = ZONE_CONFIG[key];
          const active = activeZones.has(key);
          const count  = stats[key]?.count ?? 0;
          return (
            <button
              key={key}
              onClick={() => toggleZone(key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 border
                ${active ? "text-white border-transparent" : "text-white/40 border-white/10 bg-transparent"}`}
              style={active ? { backgroundColor: cfg.color + "33", borderColor: cfg.color + "66" } : {}}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? cfg.color : "#555" }} />
              {label}
              {count > 0 && <span className={`ml-0.5 ${active ? "text-white/70" : "text-white/30"}`}>({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <MapInner
            communes={filtered}
            onSelect={setSelected}
            selectedCommune={selected}
          />
          <div className="absolute bottom-5 left-3 z-[1000] bg-[#0f1a0f]/90 backdrop-blur border border-white/10 rounded-xl px-3.5 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">Legend</p>
            {LEGEND.map(({ key, label, sublabel }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ZONE_CONFIG[key].color }} />
                <span className="text-xs text-white/60">{label} <span className="text-white/30">— {sublabel}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-64 border-l border-white/10 flex flex-col bg-[#111a11] shrink-0">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Selected Commune</p>
          </div>

          {selected ? (
            <div className="p-4 space-y-4 overflow-y-auto">
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: (ZONE_CONFIG[selected.Level]?.color ?? "#555") + "22" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ background: ZONE_CONFIG[selected.Level]?.color ?? "#555" }}
                >
                  {selected.Level?.replace("Zone ", "") ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{selected.COMMUNE}</p>
                  <p className="text-xs text-white/40">{selected.Level}</p>
                </div>
              </div>

              <div className="space-y-2">
                <InfoRow label="Seismic Level" value={selected.Level} />
                <InfoRow label="Insured Buildings" value={(selected.count || 0).toLocaleString()} />
                <InfoRow label="Policies" value={(selected.POLICE_LIST?.length || 0).toLocaleString()} />
                <InfoRow label="Coordinates" value={`${selected.lat?.toFixed(3)}, ${selected.lon?.toFixed(3)}`} />
              </div>

              <div>
                <p className="text-[10px] text-white/30 mb-1.5">Seismic Risk Level</p>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${((ZONE_CONFIG[selected.Level]?.score ?? 0) / 4) * 100}%`,
                      background: ZONE_CONFIG[selected.Level]?.color ?? "#555",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-5">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                  </svg>
                </div>
                <p className="text-xs text-white/25 leading-relaxed">Click on a marker<br/>to see details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <span className="text-xs text-white/35">{label}</span>
      <span className="text-xs text-white font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}