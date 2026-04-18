"use client";

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import AdminLayout from "./AdminLayout";

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const SeismicMap = () => {
  const [communeStats, setCommuneStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.0339, 1.6596]);
  const [mapZoom, setMapZoom] = useState(6);

  // Zone colors for highlighting
  const zoneColors = {
    'Zone III': { color: '#ef4444', fill: '#ef4444', label: 'Very High Risk' },
    'Zone IIb': { color: '#f97316', fill: '#f97316', label: 'High Risk' },
    'Zone IIa': { color: '#eab308', fill: '#eab308', label: 'Moderate Risk' },
    'Zone II': { color: '#eab308', fill: '#eab308', label: 'Moderate Risk' },
    'Zone I': { color: '#22c55e', fill: '#22c55e', label: 'Low Risk' },
    'Zone 0': { color: '#3b82f6', fill: '#3b82f6', label: 'Very Low Risk' },
  };

  // Fix for default marker icons
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  // Fetch and parse data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("https://nexoria-vq48.onrender.com/api/danger-building");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        
        if (jsonData?.rows?.[0]?.data) {
          const parsedData = JSON.parse(jsonData.rows[0].data);
          const communes = parsedData.data || [];
          setCommuneStats(communes);
          console.log(`Loaded ${communes.length} communes`);
        } else {
          throw new Error("Invalid data structure received from API");
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter by zone
  const filteredCommunes = selectedZone 
    ? communeStats.filter(item => item.Level === selectedZone && item.lat && item.lon)
    : communeStats.filter(item => item.lat && item.lon);

  // Get zone statistics
  const zoneStats = communeStats.reduce((acc, item) => {
    if (!acc[item.Level]) {
      acc[item.Level] = { count: 0, buildings: 0 };
    }
    acc[item.Level].count++;
    acc[item.Level].buildings += item.count || 0;
    return acc;
  }, {});

  // Handle zone click - zoom to show all communes in that zone
  const handleZoneClick = (zone) => {
    setSelectedZone(selectedZone === zone ? null : zone);
    
    // Calculate bounds for the selected zone
    const zoneCommunes = communeStats.filter(item => item.Level === zone && item.lat && item.lon);
    if (zoneCommunes.length > 0) {
      const lats = zoneCommunes.map(c => c.lat);
      const lons = zoneCommunes.map(c => c.lon);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
      setMapCenter([centerLat, centerLon]);
      setMapZoom(7);
    }
  };

  // Custom cluster icon - unfilled circle with border and text
  const createClusterIcon = (cluster) => {
    const children = cluster.getAllChildMarkers();
    const count = cluster.getChildCount();
    
    // Calculate dominant zone color from children
    const colorCounts = {};
    children.forEach(child => {
      const zone = child.options?.zone;
      if (zone && zoneColors[zone]) {
        colorCounts[zone] = (colorCounts[zone] || 0) + 1;
      }
    });
    
    let dominantColor = '#6b7280';
    let maxCount = 0;
    for (const [zone, cnt] of Object.entries(colorCounts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominantColor = zoneColors[zone]?.color || '#6b7280';
      }
    }
    
    // Size based on count
    let size = 40;
    if (count > 100) size = 56;
    else if (count > 50) size = 48;
    else if (count > 20) size = 44;
    else if (count > 10) size = 40;
    else size = 36;
    
    const fontSize = size > 40 ? 14 : 12;
    
    return L.divIcon({
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        border: 3px solid ${dominantColor};
        border-radius: 50%;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        font-weight: bold;
        color: ${dominantColor};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      popupAnchor: [0, -size/2]
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
            <p className="text-gray-600">Loading seismic data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error loading map data</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Seismic Risk Map - Algeria</h1>
          <p className="text-sm text-gray-500 mt-1">
            Distribution of insured buildings by seismic zone
          </p>
        </div>

        {/* Zone Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(zoneStats).map(([zone, stats]) => {
            const zoneColor = zoneColors[zone] || { color: '#6b7280', fill: '#6b7280' };
            const isSelected = selectedZone === zone;
            return (
              <button
                key={zone}
                onClick={() => handleZoneClick(zone)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isSelected 
                    ? 'border-4 shadow-lg transform scale-105' 
                    : 'border-gray-200 hover:shadow-md'
                }`}
                style={{ 
                  borderColor: isSelected ? zoneColor.color : '#e5e7eb',
                  backgroundColor: isSelected ? `${zoneColor.color}10` : 'white'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Zone</p>
                    <p className="text-sm font-bold" style={{ color: zoneColor.color }}>
                      {zone.replace('Zone ', '')}
                    </p>
                  </div>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${zoneColor.color}20` }}
                  >
                    <span className="text-xs font-bold" style={{ color: zoneColor.color }}>
                      {stats.count}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 truncate">
                  {zoneColors[zone]?.label || ''}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {stats.buildings.toLocaleString()} buildings
                </p>
              </button>
            );
          })}
        </div>

        {/* Map Container */}
        <div className="w-full h-150 rounded-lg overflow-hidden border border-slate-200 shadow-lg">
          <MapContainer 
            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* MarkerClusterGroup with custom unfilled circle icons */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              iconCreateFunction={createClusterIcon}
              showCoverageOnHover={false}
              spiderfyOnMaxZoom={true}
              animate={true}
            >
              {filteredCommunes.map((item, index) => {
                const zoneColor = zoneColors[item.Level] || { color: '#6b7280', fill: '#6b7280' };
                const radius = Math.min(15, Math.max(8, Math.sqrt(item.count || 10) * 1.5));
                
                return (
                  <CircleMarker
                    key={index}
                    center={[item.lat, item.lon]}
                    radius={radius}
                    fillColor={zoneColor.fill}
                    color="#ffffff"
                    weight={2}
                    fillOpacity={0.7}
                    options={{ zone: item.Level }}
                  >
                    <Popup className="font-sans">
                      <div className="text-sm">
                        <strong className="block text-lg border-b mb-1">{item.COMMUNE}</strong>
                        <span className="text-slate-600">Risk: {item.Level}</span><br/>
                        <span className="font-bold text-blue-600">{item.count || 0} buildings</span>
                        {item.POLICE_LIST && item.POLICE_LIST.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-xs text-gray-500">{item.POLICE_LIST.length} insurance policies</span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Legend</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(zoneColors).map(([zone, colors]) => (
              <div key={zone} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: colors.fill }}
                />
                <span className="text-xs text-gray-600">
                  {zone.replace('Zone ', 'Zone ')} - {colors.label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-500 bg-transparent"></div>
              <span className="text-xs text-gray-600">Cluster (unfilled circle)</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Total Communes</p>
            <p className="text-xl font-bold text-gray-900">{communeStats.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Total Buildings</p>
            <p className="text-xl font-bold text-gray-900">
              {communeStats.reduce((sum, c) => sum + (c.count || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-ƒxs text-gray-500">Active Filter</p>
            <p className="text-xl font-bold text-gray-900">
              {selectedZone ? selectedZone.replace('Zone ', '') : 'All'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Displayed</p>
            <p className="text-xl font-bold text-gray-900">{filteredCommunes.length}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SeismicMap;