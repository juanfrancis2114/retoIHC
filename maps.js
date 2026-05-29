/* ══════════════════════════════════════
   BusQuito – maps.js  (v7 – flujo por coordenadas)
   ══════════════════════════════════════ */

const ORS_KEY  = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQwNjZkYWNkOGNhNzQzMzRhNzU5MjcyOWM0OGNhNzIzIiwiaCI6Im11cm11cjY0In0=";
const ORS_BASE = "https://api.openrouteservice.org/v2/directions/foot-walking";

const QUITO_CENTER = [-0.2201, -78.5123];
const QUITO_ZOOM   = 13;

// ── Geocodificación inversa ────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es`,
      { headers: { "User-Agent": "BusQuito/3.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const street = a.road || a.pedestrian || a.path || "";
    const number = a.house_number ? ` ${a.house_number}` : "";
    const hood   = a.suburb || a.neighbourhood || a.quarter || a.city_district || "";
    if (street) return `${street}${number}${hood ? ", " + hood : ""}`;
    return data.display_name?.split(",").slice(0, 2).join(",").trim() || null;
  } catch { return null; }
}

// ── Geolocalización ────────────────────────────────────────
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Sin geolocalización")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000, maximumAge: 30000, enableHighAccuracy: true,
    });
  });
}

// ══════════════════════════════════════════════════════════
//  HELPER: crear mapa Leaflet
// ══════════════════════════════════════════════════════════
function createMap(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (APP.maps[containerId]) {
    try { APP.maps[containerId].remove(); } catch(e) {}
    delete APP.maps[containerId];
  }

  const m = L.map(container, {
    zoomControl: true,
    attributionControl: true,
    ...options,
  }).setView(QUITO_CENTER, QUITO_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© <a href='https://openstreetmap.org'>OSM</a>",
    maxZoom: 19,
  }).addTo(m);

  APP.maps[containerId] = m;
  return m;
}

function safeFitBounds(map, points, padding = [40, 40]) {
  if (!map || !points || points.length === 0) return;
  map.invalidateSize({ animate: false });
  if (points.length === 1) { map.setView(points[0], 15); return; }
  try {
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) map.fitBounds(bounds, { padding, maxZoom: 16, animate: false });
  } catch(e) {
    const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p[1], 0) / points.length;
    map.setView([avgLat, avgLng], 13);
  }
}

// ══════════════════════════════════════════════════════════
//  COORDENADAS DE PATH PARA EL MAPA
// ══════════════════════════════════════════════════════════
function getPathCoords(leg) {
  const route = leg.route;
  if (Array.isArray(route.path) && route.path.length >= 2) {
    const coords = trimToLeg(route.path, leg);
    if (coords.length >= 2) return coords;
  }
  return leg.stops
    .map(id => SECTOR_BY_ID[id])
    .filter(Boolean)
    .map(s => [s.lat, s.lng]);
}

function trimToLeg(path, leg) {
  const from = SECTOR_BY_ID[leg.stops[0]];
  const to   = SECTOR_BY_ID[leg.stops[leg.stops.length - 1]];
  if (!from || !to) return path;

  let si = 0, ei = path.length - 1, ds = Infinity, de = Infinity;
  path.forEach(([lat, lng], i) => {
    const d1 = haversineM(lat, lng, from.lat, from.lng);
    const d2 = haversineM(lat, lng, to.lat,   to.lng);
    if (d1 < ds) { ds = d1; si = i; }
    if (d2 < de) { de = d2; ei = i; }
  });
  if (si > ei) [si, ei] = [ei, si];
  const slice = path.slice(si, ei + 1);
  return slice.length >= 2 ? slice : path;
}

// ══════════════════════════════════════════════════════════
//  1. MAPA DE RESULTADOS  
//     Muestra todas las rutas encontradas, con origen y destino
// ══════════════════════════════════════════════════════════
function initResultsMap() {
  if (APP.maps["results-map"]) {
    try { APP.maps["results-map"].remove(); } catch(e) {}
    delete APP.maps["results-map"];
  }
  requestAnimationFrame(() => setTimeout(() => _buildResultsMap(), 100));
}

function _buildResultsMap() {
  const m = createMap("results-map");
  if (!m) return;

  const oLL = APP.originLatLng ? [APP.originLatLng.lat, APP.originLatLng.lng] : null;
  const dLL = APP.destLatLng   ? [APP.destLatLng.lat,   APP.destLatLng.lng]   : null;
  const allPoints = [];

  APP.results.forEach((result, idx) => {
    const isFirst = idx === 0;
    result.legs.forEach(leg => {
      const coords = getPathCoords(leg);
      if (coords.length > 1) {
        L.polyline(coords, {
          color:   leg.route.color || "#607D8B",
          weight:  isFirst ? 5 : 2.5,
          opacity: isFirst ? 0.9 : 0.35,
          lineJoin: "round",
          lineCap:  "round",
        }).addTo(m)
          .bindTooltip(`🚌 Línea ${leg.route.linea} – ${leg.route.empresa}`, { sticky: true });
        allPoints.push(...coords);
      }
    });
  });

  if (oLL) {
    addPinMarker(m, oLL, APP.originLabel || "Origen", "#27AE60");
    allPoints.push(oLL);
  }
  if (dLL) {
    addPinMarker(m, dLL, APP.destLabel || "Destino", "#FF6B2B");
    allPoints.push(dLL);
  }

  if (allPoints.length === 0) { m.setView(QUITO_CENTER, QUITO_ZOOM); return; }
  safeFitBounds(m, allPoints, [40, 40]);
}

// ══════════════════════════════════════════════════════════
//  2. MAPA DE DETALLE
//     Muestra la ruta seleccionada con caminatas
// ══════════════════════════════════════════════════════════
async function initDetailMap(result) {
  if (APP.maps["detail-map"]) {
    try { APP.maps["detail-map"].remove(); } catch(e) {}
    delete APP.maps["detail-map"];
  }

  reorganizeDetailLayout();
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)));

  const m = createMap("detail-map");
  if (!m) return;

  const oLL = APP.originLatLng ? [APP.originLatLng.lat, APP.originLatLng.lng] : null;
  const dLL = APP.destLatLng   ? [APP.destLatLng.lat,   APP.destLatLng.lng]   : null;

  const firstLeg = result.legs[0];
  const lastLeg  = result.legs[result.legs.length - 1];
  const firstStop = SECTOR_BY_ID[firstLeg.stops[0]];
  const lastStop  = SECTOR_BY_ID[lastLeg.stops[lastLeg.stops.length - 1]];

  const allPoints = [];
  const navSteps  = [];

  // Caminata al paradero de origen
  if (oLL && firstStop) {
    const walk = await getWalkPath(oLL, [firstStop.lat, firstStop.lng]);
    allPoints.push(...walk.coords);
    if (walk.coords.length > 1) {
      L.polyline(walk.coords, {
        color: "#27AE60", weight: 4, opacity: 0.85,
        dashArray: "10 7", lineJoin: "round",
      }).addTo(m).bindTooltip(`🚶 Caminar al paradero (${walk.distText})`, { sticky: true });
    }
    navSteps.push({
      icon: "🚶", color: "#27AE60",
      title: `Camina ${walk.distText} al paradero`,
      sub: `<strong>${firstStop.name}</strong>`,
      time: walk.timeText,
    });
  }

  // Segmentos de bus
  result.legs.forEach((leg, li) => {
    const coords   = getPathCoords(leg);
    const fromStop = SECTOR_BY_ID[leg.stops[0]];
    const toStop   = SECTOR_BY_ID[leg.stops[leg.stops.length - 1]];
    const nParadas = leg.stops.length - 1;

    allPoints.push(...coords);

    if (coords.length > 1) {
      L.polyline(coords, {
        color: leg.route.color || "#2A5F9E",
        weight: 6, opacity: 0.92, lineJoin: "round", lineCap: "round",
      }).addTo(m).bindTooltip(
        `🚌 Línea ${leg.route.linea} – ${leg.route.empresa}<br>${fromStop?.name || "—"} → ${toStop?.name || "—"}`,
        { sticky: true }
      );
    }

    leg.stops.forEach((id, i) => {
      const s = SECTOR_BY_ID[id];
      if (!s) return;
      const isEndpoint = i === 0 || i === leg.stops.length - 1;
      L.circleMarker([s.lat, s.lng], {
        radius: isEndpoint ? 7 : 4,
        color: "#fff", weight: isEndpoint ? 2.5 : 1.5,
        fillColor: leg.route.color || "#2A5F9E",
        fillOpacity: 1,
      }).addTo(m).bindTooltip(s.name, { direction: "top" });
    });

    navSteps.push({
      icon: "🚌", color: leg.route.color || "#2A5F9E",
      title: `Línea <span style="color:${leg.route.color};font-weight:800">${leg.route.linea}</span> – ${leg.route.empresa}`,
      sub: `${fromStop?.name || "—"} → ${toStop?.name || "—"} · ${nParadas} parada${nParadas !== 1 ? "s" : ""}`,
      time: `~${Math.max(3, nParadas * 2)} min`,
    });

    if (li < result.legs.length - 1 && toStop) {
      addTransferMarker(m, toStop);
      navSteps.push({
        icon: "🔄", color: "#F59E0B",
        title: `Transbordo en <strong>${toStop.name}</strong>`,
        sub: `Sube a línea <strong>${result.legs[li+1].route.linea}</strong>`,
        time: "~3 min",
      });
    }
  });

  // Caminata final al destino
  if (dLL && lastStop) {
    const walk2 = await getWalkPath([lastStop.lat, lastStop.lng], dLL);
    allPoints.push(...walk2.coords);
    if (walk2.coords.length > 1) {
      L.polyline(walk2.coords, {
        color: "#FF6B2B", weight: 4, opacity: 0.85,
        dashArray: "10 7", lineJoin: "round",
      }).addTo(m).bindTooltip(`🚶 Caminar al destino (${walk2.distText})`, { sticky: true });
    }
    navSteps.push({
      icon: "🏁", color: "#FF6B2B",
      title: `Camina ${walk2.distText} a tu destino`,
      sub: APP.destLabel || "Tu destino",
      time: walk2.timeText,
    });
  }

  if (oLL) { addPinMarker(m, oLL, APP.originLabel || "Inicio", "#27AE60"); allPoints.push(oLL); }
  if (dLL) { addPinMarker(m, dLL, APP.destLabel   || "Destino", "#FF6B2B"); allPoints.push(dLL); }

  safeFitBounds(m, allPoints, [50, 50]);
  renderNavPanel(navSteps, result);
}

function reorganizeDetailLayout() {
  const screenDetail = document.getElementById("screen-detail");
  if (!screenDetail || screenDetail.dataset.layoutDone) return;
  screenDetail.dataset.layoutDone = "1";

  const layout    = screenDetail.querySelector(".detail-layout");
  const sidebar   = screenDetail.querySelector(".detail-sidebar");
  const detailMap = document.getElementById("detail-map");
  const detailInfo = document.getElementById("detail-info");
  const detailTips = document.getElementById("detail-tips");

  if (!sidebar || !layout) return;

  const mapBlock = document.createElement("div");
  mapBlock.id = "detail-map-block";
  mapBlock.className = "detail-map-block";

  const navPanel = document.createElement("div");
  navPanel.id = "nav-panel";
  navPanel.className = "nav-panel";
  mapBlock.appendChild(navPanel);

  if (detailInfo) mapBlock.appendChild(detailInfo);
  if (detailMap)  mapBlock.appendChild(detailMap);

  const legend = document.createElement("div");
  legend.className = "detail-map-legend";
  legend.innerHTML = `
    <div class="dml-item"><div style="width:24px;border-top:3px dashed #27AE60;opacity:.8"></div>A pie (inicio)</div>
    <div class="dml-item"><div class="dml-line" style="background:#2A5F9E"></div>Recorrido del bus</div>
    <div class="dml-item"><div style="width:24px;border-top:3px dashed #FF6B2B;opacity:.8"></div>A pie (final)</div>`;
  mapBlock.appendChild(legend);

  if (detailTips) mapBlock.appendChild(detailTips);
  sidebar.replaceWith(mapBlock);
}

function renderNavPanel(steps, result) {
  const panel = document.getElementById("nav-panel");
  if (!panel) return;
  panel.innerHTML = `
    <div class="np-header">
      <div>
        <div class="np-title">🗺 Paso a paso</div>
        <div class="np-meta">~${result.estimatedMin} min · ${result.totalStops} paradas · ${result.legs.length} línea${result.legs.length !== 1 ? "s" : ""}</div>
      </div>
      <div class="np-badge ${result.type}">${result.type === "direct" ? "🟢 Directa" : "🔵 Transbordo"}</div>
    </div>
    <div class="np-steps">
      ${steps.map((s, i) => `
        <div class="np-step">
          <div class="np-step-icon" style="background:${s.color}20;border-color:${s.color}">${s.icon}</div>
          <div class="np-step-body">
            <div class="np-step-title">${s.title}</div>
            <div class="np-step-sub">${s.sub}</div>
          </div>
          <div class="np-step-time" style="color:${s.color}">${s.time}</div>
        </div>
        ${i < steps.length - 1 ? '<div class="np-connector"></div>' : ""}
      `).join("")}
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  HELPERS DE MAPA
// ══════════════════════════════════════════════════════════
function addPinMarker(map, latLng, label, color) {
  const letter = color === "#27AE60" ? "A" : "B";
  const icon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:38px">
      <div style="width:28px;height:28px;background:${color};border:3px solid white;
           border-radius:50%;box-shadow:0 3px 12px rgba(0,0,0,.4);display:flex;
           align-items:center;justify-content:center;color:white;font-size:13px;font-weight:800">
        ${letter}
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
           width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
           border-top:12px solid ${color}"></div>
    </div>`,
    iconSize: [28, 38], iconAnchor: [14, 38],
  });
  L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map)
    .bindTooltip(`<strong>${label}</strong>`, { direction: "top", offset: [0, -40] });
}

function addTransferMarker(map, sector) {
  const icon = L.divIcon({
    className: "",
    html: `<div style="background:#F59E0B;color:white;font-size:10px;font-weight:800;
                padding:3px 8px;border-radius:6px;border:2px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">🔄 Transbordo</div>`,
    iconAnchor: [40, 12],
  });
  L.marker([sector.lat, sector.lng], { icon, zIndexOffset: 500 }).addTo(map)
    .bindTooltip(sector.name, { direction: "top" });
}

function findNearestSector(lat, lng) {
  if (!SECTORS.length) return null;
  let nearest = null, minD = Infinity;
  const pool = SECTORS.filter(s => s.name !== "Parada" && s.name !== "Parada sintética");
  const src  = pool.length > 0 ? pool : SECTORS;
  src.forEach(s => {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (d < minD) { minD = d; nearest = s; }
  });
  return nearest;
}

async function getWalkPath(from, to) {
  const distM = haversineM(from[0], from[1], to[0], to[1]);
  const fallback = {
    coords:   [from, to],
    distText: distM < 1000 ? `${Math.round(distM)} m` : `${(distM/1000).toFixed(1)} km`,
    timeText: `~${Math.ceil(distM / 83)} min`,
  };

  if (distM < 30 || distM > 3000) return fallback;

  try {
    const res = await fetch(ORS_BASE, {
      method: "POST",
      headers: { "Authorization": ORS_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [[from[1], from[0]], [to[1], to[0]]] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback;
    const data  = await res.json();
    const route = data?.routes?.[0];
    if (!route) return fallback;
    const coords = decodePolyline(route.geometry);
    const d = route.summary?.distance || distM;
    const t = route.summary?.duration || (distM / 83 * 60);
    return {
      coords:   coords.length > 1 ? coords : fallback.coords,
      distText: d < 1000 ? `${Math.round(d)} m` : `${(d/1000).toFixed(1)} km`,
      timeText: `~${Math.ceil(t / 60)} min`,
    };
  } catch { return fallback; }
}

function decodePolyline(enc) {
  const coords = []; let i = 0, lat = 0, lng = 0;
  while (i < enc.length) {
    let b, s = 0, r = 0;
    do { b = enc.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lat += (r & 1) ? ~(r >> 1) : (r >> 1); s = r = 0;
    do { b = enc.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lng += (r & 1) ? ~(r >> 1) : (r >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
