"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Zone configuration
const ZONE_CONFIG = {
  4: { color: "#ef4444", label: "Zone III", ring: "#fca5a5", bg: "bg-red-500" },
  3: { color: "#f97316", label: "Zone IIb", ring: "#fdba74", bg: "bg-orange-500" },
  2: { color: "#eab308", label: "Zone IIa", ring: "#fde047", bg: "bg-yellow-500" },
  1: { color: "#22c55e", label: "Zone I", ring: "#86efac", bg: "bg-green-500" },
  0: { color: "#3b82f6", label: "Zone 0", ring: "#93c5fd", bg: "bg-blue-500" },
};

const LEGEND = [
  { score: 4, label: "Zone III — Very high seismicity" },
  { score: 3, label: "Zone IIb — High seismicity" },
  { score: 2, label: "Zone IIa — Moderate seismicity" },
  { score: 1, label: "Zone I — Low seismicity" },
  { score: 0, label: "Zone 0 — Very low seismicity" },
];

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import("./GISMapInner"), { ssr: false });

export default function GISMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch("https://nexoria-vq48.onrender.com/api/danger-zones")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        // Compute stats
        const counts = {};
        json.features.forEach((f) => {
          const s = f.properties.zone_score;
          counts[s] = (counts[s] || 0) + 1;
        });
        setStats(counts);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className=" h-full w-full bg-[#1a4a1a] font-sans text-white ">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Seismic Zones Map</h1>
          <p className="text-xs text-white/40 mt-0.5">Algeria — Danger Zones GeoJSON</p>
        </div>
        {data && (
          <div className="flex gap-3">
            {Object.entries(stats)
              .sort(([a], [b]) => b - a)
              .map(([score, count]) => {
                const cfg = ZONE_CONFIG[score];
                return (
                  <div key={score} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    <span className="text-xs text-white/70">{count}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex flex-1 overflow-hidden ">
        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1a0f] z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#2d7a2d] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Loading zones…</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1a0f] z-10">
              <p className="text-red-400 text-sm">Error: {error}</p>
            </div>
          )}
          {!loading && !error && data && (
            <MapComponent data={data} onSelect={setSelected} />
          )}

          {/* Legend */}
          <div className="absolute bottom-6 left-4 z-[1000] bg-[#0f1a0f]/90 backdrop-blur border border-white/10 rounded-xl px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Legend</p>
            {LEGEND.map(({ score, label }) => (
              <div key={score} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ZONE_CONFIG[score].color }} />
                <span className="text-xs text-white/70">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-72 border-l border-white/10 flex flex-col bg-[#2e4e2e]">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Details</p>
          </div>
          {selected ? (
            <div className="p-4 space-y-4">
              {/* Zone badge */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: ZONE_CONFIG[selected.zone_score]?.color + "22" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: ZONE_CONFIG[selected.zone_score]?.color }}
                >
                  {selected.zone_score}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selected.Level}</p>
                  <p className="text-xs text-white/50">{selected.Wilaya}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Row label="Wilaya" value={selected.Wilaya} />
                <Row label="Level" value={selected.Level} />
                <Row label="Score" value={`${selected.zone_score} / 4`} />
                <Row label="Classification" value={LEGEND.find(l => l.score === selected.zone_score)?.label?.split("—")[1]?.trim()} />
              </div>

              {/* Risk bar */}
              <div>
                <p className="text-xs text-white/40 mb-1.5">Risk level</p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(selected.zone_score / 4) * 100}%`,
                      background: ZONE_CONFIG[selected.zone_score]?.color,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-white/30">Low</span>
                  <span className="text-[10px] text-white/30">High</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
                  </svg>
                </div>
                <p className="text-xs text-white/30">Click on a point<br/>to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white font-medium">{value}</span>
    </div>
  );
}