"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Zone color lookup
const ZONE_COLOR = {
  "Zone III":  "#ef4444",
  "Zone IIb":  "#f97316",
  "Zone IIa":  "#eab308",
  "Zone II":   "#eab308",
  "Zone I":    "#22c55e",
  "Zone 0":    "#3b82f6",
};

const getColor = (level) => ZONE_COLOR[level] ?? "#6b7280";

const getRadius = (level) => {
  if (level === "Zone III") return 13;
  if (level === "Zone IIb" || level === "Zone IIa") return 10;
  if (level === "Zone II") return 10;
  return 7;
};

/* ── Marker layer rendered imperatively with Leaflet ── */
function MarkerLayer({ communes, onSelect, selectedCommune }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !communes.length) {
      console.log("No map or no communes");
      return;
    }

    console.log("🎯 MarkerLayer rendering", communes.length, "communes");

    // Remove old layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Create cluster group
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction: (cluster) => {
        const children = cluster.getAllChildMarkers();
        const colorCounts = {};
        children.forEach(m => {
          const c = m.options._zoneColor || "#6b7280";
          colorCounts[c] = (colorCounts[c] || 0) + 1;
        });
        const dominant = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#6b7280";
        const n = cluster.getChildCount();
        const size = n > 100 ? 48 : n > 20 ? 40 : 32;

        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${dominant};
            border:2px solid rgba(255,255,255,0.6);
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:11px;font-weight:700;
            box-shadow:0 0 0 4px ${dominant}44;
          ">${n}</div>`,
          className: "",
          iconSize: [size, size],
        });
      },
    });

    // Add markers
    let markersAdded = 0;
    communes.forEach(item => {
      if (!item.lat || !item.lon) {
        console.warn("Missing coordinates for:", item.COMMUNE);
        return;
      }

      markersAdded++;
      const color = getColor(item.Level);
      const radius = getRadius(item.Level);
      const isSelected = selectedCommune?.COMMUNE === item.COMMUNE;

      const marker = L.circleMarker([item.lat, item.lon], {
        radius,
        fillColor: color,
        color: isSelected ? "#ffffff" : "rgba(255,255,255,0.5)",
        weight: isSelected ? 2.5 : 1,
        fillOpacity: 0.88,
        _zoneColor: color,
      });

      // Tooltip
      marker.bindTooltip(`
        <div style="
          background:#1a2e1a;
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          padding:8px 12px;
          color:white;
          font-family:sans-serif;
          font-size:12px;
          line-height:1.5;
          box-shadow:0 4px 20px rgba(0,0,0,0.5);
          min-width:140px;
        ">
          <strong>${item.COMMUNE}</strong><br/>
          <span style="color:${color}">${item.Level}</span><br/>
          ${item.count || 0} buildings
        </div>
      `, { permanent: false, direction: "top", offset: [0, -8] });

      marker.on("click", () => onSelect(item));
      marker.on("mouseover", function() {
        this.setStyle({ weight: 2.5, color: "#ffffff" });
      });
      marker.on("mouseout", function() {
        this.setStyle({ weight: isSelected ? 2.5 : 1, color: isSelected ? "#ffffff" : "rgba(255,255,255,0.5)" });
      });

      clusterGroup.addLayer(marker);
    });

    console.log(`✅ Added ${markersAdded} markers to the map`);

    map.addLayer(clusterGroup);
    layerRef.current = clusterGroup;

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [communes, onSelect, selectedCommune, map]);

  return null;
}

/* ══════════════════════════════════════════════════════════════════ */
export default function DangerBuildingMapInner({ communes, onSelect, selectedCommune }) {
  // Filter communes with valid coordinates
  const validCommunes = communes.filter(c => c.lat && c.lon);
  
  console.log("🗺️ Map inner received:", validCommunes.length, "communes with coordinates out of", communes.length);
  
  if (validCommunes.length === 0 && communes.length > 0) {
    console.warn("⚠️ Warning: No valid coordinates found in the data!");
    console.log("First commune sample:", communes[0]);
  }

  return (
    <MapContainer
      center={[28.0, 2.5]}
      zoom={5}
      style={{ height: "100%", width: "100%", background: "#0f1a0f" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <MarkerLayer
        communes={validCommunes}
        onSelect={onSelect}
        selectedCommune={selectedCommune}
      />
    </MapContainer>
  );
}