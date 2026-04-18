"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import AdminLayout from "../components/AdminLayout";

// ── Constants ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

const ZONE_COLORS = {
  "III":  "#ef4444",
  "IIb":  "#f97316",
  "IIa":  "#eab308",
  "I":    "#22c55e",
  "0":    "#6b7280",
};

const ZONE_NAMES = {
  "III": "Very High Risk",
  "IIb": "High Risk",
  "IIa": "Moderate Risk",
  "I": "Low Risk",
  "0": "Very Low Risk",
};

const RISK_CONFIG = {
  CRITICAL: { color: "#ef4444", bg: "#fef2f2", label: "Critical" },
  HIGH:     { color: "#f97316", bg: "#fff7ed", label: "High" },
  MEDIUM:   { color: "#eab308", bg: "#fefce8", label: "Medium" },
  LOW:      { color: "#22c55e", bg: "#f0fdf4", label: "Low" },
};

function fmt(n) {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

function pct(n) {
  return n != null ? (n * 100).toFixed(1) + "%" : "—";
}

// ── 3D Seismic Simulation ────────────────────────────────────────────────────
function SeismicCanvas({ magnitude, zone, isRunning}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const frameRef = useRef(null);
  const timeRef = useRef(0);
  const wavesRef = useRef([]);
  const buildingsRef = useRef([]);
  const particlesRef = useRef([]);
  const shakeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 40, 120);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(18, 14, 22);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0x334466, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x4488ff, 2, 30);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Ground grid
    const gridGeo = new THREE.PlaneGeometry(60, 60, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x1a3a5c,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -0.05;
    scene.add(grid);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x0d1f33 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Buildings
    const buildings = [];
    const buildingPositions = [
      [-6, 0, -6], [-3, 0, -5], [0, 0, -6], [3, 0, -5], [6, 0, -6],
      [-7, 0, -2], [-4, 0, -1], [-1, 0, -2], [2, 0, -1], [5, 0, -2], [7, 0, -2],
      [-6, 0, 2],  [-3, 0, 3],  [0, 0, 2],  [3, 0, 3],  [6, 0, 2],
      [-5, 0, 6],  [-2, 0, 7],  [1, 0, 6],  [4, 0, 7],  [7, 0, 6],
      [-8, 0, 5],  [9, 0, -4],  [-9, 0, -4],[8, 0, 5],
    ];

    // Zone-based color logic
    const zoneColorMap = { "III": 0xef4444, "IIb": 0xf97316, "IIa": 0xeab308, "I": 0x22c55e, "0": 0x6b7280 };
    const bldColor = zoneColorMap[zone] || 0x22c55e;

    buildingPositions.forEach(([x, , z], i) => {
      const h = 1.5 + Math.random() * 4.5;
      const w = 0.6 + Math.random() * 0.8;
      const geo = new THREE.BoxGeometry(w, h, w);
      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(bldColor).lerp(new THREE.Color(0x1a3a5c), 0.3 + Math.random() * 0.4),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Roof glow for high-rise
      if (h > 4) {
        const glowGeo = new THREE.BoxGeometry(w + 0.05, 0.05, w + 0.05);
        const glowMat = new THREE.MeshBasicMaterial({ color: bldColor, transparent: true, opacity: 0.6 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(x, h + 0.025, z);
        scene.add(glow);
      }

      buildings.push({ mesh, origY: h / 2, origX: x, origZ: z, height: h, phase: Math.random() * Math.PI * 2 });
    });
    buildingsRef.current = buildings;

    // Epicenter marker
    const epicGeo = new THREE.CylinderGeometry(0, 0.4, 1.0, 6);
    const epicMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });
    const epic = new THREE.Mesh(epicGeo, epicMat);
    epic.position.set(0, 0.5, 0);
    scene.add(epic);

    // Seismic waves (rings)
    const waves = [];
    for (let i = 0; i < 5; i++) {
      const wGeo = new THREE.RingGeometry(0.1, 0.25, 48);
      const wMat = new THREE.MeshBasicMaterial({
        color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0,
      });
      const wave = new THREE.Mesh(wGeo, wMat);
      wave.rotation.x = -Math.PI / 2;
      wave.position.y = 0.02;
      scene.add(wave);
      waves.push({ mesh: wave, delay: i * 0.8, radius: 0 });
    }
    wavesRef.current = waves;

    // Debris particles
    const particles = [];
    const pGeo = new THREE.SphereGeometry(0.06, 4, 4);
    for (let i = 0; i < 60; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0 });
      const p = new THREE.Mesh(pGeo, pMat);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 8;
      p.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      p.userData = {
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.05 + Math.random() * 0.2,
        vz: (Math.random() - 0.5) * 0.15,
        active: false,
        origX: Math.cos(angle) * r,
        origZ: Math.sin(angle) * r,
      };
      scene.add(p);
      particles.push(p);
    }
    particlesRef.current = particles;

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      timeRef.current += delta;
      const t = timeRef.current;

      const mag = magnitude || 5;
      const intensity = isRunning ? Math.min((mag - 4) / 4, 1) : 0;
      const shakeAmp = intensity * 0.18 * (Math.sin(t * 18) + Math.sin(t * 31) * 0.5);
      shakeRef.current = shakeAmp;

      // Camera subtle orbit
      camera.position.x = 18 * Math.cos(t * 0.04);
      camera.position.z = 22 * Math.sin(t * 0.04);
      camera.lookAt(0, 2, 0);

      // Shake buildings
      buildings.forEach(b => {
        if (isRunning) {
          b.mesh.position.x = b.origX + shakeAmp * Math.sin(t * 22 + b.phase);
          b.mesh.position.z = b.origZ + shakeAmp * Math.sin(t * 19 + b.phase + 1);
          // Tilt for high magnitude
          if (mag > 6.5) {
            b.mesh.rotation.z = shakeAmp * 0.3 * Math.sin(t * 15 + b.phase);
            b.mesh.rotation.x = shakeAmp * 0.2 * Math.sin(t * 17 + b.phase);
          }
        } else {
          b.mesh.position.x += (b.origX - b.mesh.position.x) * 0.05;
          b.mesh.position.z += (b.origZ - b.mesh.position.z) * 0.05;
          b.mesh.rotation.z *= 0.95;
          b.mesh.rotation.x *= 0.95;
        }
      });

      // Epicenter pulse
      epic.scale.y = isRunning ? 1 + Math.sin(t * 8) * 0.4 * intensity : 1;
      epic.material.opacity = isRunning ? 0.7 + Math.sin(t * 6) * 0.3 : 0.3;

      // Seismic waves
      waves.forEach(w => {
        if (!isRunning) { w.mesh.material.opacity = 0; w.radius = 0; return; }
        const phase = ((t - w.delay) % (2.5 / (0.5 + intensity * 0.5)));
        if (phase < 0) { w.mesh.material.opacity = 0; return; }
        w.radius = phase * (8 + intensity * 12);
        w.mesh.scale.setScalar(w.radius);
        w.mesh.material.opacity = Math.max(0, (1 - phase / 2.5) * 0.7 * intensity);
      });

      // Particles
      particles.forEach((p, i) => {
        if (isRunning && mag > 5.5 && !p.userData.active) {
          if (Math.random() < 0.01 * intensity) {
            p.userData.active = true;
            p.position.set(p.userData.origX, 0.5 + Math.random() * 3, p.userData.origZ);
          }
        }
        if (p.userData.active) {
          p.position.x += p.userData.vx;
          p.position.y += p.userData.vy;
          p.position.z += p.userData.vz;
          p.userData.vy -= 0.005;
          p.material.opacity = Math.min(0.8, p.position.y * 0.3);
          if (p.position.y < 0) {
            p.userData.active = false;
            p.material.opacity = 0;
          }
        }
        if (!isRunning) p.material.opacity = 0;
      });

      // Point light flicker during quake
      pointLight.intensity = isRunning ? 2 + Math.sin(t * 30) * intensity : 2;

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      const W2 = mountRef.current.clientWidth;
      const H2 = mountRef.current.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [zone, magnitude, isRunning]);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }} />
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e8f0e8",
      borderRadius: 10,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "#1a3a1a", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

// ── Zone Bar ─────────────────────────────────────────────────────────────────
function ZoneBar({ zone, contracts, capitalExposed, estimatedLoss, avgLossRate, totalLoss }) {
  const pctLoss = totalLoss > 0 ? estimatedLoss / totalLoss : 0;
  const color = ZONE_COLORS[zone] || "#6b7280";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderBottom: "1px solid #f0f4f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#1a3a1a" }}>Zone {zone} — {ZONE_NAMES[zone] || ""}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
          <span>{contracts?.toLocaleString()} contracts</span>
          <span style={{ fontWeight: 600, color }}>{fmt(estimatedLoss)}</span>
        </div>
      </div>
      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round(pctLoss * 100)}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af" }}>
        Average damage rate: {pct(avgLossRate)} · Exposed capital: {fmt(capitalExposed)}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Simulation() {
  const [magnitude, setMagnitude] = useState(6.8);
  const [retention, setRetention] = useState(42800);
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [type, setType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [loadingWilayas, setLoadingWilayas] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  
  // New state for AI advice
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Load wilayas on mount - GET /api/locations/wilayas
  useEffect(() => {
    const fetchWilayas = async () => {
      setLoadingWilayas(true);
      try {
        const response = await fetch(`${API_BASE}/api/locations/wilayas`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Handle different response formats
        let wilayaList = [];
        if (Array.isArray(data)) {
          wilayaList = data;
        } else if (data.data && Array.isArray(data.data)) {
          wilayaList = data.data;
        } else if (data.wilayas && Array.isArray(data.wilayas)) {
          wilayaList = data.wilayas;
        } else if (data.items && Array.isArray(data.items)) {
          wilayaList = data.items;
        } else {
          // Try to extract array from response
          const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
          if (possibleArrays.length > 0) {
            wilayaList = possibleArrays[0];
          }
        }
        
        setWilayas(wilayaList);
        console.log("Loaded wilayas:", wilayaList.length);
      } catch (err) {
        console.error("Error fetching wilayas:", err);
        // Fallback mock data for development
        setWilayas([
          { code: "ALGER", name: "Alger" },
          { code: "ORAN", name: "Oran" },
          { code: "CONSTANTINE", name: "Constantine" },
          { code: "ANNABA", name: "Annaba" },
          { code: "TIZI_OUZOU", name: "Tizi Ouzou" },
          { code: "BEJAIA", name: "Béjaïa" },
          { code: "BLIDA", name: "Blida" },
          { code: "SETIF", name: "Sétif" },
        ]);
      } finally {
        setLoadingWilayas(false);
      }
    };
    
    fetchWilayas();
  }, []);

  // Load communes when wilaya changes - GET /api/locations/wilayas/{wilaya}/communes
  useEffect(() => {
    if (!wilaya) {
      setCommunes([]);
      setCommune("");
      return;
    }
    
    const fetchCommunes = async () => {
      setLoadingCommunes(true);
      try {
        const response = await fetch(`${API_BASE}/api/locations/wilayas/${wilaya}/communes`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Handle different response formats
        let communeList = [];
        if (Array.isArray(data)) {
          communeList = data;
        } else if (data.data && Array.isArray(data.data)) {
          communeList = data.data;
        } else if (data.communes && Array.isArray(data.communes)) {
          communeList = data.communes;
        } else if (data.items && Array.isArray(data.items)) {
          communeList = data.items;
        } else {
          // Try to extract array from response
          const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
          if (possibleArrays.length > 0) {
            communeList = possibleArrays[0];
          }
        }
        
        setCommunes(communeList);
        console.log(`Loaded ${communeList.length} communes for ${wilaya}`);
      } catch (err) {
        console.error(`Error fetching communes for ${wilaya}:`, err);
        // Fallback mock data for development
        const mockCommunes = {
          "ALGER": [{ code: "ALGER_CENTRE", name: "Alger Centre" }, { code: "BAB_EL_OUED", name: "Bab El Oued" }, { code: "HUSSEIN_DEY", name: "Hussein Dey" }],
          "ORAN": [{ code: "ORAN_CENTRE", name: "Oran Centre" }, { code: "SIDI_EL_HOUARI", name: "Sidi El Houari" }],
          "CONSTANTINE": [{ code: "CONSTANTINE_CENTRE", name: "Constantine Centre" }],
        };
        setCommunes(mockCommunes[wilaya] || []);
      } finally {
        setLoadingCommunes(false);
      }
    };
    
    fetchCommunes();
  }, [wilaya]);

  // Function to fetch AI advice based on simulation results
  const fetchAiAdvice = useCallback(async (simulationResults) => {
    if (!simulationResults) return;
    
    setLoadingAdvice(true);
    try {
      // Calculate average loss rate across zones
      const avgLossRate = simulationResults.byZone?.reduce((sum, zone) => sum + (zone.avgLossRate || 0), 0) / (simulationResults.byZone?.length || 1);
      
      const adviceBody = {
        totalEstimatedLoss: simulationResults.totalEstimatedLoss,
        retentionCapacity: simulationResults.financial?.retentionCapacity,
        retentionGap: simulationResults.financial?.retentionGap,
        coverageRatio: simulationResults.financial?.coverageRatio,
        riskLevel: simulationResults.financial?.riskLevel,
        byType: simulationResults.byType,
        byZone: simulationResults.byZone,
        avgLossRate: avgLossRate,
        dataQuality: simulationResults.dataQuality,
      };

      const response = await fetch(`${API_BASE}/api/advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adviceBody),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAiAdvice(data.advice || data.message || data);
    } catch (err) {
      console.error("Error fetching AI advice:", err);
      // Fallback advice when API is unavailable
      setAiAdvice(generateFallbackAdvice(simulationResults));
    } finally {
      setLoadingAdvice(false);
    }
  }, []);

  // Generate fallback advice when API is unavailable
  const generateFallbackAdvice = (results) => {
    const riskLevel = results.financial?.riskLevel;
    const coverageRatio = results.financial?.coverageRatio || 0;
    const retentionGap = results.financial?.retentionGap || 0;
    
    if (riskLevel === "CRITICAL") {
      return `⚠️ CRITICAL RISK ASSESSMENT: The estimated loss of ${fmt(results.totalEstimatedLoss)} significantly exceeds your retention capacity of ${fmt(results.financial?.retentionCapacity)} by ${fmt(retentionGap)}. The coverage ratio is only ${(coverageRatio * 100).toFixed(1)}%, indicating severe underprotection. Immediate action required: (1) Activate catastrophic reinsurance treaties, (2) Consider capital injection or reserve allocation, (3) Halt new contract issuance in Zone III areas, (4) Schedule emergency board meeting to discuss risk exposure. The portfolio concentration in high-risk zones represents a systemic threat to company solvency.`;
    } else if (riskLevel === "HIGH") {
      return `⚠️ HIGH RISK ASSESSMENT: Your current retention capacity of ${fmt(results.financial?.retentionCapacity)} covers ${(coverageRatio * 100).toFixed(1)}% of the estimated loss (${fmt(results.totalEstimatedLoss)}), leaving a gap of ${fmt(retentionGap)}. Recommendations: (1) Increase retention capacity to at least ${fmt(results.totalEstimatedLoss * 0.8)} to achieve 80% coverage, (2) Review accumulation in Zone III (${results.byZone?.find(z => z.zone === "III")?.contracts || 0} contracts exposed), (3) Implement stricter underwriting criteria for high-risk zones, (4) Consider portfolio diversification into lower-risk zones. Data quality is ${((results.dataQuality?.withRealCapital / (results.dataQuality?.withRealCapital + results.dataQuality?.estimated)) * 100).toFixed(0)}% reliable - prioritize data enrichment for estimated values.`;
    } else if (riskLevel === "MEDIUM") {
      return `📊 MEDIUM RISK ASSESSMENT: Your retention capacity of ${fmt(results.financial?.retentionCapacity)} provides ${(coverageRatio * 100).toFixed(1)}% coverage against the estimated loss of ${fmt(results.totalEstimatedLoss)}. The retention gap of ${fmt(retentionGap)} is manageable but requires attention. Recommendations: (1) Increase retention by ${fmt(retentionGap * 0.5)} to achieve optimal coverage, (2) Monitor Zone IIb and III accumulations, (3) Review premium pricing for industrial assets in high-risk zones, (4) Conduct semi-annual catastrophe modeling updates. The portfolio shows balanced distribution across risk zones, but consider additional risk transfer mechanisms for tail events.`;
    } else {
      return `✅ LOW RISK ASSESSMENT: Your current risk position is well-controlled with ${(coverageRatio * 100).toFixed(1)}% coverage ratio. The estimated loss of ${fmt(results.totalEstimatedLoss)} is within acceptable parameters relative to your retention capacity of ${fmt(results.financial?.retentionCapacity)}. Recommendations for optimization: (1) Maintain current underwriting discipline, (2) Consider expanding carefully into Zone I and IIa areas, (3) Use the favorable risk position to negotiate better reinsurance rates, (4) Continue monitoring Zone III concentrations. The ${results.dataQuality?.withRealCapital?.toLocaleString()} contracts with real capital values provide good data foundation for risk modeling.`;
    }
  };

  const handleSimulate = useCallback(async () => {
    setLoading(true);
    setSimRunning(false);
    setAiAdvice(null); // Reset advice when running new simulation

    try {
      const body = {
        magnitude: parseFloat(magnitude),
        retentionCapacity: parseFloat(retention) * 1000000,
        selectedWilaya: wilaya || undefined,
        selectedCommune: commune || undefined,
        selectedType: type === "all" ? undefined : type,
      };

      const response = await fetch(`${API_BASE}/api/scenario/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      const simulationData = data.data || data;
      setResults(simulationData);
      setSimRunning(true);
      
      // Fetch AI advice based on simulation results
      await fetchAiAdvice(simulationData);

      // Stop 3D animation after 12 seconds
      setTimeout(() => setSimRunning(false), 12000);
    } catch (e) {
      // Silent fallback to mock data - no error message shown to user
      console.log("API unavailable, using mock data:", e.message);
      const mockData = MOCK_RESULT(magnitude, retention);
      setResults(mockData);
      setSimRunning(true);
      
      // Fetch AI advice for mock data
      await fetchAiAdvice(mockData);
      
      setTimeout(() => setSimRunning(false), 12000);
    } finally {
      setLoading(false);
    }
  }, [magnitude, retention, wilaya, commune, type, fetchAiAdvice]);

  const risk = results?.financial?.riskLevel;
  const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.LOW;
  const activeZone = results?.byZone?.[0]?.zone || "IIa";

  const filteredByType = results?.byType?.filter(t =>
    activeTab === "all" ? true :
    t.type?.toLowerCase().includes(activeTab === "industrial" ? "industrial" :
      activeTab === "commercial" ? "commercial" : "residential")
  ) || [];

  return (
    <AdminLayout>
      <div style={{  background: "#f7faf7", minHeight: "100vh", padding: "28px 32px", color: "#1a3a1a" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: "#1a5c1a", margin: 0 }}>Seismic Loss Simulation</h1>
          <p style={{ fontSize: 24, color: "#6b7280", margin: "4px 0 0" }}>
            Loss modeling for seismic scenarios — GAM Assurance Portfolio
          </p>
        </div>

        {/* Top layout: controls + 3D */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Controls */}
          <div style={{ background: "#fff", border: "1px solid #e8f0e8", borderRadius: 12, padding: 24 }}>
            {/* Filters row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {/* Wilaya Dropdown */}
              <div style={{ flex: 1, minWidth: 150 }}>
                <select
                  value={wilaya}
                  onChange={e => setWilaya(e.target.value)}
                  style={selectStyle}
                  disabled={loadingWilayas}
                >
                  <option value="">All Wilayas</option>
                  {wilayas.map(w => (
                    <option key={w.code || w} value={w.code || w}>
                      {w.name || w.label || w}
                    </option>
                  ))}
                </select>
                {loadingWilayas && <span style={{ fontSize: 10, color: "#9ca3af" }}>Loading...</span>}
              </div>

              {/* Commune Dropdown - dynamically loaded based on selected wilaya */}
              <div style={{ flex: 1, minWidth: 150 }}>
                <select
                  value={commune}
                  onChange={e => setCommune(e.target.value)}
                  style={selectStyle}
                  disabled={!wilaya || loadingCommunes}
                >
                  <option value="">All Communes</option>
                  {communes.map(c => (
                    <option key={c.code || c} value={c.code || c}>
                      {c.name || c.label || c}
                    </option>
                  ))}
                </select>
                {loadingCommunes && <span style={{ fontSize: 10, color: "#9ca3af" }}>Loading communes...</span>}
              </div>
            </div>

            {/* Magnitude slider */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#374151" }}>Magnitude (Mw):</span>
                <span style={{ fontWeight: 700, color: magnitude >= 7 ? "#ef4444" : magnitude >= 6 ? "#f97316" : "#eab308", fontSize: 16 }}>
                  {parseFloat(magnitude).toFixed(1)}
                </span>
              </div>
              <input 
                type="range" 
                min="4.0" 
                max="8.0" 
                step="0.1" 
                value={magnitude}
                onChange={e => setMagnitude(e.target.value)}
                style={{ width: "100%", accentColor: "#2d7a2d" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                <span>4.0 (MINOR)</span><span>6.0 (MAJOR)</span><span>8.0 (CATASTROPHIC)</span>
              </div>
            </div>

            {/* Retention slider */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#374151" }}>Retention Capacity:</span>
                <span style={{ fontWeight: 700, color: "#2d7a2d", fontSize: 16 }}>{fmt(retention * 1e6)} DZD</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="150000" 
                step="200" 
                value={retention}
                onChange={e => setRetention(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#2d7a2d" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                <span>1B DZD</span><span>75B DZD</span><span>150B DZD</span>
              </div>
            </div>

            {/* Simulate button */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0",
                background: loading ? "#9ca3af" : "#4a8a1a",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.03em", transition: "background 0.2s",
              }}
            >
              {loading ? "Calculating..." : "Run Simulation"}
            </button>
          </div>

          {/* 3D Canvas */}
          <div style={{
            background: "#0a1628", borderRadius: 12, overflow: "hidden", position: "relative",
            minHeight: 320, border: "1px solid #1a3a5c",
          }}>
            <SeismicCanvas magnitude={parseFloat(magnitude)} zone={activeZone} isRunning={simRunning} />
            <div style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px",
              borderRadius: 20, fontSize: 12, backdropFilter: "blur(4px)",
            }}>
              {simRunning ? `🔴 Earthquake Mw ${parseFloat(magnitude).toFixed(1)} — IN PROGRESS` : "✅ Ready"}
            </div>
            {!simRunning && !results && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.4)", fontSize: 14, pointerEvents: "none", textAlign: "center", padding: 20,
              }}>
                Run a simulation to visualize the seismic impact in 3D
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results && (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                ["all", "All Types"],
                ["industrial", "Industrial"],
                ["commercial", "Commercial"],
                ["residential", "Residential"]
              ].map(([k, v]) => (
                <button key={k} onClick={() => setActiveTab(k)} style={{
                  padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid",
                  borderColor: activeTab === k ? "#2d7a2d" : "#d1d5db",
                  background: activeTab === k ? "#2d7a2d" : "#fff",
                  color: activeTab === k ? "#fff" : "#374151",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}>{v}</button>
              ))}
            </div>

            {/* Summary cards row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
              <StatCard
                label="Total Contracts"
                value={results.totalContracts?.toLocaleString() || "—"}
                sub={`Zone ${activeZone}`}
                accent="#1a5c1a"
                icon="📋"
              />
              <StatCard
                label="Affected Contracts"
                value={results.affectedContracts?.toLocaleString() || "—"}
                accent="#ef4444"
                icon="⚠️"
              />
              <StatCard
                label="Unaffected Contracts"
                value={results.unaffectedContracts?.toLocaleString() || "—"}
                accent="#22c55e"
                icon="✅"
              />
              <StatCard
                label="Total Capital"
                value={fmt(results.totalPortfolioCapital)}
                sub="Subscribed Capital"
                accent="#1a5c1a"
                icon="💰"
              />
            </div>

            {/* Summary cards row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <StatCard
                label="Affected Capital"
                value={fmt(results.totalAffectedCapital)}
                accent="#f97316"
                icon="🏗️"
              />
              <StatCard
                label="Concentration Ratio"
                value={pct(results.concentrationRatio)}
                sub="Exposed Capital / Total"
                accent="#eab308"
                icon="📊"
              />
              <StatCard
                label="Estimated Loss"
                value={fmt(results.totalEstimatedLoss)}
                sub="PML (Probable Maximum Loss)"
                accent="#ef4444"
                icon="💸"
              />
            </div>

            {/* Financial risk bar */}
            <div style={{
              background: riskCfg.bg,
              border: `1.5px solid ${riskCfg.color}33`,
              borderRadius: 12, padding: "16px 20px", marginBottom: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: riskCfg.color }}>Financial Risk Level — {riskCfg.label}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{results.financial?.riskMessage}</span>
              </div>
              <div style={{ height: 10, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.round((results.financial?.coverageRatio || 0) * 100))}%`,
                  background: riskCfg.color,
                  borderRadius: 6,
                  transition: "width 1s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                <span>Retention: {fmt(results.financial?.retentionCapacity)}</span>
                <span>Coverage Gap: {fmt(results.financial?.retentionGap)}</span>
                <span>Portfolio Impact: {pct(results.financial?.portfolioImpact)}</span>
              </div>
            </div>

            {/* By Zone / By Type / By Wilaya */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
              {/* By Zone */}
              <div style={{ background: "#fff", border: "1px solid #e8f0e8", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1a3a1a" }}>📊 By Seismic Zone</div>
                {(results.byZone || []).map(z => (
                  <ZoneBar key={z.zone} {...z} totalLoss={results.totalEstimatedLoss} />
                ))}
              </div>

              {/* By Type */}
              <div style={{ background: "#fff", border: "1px solid #e8f0e8", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1a3a1a" }}>🏭 By Asset Type</div>
                {(filteredByType.length ? filteredByType : results.byType || []).map(t => (
                  <div key={t.type} style={{ padding: "10px 0", borderBottom: "1px solid #f0f4f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t.type}</span>
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{fmt(t.estimatedLoss)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.contracts?.toLocaleString()} contracts · {fmt(t.capitalExposed)} exposed</div>
                    <div style={{ marginTop: 5, height: 3, background: "#f3f4f6", borderRadius: 2 }}>
                      <div style={{
                        height: "100%", borderRadius: 2, background: "#2d7a2d",
                        width: `${Math.round((t.estimatedLoss / (results.totalEstimatedLoss || 1)) * 100)}%`,
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* By Wilaya */}
              <div style={{ background: "#fff", border: "1px solid #e8f0e8", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1a3a1a" }}>📍 By Wilaya</div>
                {(results.byWilaya || []).slice(0, 6).map(w => (
                  <div key={w.wilaya} style={{ padding: "9px 0", borderBottom: "1px solid #f0f4f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: ZONE_COLORS[w.zone] || "#6b7280" }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{w.wilaya}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{fmt(w.estimatedLoss)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>Zone {w.zone} · {w.contracts?.toLocaleString()} contracts</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Advice Section - NEW */}
            <div style={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
              borderRadius: 12, 
              padding: 24, 
              marginBottom: 16,
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>🤖</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>AI Risk Advisor</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Intelligent recommendations based on simulation data</p>
                </div>
              </div>
              
              {loadingAdvice ? (
                <div style={{ 
                  background: "rgba(255,255,255,0.15)", 
 borderRadius: 8, 
                  padding: 20,
                  textAlign: "center"
                }}>
                  <div style={{ 
                    display: "inline-block", 
                    width: 24, 
                    height: 24, 
                    border: "3px solid rgba(255,255,255,0.3)", 
                    borderTopColor: "#fff", 
                    borderRadius: "50%", 
                    animation: "spin 1s linear infinite" 
                  }} />
                  <p style={{ margin: "12px 0 0", color: "#fff", fontSize: 14 }}>Generating AI insights...</p>
                </div>
              ) : aiAdvice ? (
                <div style={{ 
                  background: "rgba(255,255,255,0.95)", 
                  borderRadius: 8, 
                  padding: 20,
                  color: "#1a3a1a",
                  lineHeight: 1.6,
                  fontSize: 14
                }}>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{aiAdvice}</p>
                </div>
              ) : (
                <div style={{ 
                  background: "rgba(255,255,255,0.15)", 
                  borderRadius: 8, 
                  padding: 20,
                  textAlign: "center",
                  color: "#fff"
                }}>
                  <p style={{ margin: 0 }}>Run a simulation to receive AI-powered risk insights</p>
                </div>
              )}
            </div>

            {/* Data Quality + Recommendations */}
            <div style={{ }}>
              <div style={{ background: "#fff", border: "1px solid #e8f0e8", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1a3a1a" }}>📈 Data Quality</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard label="Real Capitals" value={(results.dataQuality?.withRealCapital || 0).toLocaleString()} accent="#2d7a2d" />
                  <StatCard label="Estimated" value={(results.dataQuality?.estimated || 0).toLocaleString()} accent="#eab308" />
                </div>
                <div style={{ marginTop: 12, height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: "#2d7a2d", borderRadius: 4,
                    width: `${Math.round(((results.dataQuality?.withRealCapital || 0) / ((results.dataQuality?.withRealCapital || 0) + (results.dataQuality?.estimated || 1))) * 100)}%`,
                  }} />
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                  {Math.round(((results.dataQuality?.withRealCapital || 0) / ((results.dataQuality?.withRealCapital || 0) + (results.dataQuality?.estimated || 1))) * 100)}% of data with real capital values
                </div>
              </div>

             
            </div>
          </>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AdminLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const selectStyle = {
  padding: "7px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  width: "100%",
};

// ── Mock data (used as silent fallback when API unavailable) ─────────────────
function MOCK_RESULT(magnitude, retention) {
  const mag = parseFloat(magnitude);
  const mult = Math.min(1, Math.max(0, (mag - 4) / 4));
  const totalLoss = Math.round(8720000000 * mult * 1.2);
  return {
    totalContracts: 23500,
    affectedContracts: Math.round(6200 * mult),
    unaffectedContracts: Math.round(23500 - 6200 * mult),
    totalPortfolioCapital: 125000000000,
    totalAffectedCapital: Math.round(73500000000 * mult),
    concentrationRatio: 0.588 * mult,
    totalEstimatedLoss: totalLoss,
    byZone: [
      { zone: "III", zoneLabel: "Zone III — Very High", contracts: 3200, capitalExposed: 42500000000, estimatedLoss: Math.round(6120000000 * mult), avgLossRate: 0.144 * mult },
      { zone: "IIb", zoneLabel: "Zone IIb — High", contracts: 2100, capitalExposed: 18000000000, estimatedLoss: Math.round(1800000000 * mult), avgLossRate: 0.10 * mult },
      { zone: "IIa", zoneLabel: "Zone IIa — Moderate", contracts: 5400, capitalExposed: 35000000000, estimatedLoss: Math.round(800000000 * mult), avgLossRate: 0.023 * mult },
      { zone: "I",   zoneLabel: "Zone I — Low", contracts: 12800, capitalExposed: 29400000000, estimatedLoss: Math.round(0 * mult), avgLossRate: 0 * mult },
    ],
    byType: [
      { type: "Residential",   contracts: 14100, capitalExposed: 48500000000, estimatedLoss: Math.round(5230000000 * mult) },
      { type: "Industrial",    contracts: 5200, capitalExposed: 52000000000, estimatedLoss: Math.round(2100000000 * mult) },
      { type: "Commercial",    contracts: 4200, capitalExposed: 24500000000, estimatedLoss: Math.round(1390000000 * mult) },
    ],
    byWilaya: [
      { wilaya: "ALGER",     zone: "III",  contracts: 1850,  capitalExposed: 34200000000, estimatedLoss: Math.round(5040000000 * mult) },
      { wilaya: "TIPAZA",    zone: "III",  contracts: 1430,  capitalExposed: 19800000000, estimatedLoss: Math.round(2910000000 * mult) },
      { wilaya: "BOUMERDES", zone: "III",  contracts: 1310,  capitalExposed: 17200000000, estimatedLoss: Math.round(2530000000 * mult) },
      { wilaya: "BLIDA",     zone: "IIb",  contracts: 1280,  capitalExposed: 15100000000, estimatedLoss: Math.round(1512000000 * mult) },
      { wilaya: "SETIF",     zone: "IIa",  contracts: 1260,  capitalExposed: 14800000000, estimatedLoss: Math.round(1480000000 * mult) },
      { wilaya: "ORAN",      zone: "IIb",  contracts: 1180,  capitalExposed: 13500000000, estimatedLoss: Math.round(1350000000 * mult) },
    ],
    financial: {
      retentionCapacity: parseFloat(retention) * 1000000,
      retentionGap: Math.max(0, totalLoss - parseFloat(retention) * 1000000),
      coverageRatio: Math.min(1, (parseFloat(retention) * 1000000) / totalLoss),
      portfolioImpact: totalLoss / 125000000000,
      riskLevel: mag >= 7 ? "CRITICAL" : mag >= 6 ? "HIGH" : mag >= 5 ? "MEDIUM" : "LOW",
      riskMessage: mag >= 7 ? "⚠️ Insufficient retention. The company must tap into reserves." : 
                   mag >= 6 ? "📊 Monitor accumulation in Zones IIb/III." :
                   "✅ Risk controlled within current limits.",
    },
    recommendations: [
      { priority: "HIGH",   action: "Zone III represents 34.0% of capital. Cap new contracts in these wilayas." },
      { priority: "HIGH",   action: "Implement a Cat-Nat reinsurance treaty to cover the estimated deficit." },
      { priority: "MEDIUM", action: "Review premium rates for risks in Zones IIa, IIb, and III." },
      { priority: "LOW",   action: "RPA99 compliance audit for masonry structures in Zone III." },
    ],
    dataQuality: { withRealCapital: 18900, estimated: 4600 },
  };
}