"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ZONE_COLORS = {
  4: "#ef4444",
  3: "#f97316",
  2: "#eab308",
  1: "#22c55e",
  0: "#3b82f6",
};

const getStyle = (score) => ({
  radius: score >= 3 ? 12 : score >= 2 ? 9 : 7,
  fillColor: ZONE_COLORS[score] ?? "#6b7280",
  color: "#ffffff",
  weight: 1.5,
  fillOpacity: 0.85,
});

function MapStyler() {
  const map = useMap();
  useEffect(() => {
    // Dark tile layer style fix
    const container = map.getContainer();
    container.style.background = "#0f1a0f";
  }, [map]);
  return null;
}

export default function GISMapInner({ data, onSelect }) {
  return (
    <MapContainer
      center={[28.0, 3.0]}
      zoom={5}
      style={{ height: "700px",width:"100%", background: "#0f1a0f" }}
      zoomControl={false}
    >
      <MapStyler />

      {/* Dark map tiles */}
      <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      <GeoJSON
        data={data}
        pointToLayer={(feature, latlng) => {
          const score = feature.properties.zone_score;
          const style = getStyle(score);
          const marker = L.circleMarker(latlng, style);

          // Pulse effect for high-risk zones
          if (score >= 3) {
            marker.on("add", () => {
              const el = marker.getElement();
              if (el) el.style.filter = "drop-shadow(0 0 6px " + ZONE_COLORS[score] + ")";
            });
          }

          marker.on("click", () => onSelect(feature.properties));
          marker.on("mouseover", function () {
            this.setStyle({ ...style, weight: 3, fillOpacity: 1 });
          });
          marker.on("mouseout", function () {
            this.setStyle(style);
          });

          marker.bindTooltip(
            `<div style="
              background:#1a2e1a;
              border:1px solid rgba(255,255,255,0.15);
              border-radius:8px;
            
              color:white;
              font-family:sans-serif;
              font-size:12px;
              line-height:1.5;
              box-shadow:0 4px 20px rgba(0,0,0,0.5);
            ">
              <strong style="font-size:13px">${feature.properties.Wilaya}</strong><br/>
              <span style="color:${ZONE_COLORS[score]}">${feature.properties.Level}</span>
            </div>`,
            {
              permanent: false,
              direction: "top",
              offset: [0, -8],
              className: "custom-tooltip",
              opacity: 1,
            }
          );

          return marker;
        }}
      />
    </MapContainer>
  );
}



