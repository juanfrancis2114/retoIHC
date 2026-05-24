/* ══════════════════════════════════════
   BusQuito – maps.js  (v5 – CORREGIDO)
   
   FIXES PRINCIPALES:
   1. initResultsMap: invalidateSize() + setTimeout para que el
      mapa se inicialice DESPUÉS de que el contenedor sea visible
   2. fitBounds con padding correcto y fallback robusto
   3. Marcadores de origen/destino siempre visibles
   4. Panel de navegación (caminar + bus + caminar) mejorado
   5. Geolocalización con reverseGeocode real
   ══════════════════════════════════════ */

const ORS_KEY  = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQwNjZkYWNkOGNhNzQzMzRhNzU5MjcyOWM0OGNhNzIzIiwiaCI6Im11cm11cjY0In0=";
const ORS_BASE = "https://api.openrouteservice.org/v2/directions/foot-walking";

// Centro de Quito como fallback
const QUITO_CENTER = [-0.2201, -78.5123];
const QUITO_ZOOM   = 12;

// ── Geocodificación inversa ────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es`,
      { headers: { "User-Agent": "BusQuito/2.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a    = data.address || {};
    const street = a.road || a.pedestrian || a.path || "";
    const number = a.house_number ? ` ${a.house_number}` : "";
    const hood   = a.suburb || a.neighbourhood || a.quarter || a.city_district || "";
    if (street) return `${street}${number}${hood ? ", " + hood : ""}`;
    return data.display_name?.split(",").slice(0,2).join(",").trim() || null;
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

// ── Botones "Usar mi ubicación" ────────────────────────────
function initGeolocButtons() {
  const fieldOrigin = document.getElementById("field-origin");
  const fieldDest   = document.getElementById("field-dest");
  if (!fieldOrigin || !fieldDest) return;

  function makeBtn(id, ariaLabel, field) {
    if (document.getElementById(id)) return;
    const btn = document.createElement("button");
    btn.id = id;
    btn.className = "geoloc-btn";
    btn.setAttribute("aria-label", ariaLabel);
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3" fill="currentColor"/>
      <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.8"/>
      <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg> Mi ubicación`;
    const wrap = (field === "origin" ? fieldOrigin : fieldDest).querySelector(".sf-input-wrap");
    if (wrap) wrap.after(btn);
    btn.addEventListener("click", () => geolocateField(field));
  }

  makeBtn("btn-geolocate-origin", "Usar mi ubicación como origen", "origin");
  makeBtn("btn-geolocate-dest",   "Usar mi ubicación como destino", "dest");
}

async function geolocateField(field) {
  const btnId = field === "origin" ? "btn-geolocate-origin" : "btn-geolocate-dest";
  const inp   = document.getElementById(field === "origin" ? "input-origin" : "input-dest");
  const btn   = document.getElementById(btnId);
  if (!btn || !inp) return;

  btn.disabled = true;
  const origHtml = btn.innerHTML;
  btn.innerHTML = "⏳ Buscando…";
  showToast("📍 Obteniendo tu ubicación…");

  try {
    const pos  = await getCurrentPosition();
    const lat  = pos.coords.latitude;
    const lng  = pos.coords.longitude;
    const addr = await reverseGeocode(lat, lng);
    const nearest = findNearestSector(lat, lng);

    inp.value = addr || nearest?.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    inp.parentElement.querySelector(".sf-clear").classList.remove("hidden");

    if (field === "origin") {
      APP.origin       = nearest?.id || null;
      APP.originLatLng = [lat, lng];
    } else {
      APP.dest       = nearest?.id || null;
      APP.destLatLng = [lat, lng];
    }

    checkSearchReady();
    const dist = nearest ? Math.round(haversineM(lat, lng, nearest.lat, nearest.lng)) : null;
    showToast(dist != null
      ? `📍 ${inp.value} · Paradero: ${nearest.name} (${dist} m)`
      : `📍 ${inp.value}`
    );
  } catch {
    showToast("❌ No se pudo obtener tu ubicación. Permite el acceso.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}

// ══════════════════════════════════════════════════════════
//  HELPER: crear mapa Leaflet de forma segura
//  Siempre llama a invalidateSize() después de mostrar
// ══════════════════════════════════════════════════════════
function createMap(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // Limpia instancia anterior si existe
  if (APP.maps[containerId]) {
    try { APP.maps[containerId].remove(); } catch(e) {}
    delete APP.maps[containerId];
  }

  const m = L.map(container, {
    zoomControl: true,
    attributionControl: true,
    ...options,
  }).setView(QUITO_CENTER, QUITO_ZOOM);

  addTiles(m);
  APP.maps[containerId] = m;
  return m;
}

// FIX PRINCIPAL: fitBounds robusto con invalidateSize
function safeFitBounds(map, points, padding = [40, 40]) {
  if (!map || !points || points.length === 0) return;

  // Forzar recalculo de tamaño del contenedor
  map.invalidateSize({ animate: false });

  if (points.length === 1) {
    map.setView(points[0], 15);
    return;
  }

  try {
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding, maxZoom: 16, animate: false });
    }
  } catch(e) {
    console.warn("fitBounds falló, usando centro manual:", e);
    // Fallback: centro promedio
    const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p[1], 0) / points.length;
    map.setView([avgLat, avgLng], 13);
  }
}

// ══════════════════════════════════════════════════════════
//  1. MAPA DE RESULTADOS
//  FIX: se llama con setTimeout para esperar render del DOM
// ══════════════════════════════════════════════════════════
function initResultsMap() {
  // Limpiar mapa anterior
  if (APP.maps["results-map"]) {
    try { APP.maps["results-map"].remove(); } catch(e) {}
    delete APP.maps["results-map"];
  }

  // CRÍTICO: esperar a que la pantalla sea visible antes de crear el mapa
  requestAnimationFrame(() => {
    setTimeout(() => {
      _buildResultsMap();
    }, 100);
  });
}

function _buildResultsMap() {
  const m = createMap("results-map");
  if (!m) return;

  const o   = SECTOR_BY_ID[APP.origin];
  const d   = SECTOR_BY_ID[APP.dest];
  const oLL = APP.originLatLng || (o ? [o.lat, o.lng] : null);
  const dLL = APP.destLatLng   || (d ? [d.lat, d.lng] : null);

  const allPoints = [];

  // Trazar rutas
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
        }).addTo(m).bindTooltip(`🚌 Línea ${leg.route.linea} – ${leg.route.empresa}`, { sticky: true });
        allPoints.push(...coords);
      }
    });
  });

  // Marcadores de origen y destino
  if (oLL) { addPinMarker(m, oLL, o?.name || "Origen",  "#27AE60"); allPoints.push(oLL); }
  if (dLL) { addPinMarker(m, dLL, d?.name || "Destino", "#FF6B2B"); allPoints.push(dLL); }

  // Si no hay puntos, usar el centro de Quito
  if (allPoints.length === 0) {
    m.setView(QUITO_CENTER, QUITO_ZOOM);
    return;
  }

  safeFitBounds(m, allPoints, [40, 40]);
}

// ══════════════════════════════════════════════════════════
//  2. MAPA DE DETALLE — estilo navegación paso a paso
// ══════════════════════════════════════════════════════════
async function initDetailMap(result) {
  // Limpiar anterior
  if (APP.maps["detail-map"]) {
    try { APP.maps["detail-map"].remove(); } catch(e) {}
    delete APP.maps["detail-map"];
  }

  reorganizeDetailLayout();

  // Esperar a que el DOM esté listo
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)));

  const m = createMap("detail-map");
  if (!m) return;

  const oLL = APP.originLatLng || coordsOf(APP.origin);
  const dLL = APP.destLatLng   || coordsOf(APP.dest);

  const firstLeg = result.legs[0];
  const lastLeg  = result.legs[result.legs.length - 1];
  const firstStop = SECTOR_BY_ID[firstLeg.stops[0]];
  const lastStop  = SECTOR_BY_ID[lastLeg.stops[lastLeg.stops.length - 1]];

  const allPoints = [];
  const navSteps  = [];

  // ── Segmento caminata inicio ──────────────────────────
  if (oLL && firstStop) {
    const walk = await getWalkPath(oLL, [firstStop.lat, firstStop.lng]);
    allPoints.push(...walk.coords);

    if (walk.coords.length > 1) {
      L.polyline(walk.coords, {
        color: "#27AE60", weight: 4, opacity: 0.9,
        dashArray: "10 7", lineJoin: "round",
      }).addTo(m).bindTooltip(`🚶 Caminar al paradero (${walk.distText})`, { sticky: true });
    }

    navSteps.push({
      icon: "🚶", color: "#27AE60",
      title: `Camina ${walk.distText} hasta el paradero`,
      sub: `Paradero: <strong>${firstStop.name}</strong>`,
      time: walk.timeText,
    });
  }

  // ── Segmentos de bus ──────────────────────────────────
  result.legs.forEach((leg, li) => {
    const coords    = getPathCoords(leg);
    const fromStop  = SECTOR_BY_ID[leg.stops[0]];
    const toStop    = SECTOR_BY_ID[leg.stops[leg.stops.length - 1]];
    const nParadas  = leg.stops.length - 1;

    allPoints.push(...coords);

    if (coords.length > 1) {
      L.polyline(coords, {
        color: leg.route.color || "#2A5F9E",
        weight: 5, opacity: 0.92,
        lineJoin: "round", lineCap: "round",
      }).addTo(m).bindTooltip(
        `🚌 Línea ${leg.route.linea} – ${leg.route.empresa}<br>${fromStop?.name || "—"} → ${toStop?.name || "—"}`,
        { sticky: true }
      );
    }

    // Dots en paradas intermedias (solo primeras/últimas para no saturar)
    leg.stops.forEach((id, i) => {
      const s = SECTOR_BY_ID[id];
      if (!s) return;
      const isEndpoint = i === 0 || i === leg.stops.length - 1;
      L.circleMarker([s.lat, s.lng], {
        radius:      isEndpoint ? 7 : 4,
        color:       "#fff",
        weight:      isEndpoint ? 2.5 : 1.5,
        fillColor:   leg.route.color || "#2A5F9E",
        fillOpacity: 1,
      }).addTo(m).bindTooltip(s.name, { direction: "top" });
    });

    navSteps.push({
      icon: "🚌", color: leg.route.color || "#2A5F9E",
      title: `Toma la línea <span style="color:${leg.route.color};font-weight:800">${leg.route.linea}</span> – ${leg.route.empresa}`,
      sub: `${fromStop?.name || "—"} → ${toStop?.name || "—"} · ${nParadas} parada${nParadas !== 1 ? "s" : ""}`,
      time: `~${Math.max(3, nParadas * 3)} min`,
    });

    // Transbordo
    if (li < result.legs.length - 1 && toStop) {
      addTransferMarker(m, toStop);
      navSteps.push({
        icon: "🔄", color: "#F59E0B",
        title: `Bájate en <strong>${toStop.name}</strong>`,
        sub: `Transbordo: sube a línea <strong>${result.legs[li+1].route.linea}</strong>`,
        time: "~3 min",
      });
    }
  });

  // ── Segmento caminata final ───────────────────────────
  if (dLL && lastStop) {
    const walk2 = await getWalkPath([lastStop.lat, lastStop.lng], dLL);
    allPoints.push(...walk2.coords);

    if (walk2.coords.length > 1) {
      L.polyline(walk2.coords, {
        color: "#FF6B2B", weight: 4, opacity: 0.9,
        dashArray: "10 7", lineJoin: "round",
      }).addTo(m).bindTooltip(`🚶 Caminar al destino (${walk2.distText})`, { sticky: true });
    }

    navSteps.push({
      icon: "🏁", color: "#FF6B2B",
      title: `Camina ${walk2.distText} hasta tu destino`,
      sub: SECTOR_BY_ID[APP.dest]?.name || "Tu destino",
      time: walk2.timeText,
    });
  }

  // ── Pins de inicio / fin ──────────────────────────────
  if (oLL) {
    addPinMarker(m, oLL, SECTOR_BY_ID[APP.origin]?.name || "Inicio", "#27AE60");
    allPoints.push(oLL);
  }
  if (dLL) {
    addPinMarker(m, dLL, SECTOR_BY_ID[APP.dest]?.name || "Destino", "#FF6B2B");
    allPoints.push(dLL);
  }

  // ── fitBounds ─────────────────────────────────────────
  safeFitBounds(m, allPoints, [50, 50]);

  // ── Panel de navegación ───────────────────────────────
  renderNavPanel(navSteps, result);
}

// ── Reorganizar layout del detalle ────────────────────────
function reorganizeDetailLayout() {
  const screenDetail = document.getElementById("screen-detail");
  if (!screenDetail || screenDetail.dataset.layoutDone) return;
  screenDetail.dataset.layoutDone = "1";

  const layout     = screenDetail.querySelector(".detail-layout");
  const sidebar    = screenDetail.querySelector(".detail-sidebar");
  const detailMap  = document.getElementById("detail-map");
  const detailInfo = document.getElementById("detail-info");
  const detailTips = document.getElementById("detail-tips");

  if (!sidebar || !layout) return;

  // ← ELIMINA las líneas que fuerzan gridTemplateColumns: "1fr"
  // Dejar el grid como está en CSS (dos columnas)

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
    <div class="dml-item">
      <div style="width:24px;border-top:3px dashed #27AE60;opacity:.8"></div>
      A pie (inicio)
    </div>
    <div class="dml-item">
      <div class="dml-line" style="background:#2A5F9E"></div>
      Recorrido del bus
    </div>
    <div class="dml-item">
      <div style="width:24px;border-top:3px dashed #FF6B2B;opacity:.8"></div>
      A pie (final)
    </div>`;
  mapBlock.appendChild(legend);

  if (detailTips) mapBlock.appendChild(detailTips);

  sidebar.replaceWith(mapBlock);  // ← sidebar derecho = mapa
}

// ── Panel de navegación tipo Google Maps ──────────────────
function renderNavPanel(steps, result) {
  const panel = document.getElementById("nav-panel");
  if (!panel) return;

  const totalWalk = steps.filter(s => s.icon === "🚶" || s.icon === "🏁").length;
  const totalBus  = steps.filter(s => s.icon === "🚌").length;

  panel.innerHTML = `
    <div class="np-header">
      <div>
        <div class="np-title">🗺 Navegación paso a paso</div>
        <div class="np-meta">~${result.estimatedMin} min · ${result.totalStops} paradas · ${totalBus} línea${totalBus!==1?"s":""} · ${totalWalk} tramo${totalWalk!==1?"s":""} a pie</div>
      </div>
      <div class="np-badge ${result.type}">${result.type === "direct" ? "🟢 Directa" : "🔵 Transbordo"}</div>
    </div>
    <div class="np-steps">
      ${steps.map((s, i) => `
        <div class="np-step">
          <div class="np-step-icon" style="background:${s.color}20;border-color:${s.color}">
            ${s.icon}
          </div>
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
//  3. MAP PICKER
// ══════════════════════════════════════════════════════════
const pickerState = {
  mode: null, selectedId: null, freeLatLng: null,
  map: null, markers: [], freeMarker: null, _nearestLine: null, _freeAddress: null,
};

function initMapPicker() {
  initGeolocButtons();

  document.querySelectorAll(".map-pick-btn").forEach(btn => {
    btn.addEventListener("click", () => openMapPicker(btn.dataset.mode));
  });
  document.getElementById("map-modal-close").addEventListener("click", closeMapPicker);
  document.getElementById("map-confirm-btn").addEventListener("click", confirmMapSelection);
  document.getElementById("map-picker-modal").addEventListener("click", e => {
    if (e.target === document.getElementById("map-picker-modal")) closeMapPicker();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.getElementById("map-picker-modal").classList.contains("is-open"))
      closeMapPicker();
  });
}

function openMapPicker(mode) {
  pickerState.mode       = mode;
  pickerState.freeLatLng = null;
  pickerState._freeAddress = null;
  pickerState.selectedId = mode === "origin" ? APP.origin : APP.dest;

  const isOrigin = mode === "origin";
  document.getElementById("map-modal-indicator").className = "map-modal-indicator" + (isOrigin ? "" : " dest");
  document.getElementById("map-modal-title").textContent = isOrigin
    ? "Selecciona tu punto de origen"
    : "Selecciona tu destino";
  document.getElementById("map-modal-hint").textContent = "Toca una parada o haz clic en cualquier punto del mapa";

  updatePickerDisplay(pickerState.selectedId, null, null);
  document.getElementById("map-picker-modal").classList.add("is-open");
  document.body.style.overflow = "hidden";

  if (pickerState.map) { try { pickerState.map.remove(); } catch(e) {} pickerState.map = null; }
  pickerState.markers = []; pickerState.freeMarker = null;

  setTimeout(() => {
    const map = L.map("picker-map", { zoomControl: true }).setView(QUITO_CENTER, 13);
    pickerState.map = map;
    addTiles(map);
    map.invalidateSize();

    // Botón mi ubicación dentro del modal
    const geoCtrl = L.control({ position: "topright" });
    geoCtrl.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.innerHTML = `<button class="picker-geoloc-btn" title="Mi ubicación">📍 Mi ubicación</button>`;
      L.DomEvent.disableClickPropagation(div);
      div.querySelector("button").addEventListener("click", async () => {
        try {
          div.querySelector("button").textContent = "⏳…";
          const pos = await getCurrentPosition();
          const { latitude: lat, longitude: lng } = pos.coords;
          map.setView([lat, lng], 16);
          selectFreePoint(lat, lng, map);
        } catch {
          showToast("❌ No se pudo obtener ubicación.");
        } finally {
          div.querySelector("button").textContent = "📍 Mi ubicación";
        }
      });
      return div;
    };
    geoCtrl.addTo(map);

    // Paradas
    SECTORS.forEach(sector => {
      const isSel = sector.id === pickerState.selectedId;
      const icon  = L.divIcon({
        className: "",
        html: `<div class="picker-marker zona-${sector.zona}${isSel ? (isOrigin ? " selected-origin" : " selected-dest") : ""}"
                    tabindex="0" role="button" aria-label="Parada: ${sector.name}"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      const marker = L.marker([sector.lat, sector.lng], { icon })
        .addTo(map)
        .bindTooltip(`<strong>${sector.name}</strong><br><small>Zona ${sector.zona}</small>`, {
          direction: "top", offset: [0, -10], className: "picker-tooltip",
        });
      marker.on("click", e => { L.DomEvent.stopPropagation(e); selectPickerStop(sector, map); });
      pickerState.markers.push({ marker, sector });
    });

    map.on("click", e => selectFreePoint(e.latlng.lat, e.latlng.lng, map));

    // Centrar en selección previa
    if (pickerState.selectedId) {
      const s = SECTOR_BY_ID[pickerState.selectedId];
      if (s) map.setView([s.lat, s.lng], 14);
    }
  }, 100);
}

function selectPickerStop(sector, map) {
  pickerState.selectedId = sector.id;
  pickerState.freeLatLng = null;
  pickerState._freeAddress = null;
  if (pickerState.freeMarker)   { pickerState.freeMarker.remove();   pickerState.freeMarker   = null; }
  if (pickerState._nearestLine) { pickerState._nearestLine.remove(); pickerState._nearestLine = null; }

  const isOrigin = pickerState.mode === "origin";
  pickerState.markers.forEach(({ marker, sector: s }) => {
    const el = marker.getElement()?.querySelector(".picker-marker");
    if (!el) return;
    el.classList.remove("selected-origin", "selected-dest");
    if (s.id === sector.id) el.classList.add(isOrigin ? "selected-origin" : "selected-dest");
  });
  updatePickerDisplay(sector.id, null, null);
  showToast(isOrigin ? `Origen: ${sector.name}` : `Destino: ${sector.name}`);
}

function selectFreePoint(lat, lng, map) {
  pickerState.freeLatLng   = [lat, lng];
  pickerState._freeAddress = null;
  const nearest  = findNearestSector(lat, lng);
  pickerState.selectedId = nearest?.id || null;
  const isOrigin = pickerState.mode === "origin";

  pickerState.markers.forEach(({ marker }) => {
    const el = marker.getElement()?.querySelector(".picker-marker");
    if (el) el.classList.remove("selected-origin", "selected-dest");
  });
  if (nearest) {
    pickerState.markers.find(m => m.sector.id === nearest.id)
      ?.marker.getElement()?.querySelector(".picker-marker")
      ?.classList.add(isOrigin ? "selected-origin" : "selected-dest");
  }

  if (pickerState.freeMarker)   { pickerState.freeMarker.remove();   pickerState.freeMarker   = null; }
  if (pickerState._nearestLine) { pickerState._nearestLine.remove(); pickerState._nearestLine = null; }

  const freeIcon = L.divIcon({
    className: "",
    html: `<div class="free-pin ${isOrigin ? "free-pin-origin" : "free-pin-dest"}"><div class="free-pin-dot"></div></div>`,
    iconSize: [24, 32], iconAnchor: [12, 32],
  });
  pickerState.freeMarker = L.marker([lat, lng], { icon: freeIcon }).addTo(map)
    .bindTooltip(isOrigin ? "📍 Tu origen" : "🏁 Tu destino", { direction: "top", offset: [0, -34] });

  if (nearest) {
    pickerState._nearestLine = L.polyline(
      [[lat, lng], [nearest.lat, nearest.lng]],
      { color: "#FF6B2B", weight: 2, opacity: 0.5, dashArray: "5 4" }
    ).addTo(map);
  }

  updatePickerDisplay(nearest?.id || null, [lat, lng], null);
  const dist = nearest ? Math.round(haversineM(lat, lng, nearest.lat, nearest.lng)) : null;
  showToast(nearest ? `Paradero más cercano: ${nearest.name} (${dist} m)` : "Punto seleccionado");

  // Geocodificación asíncrona
  reverseGeocode(lat, lng).then(addr => {
    pickerState._freeAddress = addr;
    updatePickerDisplay(nearest?.id || null, [lat, lng], addr);
  });
}

function updatePickerDisplay(sectorId, freeLatLng, address) {
  const display    = document.getElementById("map-selected-display");
  const confirmBtn = document.getElementById("map-confirm-btn");
  const isOrigin   = pickerState.mode === "origin";

  if (freeLatLng && sectorId) {
    const s    = SECTOR_BY_ID[sectorId];
    const dist = haversineM(freeLatLng[0], freeLatLng[1], s.lat, s.lng);
    const addrLine = address
      ? `<div style="font-size:.82rem;font-weight:700;color:var(--blue)">${address}</div>`
      : `<div style="font-size:.74rem;color:var(--gray-text)">${freeLatLng[0].toFixed(5)}, ${freeLatLng[1].toFixed(5)}</div>`;
    display.innerHTML = `
      <div class="msd-selected" style="flex-direction:column;align-items:flex-start;gap:4px">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="msd-dot" style="background:${isOrigin ? "var(--green)" : "var(--orange)"}"></span>
          ${addrLine}
        </div>
        <div style="font-size:.74rem;color:var(--gray-text);padding-left:18px">
          🚏 Paradero: <strong>${s.name}</strong> · ${Math.round(dist)} m a pie
        </div>
      </div>`;
    confirmBtn.classList.remove("hidden");
  } else if (sectorId) {
    const s = SECTOR_BY_ID[sectorId];
    display.innerHTML = `
      <div class="msd-selected">
        <span class="msd-dot" style="background:${isOrigin ? "var(--green)" : "var(--orange)"}"></span>
        <strong>${s?.name || sectorId}</strong>
        <span style="font-size:.72rem;color:var(--gray-text)">(zona ${s?.zona})</span>
      </div>`;
    confirmBtn.classList.remove("hidden");
  } else {
    display.innerHTML = `<span class="msd-placeholder">Toca una parada o un punto del mapa</span>`;
    confirmBtn.classList.add("hidden");
  }
}

async function confirmMapSelection() {
  const mode     = pickerState.mode;
  const sectorId = pickerState.selectedId;
  const freeLL   = pickerState.freeLatLng;
  if (!sectorId && !freeLL) return;

  const s   = SECTOR_BY_ID[sectorId];
  const inp = document.getElementById(mode === "origin" ? "input-origin" : "input-dest");

  let label;
  if (freeLL) {
    label = pickerState._freeAddress
      || await reverseGeocode(freeLL[0], freeLL[1])
      || s?.name
      || `${freeLL[0].toFixed(4)}, ${freeLL[1].toFixed(4)}`;
  } else {
    label = s?.name || "";
  }

  inp.value = label;
  inp.parentElement.querySelector(".sf-clear").classList.remove("hidden");

  if (mode === "origin") {
    APP.origin       = sectorId || null;
    APP.originLatLng = freeLL || (s ? [s.lat, s.lng] : null);
  } else {
    APP.dest       = sectorId || null;
    APP.destLatLng = freeLL || (s ? [s.lat, s.lng] : null);
  }

  checkSearchReady();
  closeMapPicker();
  if (APP.origin && APP.dest)
    setTimeout(() => showToast("✅ Listo. Toca 'Buscar rutas'."), 300);
}

function closeMapPicker() {
  document.getElementById("map-picker-modal").classList.remove("is-open");
  document.body.style.overflow = "";
  if (pickerState.map) { try { pickerState.map.remove(); } catch(e) {} pickerState.map = null; }
  if (pickerState._nearestLine) { try { pickerState._nearestLine.remove(); } catch(e) {} pickerState._nearestLine = null; }
  pickerState.markers      = [];
  pickerState.freeMarker   = null;
  pickerState._freeAddress = null;
}

// ══════════════════════════════════════════════════════════
//  HELPERS DE MAPA
// ══════════════════════════════════════════════════════════
function addTiles(map) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© <a href='https://openstreetmap.org'>OSM</a> contributors",
    maxZoom: 19,
  }).addTo(map);
}

function coordsOf(id) {
  const s = SECTOR_BY_ID[id];
  return s ? [s.lat, s.lng] : null;
}

function getPathCoords(leg) {
  const route = leg.route;
  let coords = [];

  // Intentar usar path vectorial si existe
  if (Array.isArray(route.path) && route.path.length > 1) {
    const sample   = route.path[0];
    if (Array.isArray(sample) && sample.length >= 2) {
      const isGeoJSON = Math.abs(sample[0]) > 1;
      const all       = route.path.map(p => isGeoJSON ? [p[1], p[0]] : [p[0], p[1]]);
      coords = trimToLeg(all, leg);
    }
  }

  // Fallback: conectar paradas por línea recta
  if (coords.length < 2) {
    coords = leg.stops
      .map(id => SECTOR_BY_ID[id])
      .filter(Boolean)
      .map(s => [s.lat, s.lng]);
  }

  return coords;
}

function trimToLeg(path, leg) {
  const from = SECTOR_BY_ID[leg.stops[0]];
  const to   = SECTOR_BY_ID[leg.stops[leg.stops.length - 1]];
  if (!from || !to) return path;

  let si = 0, ei = path.length - 1, ds = Infinity, de = Infinity;
  path.forEach(([lat, lng], i) => {
    const d1 = haversineM(lat, lng, from.lat, from.lng);
    const d2 = haversineM(lat, lng, to.lat, to.lng);
    if (d1 < ds) { ds = d1; si = i; }
    if (d2 < de) { de = d2; ei = i; }
  });
  if (si > ei) [si, ei] = [ei, si];
  const slice = path.slice(si, ei + 1);
  return slice.length > 1 ? slice : path;
}

async function getWalkPath(from, to) {
  const distM = haversineM(from[0], from[1], to[0], to[1]);
  const fallback = {
    coords:   [from, to],
    distText: distM < 1000 ? `${Math.round(distM)} m` : `${(distM/1000).toFixed(1)} km`,
    timeText: `~${Math.ceil(distM / 83)} min`, // ~5 km/h caminando
  };

  // Si la distancia es muy corta (<50 m) o muy larga (>3 km a pie), no pedir ORS
  if (distM < 50 || distM > 3000) return fallback;

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

    const coords   = decodePolyline(route.geometry);
    const d        = route.summary?.distance || distM;
    const t        = route.summary?.duration || (distM / 83 * 60);
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

function addPinMarker(map, latLng, label, color) {
  const icon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:24px;height:34px">
      <div style="width:24px;height:24px;background:${color};border:3px solid white;
           border-radius:50%;box-shadow:0 3px 12px rgba(0,0,0,.4);display:flex;
           align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800">
        ${color === "#27AE60" ? "A" : "B"}
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
           width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
           border-top:12px solid ${color}"></div>
    </div>`,
    iconSize: [24, 34], iconAnchor: [12, 34],
  });
  L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map)
    .bindTooltip(`<strong>${label}</strong>`, { direction: "top", offset: [0, -36] });
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
  SECTORS.forEach(s => {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (d < minD) { minD = d; nearest = s; }
  });
  return nearest;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
