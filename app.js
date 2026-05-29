/* ══════════════════════════════════════
   BusQuito – app.js  (v4 – flujo tipo Google Maps)
   ══════════════════════════════════════ */

const APP = {
  screen:       "home",
  originLatLng: null,   // {lat, lng}
  destLatLng:   null,   // {lat, lng}
  originLabel:  null,   // texto legible
  destLabel:    null,
  results:      [],
  selectedRoute: null,
  user:         null,
  favorites:    [],
  history:      [],
  maps:         {},
};

document.addEventListener("DOMContentLoaded", async () => {
  await initData();
  loadStorage();
  initA11y();
  initNav();
  initAuth();
  initHomeMap();    // mapa principal en home
  initLiveCard();
  updateAccountLabel();
});

// ─── STORAGE ─────────────────────────────────────────────
function loadStorage() {
  try {
    const u = localStorage.getItem("bq_user");   if (u) APP.user      = JSON.parse(u);
    const f = localStorage.getItem("bq_fav");    if (f) APP.favorites = JSON.parse(f);
    const h = localStorage.getItem("bq_hist");   if (h) APP.history   = JSON.parse(h);
  } catch(e) {}
}
function saveStorage() {
  localStorage.setItem("bq_user", JSON.stringify(APP.user));
  localStorage.setItem("bq_fav",  JSON.stringify(APP.favorites));
  localStorage.setItem("bq_hist", JSON.stringify(APP.history));
}

// ─── NAVEGACIÓN ──────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("screen-" + name);
  if (!target) return;
  target.classList.add("active");
  APP.screen = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
  ["home","favorites","history"].forEach(n => {
    const btn = document.getElementById("nav-" + n);
    if (btn) btn.classList.toggle("active", n === name);
  });
}

function initNav() {
  const safe = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
  safe("nav-home",          () => showScreen("home"));
  safe("nav-favorites",     () => { renderFavorites(); showScreen("favorites"); });
  safe("nav-history",       () => { renderHistory();   showScreen("history"); });
  safe("logo-home",         e  => { e.preventDefault(); showScreen("home"); });
  safe("btn-account",       () => { renderProfile(); showScreen("account"); });
  safe("back-from-results", () => showScreen("home"));
  safe("back-from-detail",  () => showScreen("results"));
  safe("back-from-fav",     () => showScreen("home"));
  safe("back-from-hist",    () => showScreen("home"));
  safe("back-from-account", () => showScreen("home"));
  safe("clear-hist",        () => clearHistory());
  safe("fav-btn",           () => toggleFavorite());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("modal-overlay");
      if (overlay && overlay.classList.contains("is-open")) closeModal();
    }
  });
}

// ══════════════════════════════════════════════════════════
//  MAPA PRINCIPAL (home) – tipo Google Maps
//  El usuario hace clic dos veces: 1º origen, 2º destino
// ══════════════════════════════════════════════════════════
let homeMap = null;
let homeOriginMarker = null;
let homeDestMarker   = null;
let homeClickState   = "origin"; // "origin" | "dest" | "done"

function initHomeMap() {
  const container = document.getElementById("home-map");
  if (!container) return;

  // Crear mapa centrado en Quito
  homeMap = L.map(container, { zoomControl: true, attributionControl: false })
    .setView([-0.2201, -78.5123], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OSM contributors", maxZoom: 19,
  }).addTo(homeMap);

  APP.maps["home-map"] = homeMap;

  // Instrucción inicial
  updateHomeInstruction();

  // Geolocalización automática al cargar
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      if (lat > -6 && lat < 2) homeMap.setView([lat, lng], 15);
    }, () => {}, { timeout: 5000 });
  }

  // Clic en el mapa
  homeMap.on("click", e => handleHomeMapClick(e.latlng.lat, e.latlng.lng));

  // Botones de control
  const btnReset  = document.getElementById("btn-reset-map");
  const btnSearch = document.getElementById("btn-search-map");
  const btnGeo    = document.getElementById("btn-geo-home");

  if (btnReset)  btnReset.addEventListener("click", resetHomeMap);
  if (btnSearch) btnSearch.addEventListener("click", doSearchFromMap);
  if (btnGeo)    btnGeo.addEventListener("click",   geolocateHome);

  // Invalidar tamaño cuando la pantalla se muestre
  document.getElementById("nav-home")?.addEventListener("click", () => {
    setTimeout(() => homeMap?.invalidateSize(), 200);
  });
}

function updateHomeInstruction() {
  const el = document.getElementById("home-instruction");
  if (!el) return;
  if (homeClickState === "origin") {
    el.innerHTML = `<span class="hi-dot origin"></span> Toca el mapa para marcar tu <strong>origen</strong>`;
  } else if (homeClickState === "dest") {
    el.innerHTML = `<span class="hi-dot dest"></span> Ahora toca para marcar tu <strong>destino</strong>`;
  } else {
    el.innerHTML = `<span class="hi-dot done"></span> Listo — presiona <strong>Buscar rutas</strong>`;
  }
}

async function handleHomeMapClick(lat, lng) {
  const addr = await reverseGeocode(lat, lng);
  const label = addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  if (homeClickState === "origin") {
    // Colocar marcador de origen
    if (homeOriginMarker) homeOriginMarker.remove();
    homeOriginMarker = L.marker([lat, lng], { icon: makePinIcon("#27AE60", "A") })
      .addTo(homeMap)
      .bindTooltip(`<strong>Origen:</strong> ${label}`, { permanent: false });

    APP.originLatLng = { lat, lng };
    APP.originLabel  = label;
    homeClickState   = "dest";

    // Actualizar chip de origen
    const chip = document.getElementById("chip-origin");
    if (chip) chip.textContent = label;

    showToast(`📍 Origen: ${label}`);

  } else if (homeClickState === "dest") {
    // Colocar marcador de destino
    if (homeDestMarker) homeDestMarker.remove();
    homeDestMarker = L.marker([lat, lng], { icon: makePinIcon("#FF6B2B", "B") })
      .addTo(homeMap)
      .bindTooltip(`<strong>Destino:</strong> ${label}`, { permanent: false });

    APP.destLatLng  = { lat, lng };
    APP.destLabel   = label;
    homeClickState  = "done";

    // Dibujar línea punteada origen→destino
    if (homeOriginMarker && homeDestMarker) {
      if (window._homeLine) window._homeLine.remove();
      window._homeLine = L.polyline(
        [[APP.originLatLng.lat, APP.originLatLng.lng], [lat, lng]],
        { color: "#888", weight: 2, dashArray: "8 6", opacity: 0.6 }
      ).addTo(homeMap);

      homeMap.fitBounds(L.latLngBounds(
        [APP.originLatLng.lat, APP.originLatLng.lng],
        [lat, lng]
      ), { padding: [60, 60] });
    }

    const chip = document.getElementById("chip-dest");
    if (chip) chip.textContent = label;

    // Habilitar botón buscar
    const btnSearch = document.getElementById("btn-search-map");
    if (btnSearch) btnSearch.disabled = false;

    showToast(`🏁 Destino: ${label}`);
  }

  updateHomeInstruction();
}

function resetHomeMap() {
  if (homeOriginMarker) { homeOriginMarker.remove(); homeOriginMarker = null; }
  if (homeDestMarker)   { homeDestMarker.remove();   homeDestMarker   = null; }
  if (window._homeLine) { window._homeLine.remove(); window._homeLine = null; }

  APP.originLatLng = null;
  APP.destLatLng   = null;
  APP.originLabel  = null;
  APP.destLabel    = null;
  homeClickState   = "origin";

  const co = document.getElementById("chip-origin");
  const cd = document.getElementById("chip-dest");
  if (co) co.textContent = "Toca el mapa";
  if (cd) cd.textContent = "Toca el mapa";

  const btnSearch = document.getElementById("btn-search-map");
  if (btnSearch) btnSearch.disabled = true;

  updateHomeInstruction();
  homeMap?.setView([-0.2201, -78.5123], 13);
}

async function geolocateHome() {
  const btn = document.getElementById("btn-geo-home");
  if (btn) { btn.disabled = true; btn.textContent = "⏳"; }
  try {
    const pos = await getCurrentPosition();
    const { latitude: lat, longitude: lng } = pos.coords;
    homeMap?.setView([lat, lng], 15);
    await handleHomeMapClick(lat, lng);
  } catch {
    showToast("❌ No se pudo obtener tu ubicación");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "📍 Mi ubicación"; }
  }
}

function doSearchFromMap() {
  if (!APP.originLatLng || !APP.destLatLng) {
    showToast("Marca origen y destino en el mapa primero");
    return;
  }

  const results = findRoutesByCoords(APP.originLatLng, APP.destLatLng);
  APP.results = results;

  // Guardar en historial
  const entry = {
    originLatLng: APP.originLatLng,
    destLatLng:   APP.destLatLng,
    originLabel:  APP.originLabel || "Origen",
    destLabel:    APP.destLabel   || "Destino",
    label:        `${APP.originLabel || "Origen"} → ${APP.destLabel || "Destino"}`,
    date: new Date().toLocaleDateString("es-EC", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
  };
  APP.history = [entry, ...APP.history.filter(h => h.label !== entry.label)].slice(0, 20);
  saveStorage();

  renderResults();
  showScreen("results");
}

// ─── PIN ICON ─────────────────────────────────────────────
function makePinIcon(color, letter) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:38px">
      <div style="width:28px;height:28px;background:${color};border:3px solid white;
           border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;
           align-items:center;justify-content:center;color:white;font-size:13px;font-weight:800">
        ${letter}
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
           width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
           border-top:12px solid ${color}"></div>
    </div>`,
    iconSize: [28, 38], iconAnchor: [14, 38],
  });
}

// ─── RESULTADOS ──────────────────────────────────────────
function renderResults() {
  const oLabel = APP.originLabel || "Origen";
  const dLabel = APP.destLabel   || "Destino";

  const ts = document.getElementById("trip-summary");
  if (ts) ts.innerHTML = `
    <span class="ts-origin"><span class="ts-dot o-dot"></span>${truncate(oLabel, 28)}</span>
    <span class="ts-arrow">→</span>
    <span class="ts-dest"><span class="ts-dot d-dot"></span>${truncate(dLabel, 28)}</span>`;

  renderResultsList(APP.results);
  initResultsMap();
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function renderResultsList(routes) {
  const list = document.getElementById("results-list");
  if (!list) return;
  list.innerHTML = "";

  if (routes.length === 0) {
    list.innerHTML = `
      <div class="no-results">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" stroke="#DDE3EC" stroke-width="2"/>
          <path d="M20 28h16M28 20v16" stroke="#DDE3EC" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <h3>Sin rutas encontradas</h3>
        <p>No hay rutas cargadas que pasen cerca de esos puntos. Intenta con puntos más cercanos a las calles principales.</p>
        <button class="btn-outline" onclick="showScreen('home')">Volver al mapa</button>
      </div>`;
    return;
  }

  routes.forEach((result, idx) => {
    const card = document.createElement("div");
    card.className = `result-card ${result.type}`;
    const leg1 = result.legs[0];
    const leg2 = result.legs[1] || null;

    const walkOrigin = result.walkOriginM ? `🚶 ${result.walkOriginM} m` : "";
    const walkDest   = result.walkDestM   ? `🚶 ${result.walkDestM} m`   : "";

    card.innerHTML = `
      <div class="rc-header">
        <div class="rc-badges">
          <span class="rc-type ${result.type}">${result.type === "direct" ? "🟢 Directa" : "🔵 Transbordo"}</span>
          <span class="rc-time">~${result.estimatedMin} min</span>
        </div>
        ${walkOrigin ? `<div class="rc-walk-info">${walkOrigin} hasta el paradero · ${walkDest} al llegar</div>` : ""}
      </div>
      <div class="rc-legs">
        <div class="rc-leg">
          <div class="rc-line-badge" style="background:${leg1.route.color}">${leg1.route.linea}</div>
          <div class="rc-leg-info">
            <div class="rc-empresa">${leg1.route.empresa}</div>
            <div class="rc-leg-path">
              <span class="rc-stop-a">${SECTOR_BY_ID[leg1.from]?.name || leg1.from}</span>
              <span class="rc-stops-count">${leg1.stops.length - 1} paradas</span>
              <span class="rc-stop-b">${SECTOR_BY_ID[leg1.to]?.name || leg1.to}</span>
            </div>
          </div>
        </div>
        ${leg2 ? `
        <div class="rc-transfer-hint">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M4 9l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Transbordo en <strong>${SECTOR_BY_ID[result.transferStop]?.name || "—"}</strong> · Subir a línea ${leg2.route.linea}
        </div>
        <div class="rc-leg">
          <div class="rc-line-badge" style="background:${leg2.route.color}">${leg2.route.linea}</div>
          <div class="rc-leg-info">
            <div class="rc-empresa">${leg2.route.empresa}</div>
            <div class="rc-leg-path">
              <span class="rc-stop-a">${SECTOR_BY_ID[leg2.from]?.name || leg2.from}</span>
              <span class="rc-stops-count">${leg2.stops.length - 1} paradas</span>
              <span class="rc-stop-b">${SECTOR_BY_ID[leg2.to]?.name || leg2.to}</span>
            </div>
          </div>
        </div>` : ""}
      </div>
      <div class="rc-footer">
        <button class="rc-detail-btn" data-idx="${idx}">Ver paso a paso →</button>
        <div class="rc-meta">
          <span>${result.totalStops} paradas</span>
          ${result.transfers > 0 ? `<span>· ${result.transfers} transbordo</span>` : ""}
        </div>
      </div>`;

    card.querySelector(".rc-detail-btn").addEventListener("click", () => {
      APP.selectedRoute = result;
      renderDetail(result);
      showScreen("detail");
    });
    list.appendChild(card);
  });
}

function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      let filtered = [...APP.results];
      if (filter === "direct")   filtered = filtered.filter(r => r.type === "direct");
      if (filter === "transfer") filtered = filtered.filter(r => r.type === "transfer");
      if (filter === "fast")     filtered = [...filtered].sort((a,b) => a.estimatedMin - b.estimatedMin);
      renderResultsList(filtered);
    });
  });
}

// ─── DETALLE ─────────────────────────────────────────────
function renderDetail(result) {
  const oLabel = APP.originLabel || "Origen";
  const dLabel = APP.destLabel   || "Destino";
  const titleEl = document.getElementById("detail-title");
  if (titleEl) titleEl.textContent = `${truncate(oLabel, 22)} → ${truncate(dLabel, 22)}`;

  const favBtn = document.getElementById("fav-btn");
  if (favBtn) {
    const isF = isFavoriteByCoords();
    favBtn.setAttribute("aria-pressed", isF.toString());
    favBtn.innerHTML = isF
      ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17l-7-7a4 4 0 0 1 5.657-5.657L10 5.686l1.343-1.343A4 4 0 0 1 17 10l-7 7z"/></svg> Guardado`
      : `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 17l-7-7a4 4 0 0 1 5.657-5.657L10 5.686l1.343-1.343A4 4 0 0 1 17 10l-7 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> Guardar`;
    favBtn.classList.toggle("saved", isF);
  }

  const stepsEl = document.getElementById("detail-steps");
  if (!stepsEl) return;
  stepsEl.innerHTML = "";

  stepsEl.appendChild(makeStep("walk",
    `Camina <strong>${result.walkOriginM || "?"} m</strong> hasta el paradero de <strong>${SECTOR_BY_ID[result.legs[0].from]?.name || "—"}</strong>`,
    null, "Busca la señal de parada de bus"));

  result.legs.forEach((leg, li) => {
    stepsEl.appendChild(makeStep("bus",
      `Aborda la línea <strong style="color:${leg.route.color}">${leg.route.linea}</strong> – ${leg.route.empresa}`,
      leg.route.color,
      `En la parada de <strong>${SECTOR_BY_ID[leg.from]?.name || leg.from}</strong>`));

    const intermedias = leg.stops.slice(1, -1);
    if (intermedias.length > 0) {
      const div = document.createElement("div");
      div.className = "step-stops-detail";
      div.innerHTML = `
        <button class="toggle-stops" aria-expanded="false">
          + Ver ${intermedias.length} paradas intermedias
        </button>
        <ul class="stops-list hidden" id="stops-${li}">
          ${intermedias.map(id => `<li class="stop-item">
            <span class="stop-item-dot" style="background:${leg.route.color}"></span>
            ${SECTOR_BY_ID[id]?.name || id}
          </li>`).join("")}
        </ul>`;
      div.querySelector(".toggle-stops").addEventListener("click", function() {
        const ul = div.querySelector(".stops-list");
        const expanded = this.getAttribute("aria-expanded") === "true";
        ul.classList.toggle("hidden", expanded);
        this.setAttribute("aria-expanded", (!expanded).toString());
        this.textContent = expanded
          ? `+ Ver ${intermedias.length} paradas intermedias`
          : `− Ocultar paradas`;
      });
      stepsEl.appendChild(div);
    }

    if (li < result.legs.length - 1) {
      stepsEl.appendChild(makeStep("transfer",
        `Bájate en <strong>${SECTOR_BY_ID[leg.to]?.name || "—"}</strong> y espera la siguiente línea`,
        null, `Transbordo · sube a línea ${result.legs[li+1].route.linea}`));
    } else {
      stepsEl.appendChild(makeStep("arrive",
        `Bájate en <strong>${SECTOR_BY_ID[leg.to]?.name || "—"}</strong>`,
        null, `🚶 Camina ~${result.walkDestM || "?"} m a tu destino`));
    }
  });

  stepsEl.appendChild(makeStep("arrive",
    `Llegaste a <strong>${truncate(dLabel, 30)}</strong>`,
    null, "🎉 ¡Destino alcanzado!"));

  const infoEl = document.getElementById("detail-info");
  if (infoEl) infoEl.innerHTML = `
    <div class="di-row"><span class="di-label">Tiempo estimado</span><span class="di-val">~${result.estimatedMin} min</span></div>
    <div class="di-row"><span class="di-label">Total paradas</span><span class="di-val">${result.totalStops}</span></div>
    <div class="di-row"><span class="di-label">Caminata origen</span><span class="di-val">${result.walkOriginM ?? "?"} m</span></div>
    <div class="di-row"><span class="di-label">Caminata destino</span><span class="di-val">${result.walkDestM ?? "?"} m</span></div>
    <div class="di-row"><span class="di-label">Transbordos</span><span class="di-val">${result.transfers}</span></div>
    <div class="di-row"><span class="di-label">Líneas</span><span class="di-val">${result.legs.map(l => l.route.linea).join(", ")}</span></div>`;

  const firstStop = SECTOR_BY_ID[result.legs[0]?.from];
  const zona = firstStop?.zona || "centro";
  const tips  = ROUTE_TIPS[zona] || ROUTE_TIPS.centro;
  const tipsEl = document.getElementById("detail-tips");
  if (tipsEl) tipsEl.innerHTML = `<div class="tip-box"><p>${tips[Math.floor(Math.random() * tips.length)]}</p></div>`;

  initDetailMap(result);
}

function makeStep(type, mainText, color, subText) {
  const div = document.createElement("div");
  div.className = `route-step step-${type}`;
  const icons = { walk:"🚶", bus:"🚌", transfer:"🔄", arrive:"📍" };
  div.innerHTML = `
    <div class="rs-icon" ${color ? `style="background:${color}20;border-color:${color}"` : ""}>${icons[type]}</div>
    <div class="rs-content">
      <div class="rs-main">${mainText}</div>
      ${subText ? `<div class="rs-sub">${subText}</div>` : ""}
    </div>`;
  return div;
}

// ─── LIVE CARD ───────────────────────────────────────────
function initLiveCard() {
  const container = document.getElementById("lc-routes");
  if (!container || !POPULAR_TRIPS || POPULAR_TRIPS.length === 0) return;
  const trips = shuffle([...POPULAR_TRIPS]).slice(0, 4);
  container.innerHTML = "";
  trips.forEach(trip => {
    const o = SECTOR_BY_ID[trip.from];
    const d = SECTOR_BY_ID[trip.to];
    if (!o || !d) return;
    const routes = findRoutes(trip.from, trip.to);
    const best = routes[0];
    const div = document.createElement("div");
    div.className = "lc-route";
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");
    div.innerHTML = `
      <div class="lcr-path">${trip.label}</div>
      <div class="lcr-meta">${best ? `${best.legs.length > 1 ? "Transbordo" : "Directo"} · ~${best.estimatedMin} min` : "Ver rutas"}</div>`;
    div.addEventListener("click", () => {
      APP.originLatLng = { lat: o.lat, lng: o.lng };
      APP.destLatLng   = { lat: d.lat, lng: d.lng };
      APP.originLabel  = o.name;
      APP.destLabel    = d.name;
      APP.results      = routes;
      renderResults();
      showScreen("results");
    });
    div.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") div.click(); });
    container.appendChild(div);
  });
}

// ─── FAVORITOS ───────────────────────────────────────────
function isFavoriteByCoords() {
  if (!APP.originLatLng || !APP.destLatLng) return false;
  return APP.favorites.some(f =>
    f.originLatLng && f.destLatLng &&
    Math.abs(f.originLatLng.lat - APP.originLatLng.lat) < 0.001 &&
    Math.abs(f.destLatLng.lat   - APP.destLatLng.lat)   < 0.001
  );
}

function toggleFavorite() {
  if (!APP.user) {
    showToast("Inicia sesión para guardar favoritos");
    setTimeout(() => { renderProfile(); showScreen("account"); }, 1200);
    return;
  }
  const idx = APP.favorites.findIndex(f =>
    f.originLatLng && f.destLatLng &&
    Math.abs(f.originLatLng.lat - APP.originLatLng?.lat) < 0.001
  );
  if (idx === -1) {
    APP.favorites.push({
      originLatLng: APP.originLatLng,
      destLatLng:   APP.destLatLng,
      originLabel:  APP.originLabel,
      destLabel:    APP.destLabel,
      label: `${APP.originLabel} → ${APP.destLabel}`,
    });
    showToast("⭐ Guardado en favoritos");
  } else {
    APP.favorites.splice(idx, 1);
    showToast("Eliminado de favoritos");
  }
  saveStorage();
  if (APP.selectedRoute) renderDetail(APP.selectedRoute);
}

function renderFavorites() {
  const list = document.getElementById("favorites-list");
  if (!list) return;
  list.innerHTML = "";
  if (APP.favorites.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No tienes rutas guardadas aún.</p></div>`;
    return;
  }
  APP.favorites.forEach((fav, i) => {
    const card = document.createElement("div");
    card.className = "fav-card";
    card.innerHTML = `
      <div class="fav-main"><div class="fav-label">${fav.label}</div></div>
      <div class="fav-actions">
        <button class="fav-go">Buscar →</button>
        <button class="fav-del">🗑</button>
      </div>`;
    card.querySelector(".fav-go").addEventListener("click", () => {
      APP.originLatLng = fav.originLatLng;
      APP.destLatLng   = fav.destLatLng;
      APP.originLabel  = fav.originLabel;
      APP.destLabel    = fav.destLabel;
      APP.results      = findRoutesByCoords(fav.originLatLng, fav.destLatLng);
      renderResults();
      showScreen("results");
    });
    card.querySelector(".fav-del").addEventListener("click", () => {
      APP.favorites.splice(i, 1);
      saveStorage();
      renderFavorites();
      showToast("Eliminado de favoritos");
    });
    list.appendChild(card);
  });
}

// ─── HISTORIAL ───────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;
  list.innerHTML = "";
  if (APP.history.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Tu historial aparecerá aquí.</p></div>`;
    return;
  }
  APP.history.forEach(entry => {
    const card = document.createElement("div");
    card.className = "hist-card";
    card.innerHTML = `
      <div class="hist-main">
        <div class="hist-label">${entry.label}</div>
        <div class="hist-date">${entry.date}</div>
      </div>
      <button class="hist-go">Repetir →</button>`;
    card.querySelector(".hist-go").addEventListener("click", () => {
      APP.originLatLng = entry.originLatLng;
      APP.destLatLng   = entry.destLatLng;
      APP.originLabel  = entry.originLabel;
      APP.destLabel    = entry.destLabel;
      APP.results      = findRoutesByCoords(entry.originLatLng, entry.destLatLng);
      renderResults();
      showScreen("results");
    });
    list.appendChild(card);
  });
}

function clearHistory() {
  showModal("Borrar historial", "¿Borrar todo el historial?", () => {
    APP.history = [];
    saveStorage();
    renderHistory();
    showToast("Historial borrado");
  });
}

// ─── AUTH ─────────────────────────────────────────────────
const ALLOWED_DOMAINS = ["gmail.com","hotmail.com","outlook.com"];

function buildEmailField(inputId) {
  return `
    <div class="email-input-group">
      <input id="${inputId}" type="text" placeholder="Tu correo" autocomplete="off" class="email-local-input"/>
      <span class="email-at">@</span>
      <select id="${inputId}-domain" class="email-domain-select">
        <option value="gmail.com">gmail.com</option>
        <option value="hotmail.com">hotmail.com</option>
        <option value="outlook.com">outlook.com</option>
      </select>
    </div>`;
}

function getEmailValue(inputId) {
  const local  = document.getElementById(inputId)?.value.trim() || "";
  const domain = document.getElementById(`${inputId}-domain`)?.value || "gmail.com";
  return local ? `${local}@${domain}` : "";
}

function initAuth() {
  const loginEmailWrap    = document.getElementById("login-email-wrap");
  const registerEmailWrap = document.getElementById("reg-email-wrap");
  if (loginEmailWrap)    loginEmailWrap.innerHTML    = buildEmailField("login-email");
  if (registerEmailWrap) registerEmailWrap.innerHTML = buildEmailField("reg-email");

  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected","false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected","true");
      document.getElementById("form-login")?.classList.toggle("hidden", tab.dataset.tab !== "login");
      document.getElementById("form-register")?.classList.toggle("hidden", tab.dataset.tab !== "register");
    });
  });

  document.getElementById("btn-login")?.addEventListener("click", async () => {
    const email = getEmailValue("login-email");
    const pass  = document.getElementById("login-pass")?.value;
    const err   = document.getElementById("login-error");
    if (!email || !pass) { showError(err, "Completa todos los campos"); return; }
    try {
      const userData = await SupabaseAuth.login({ correo: email, password: pass });
      APP.user = { name: `${userData.nombre} ${userData.apellido || ""}`.trim(), email: userData.correo };
      saveStorage(); updateAccountLabel(); renderProfile();
      showToast(`Bienvenido, ${APP.user.name} 👋`);
    } catch (e) { showError(err, e.message || "Error al iniciar sesión"); }
  });

  document.getElementById("btn-register")?.addEventListener("click", async () => {
    const name  = document.getElementById("reg-name")?.value.trim();
    const email = getEmailValue("reg-email");
    const pass  = document.getElementById("reg-pass")?.value;
    const err   = document.getElementById("reg-error");
    if (!name || !email || !pass) { showError(err, "Completa todos los campos"); return; }
    if (pass.length < 6) { showError(err, "Contraseña: mínimo 6 caracteres"); return; }
    try {
      const nameParts = name.split(" ");
      await SupabaseAuth.register({ nombre: nameParts[0], apellido: nameParts.slice(1).join(" ") || "", cedula: "", correo: email, password: pass });
      APP.user = { name, email };
      saveStorage(); updateAccountLabel(); renderProfile();
      showToast(`Cuenta creada. ¡Bienvenido, ${name}! 🎉`);
    } catch (e) { showError(err, e.message || "Error al registrar"); }
  });

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    showModal("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", () => {
      APP.user = null; saveStorage(); updateAccountLabel(); renderProfile();
      showToast("Sesión cerrada");
    });
  });

  document.querySelectorAll(".pass-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

  document.getElementById("pgo-fav")?.addEventListener("click",  () => { renderFavorites(); showScreen("favorites"); });
  document.getElementById("pgo-hist")?.addEventListener("click", () => { renderHistory();   showScreen("history"); });
}

function renderProfile() {
  const isLoggedIn = !!APP.user;
  document.getElementById("view-auth")?.classList.toggle("hidden", isLoggedIn);
  document.getElementById("view-profile")?.classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) {
    const pn = document.getElementById("profile-name");
    const pe = document.getElementById("profile-email");
    const pa = document.getElementById("profile-avatar");
    if (pn) pn.textContent = APP.user.name;
    if (pe) pe.textContent = APP.user.email;
    if (pa) pa.textContent = APP.user.name.charAt(0).toUpperCase();
    const fe = document.getElementById("pstat-fav");
    const he = document.getElementById("pstat-hist");
    if (fe) fe.textContent = APP.favorites.length;
    if (he) he.textContent = APP.history.length;
  }
}

function updateAccountLabel() {
  const el = document.getElementById("account-label");
  if (el) el.textContent = APP.user ? APP.user.name.split(" ")[0] : "Entrar";
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ─── MODAL ────────────────────────────────────────────────
function showModal(title, body, onConfirm) {
  const mt = document.getElementById("modal-title");
  const mb = document.getElementById("modal-body");
  if (mt) mt.textContent = title;
  if (mb) mb.textContent = body;
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn  = document.getElementById("modal-cancel");
  if (!confirmBtn || !cancelBtn) return;
  const newConfirm = confirmBtn.cloneNode(true);
  const newCancel  = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  newConfirm.addEventListener("click", () => { closeModal(); onConfirm(); });
  newCancel.addEventListener("click", closeModal);
  const overlay = document.getElementById("modal-overlay");
  if (overlay) { overlay.classList.add("is-open"); overlay.onclick = e => { if (e.target === overlay) closeModal(); }; }
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) { overlay.classList.remove("is-open"); overlay.onclick = null; }
}

// ─── TOAST ────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

// ─── A11Y ─────────────────────────────────────────────────
function initA11y() {
  const sizes = { sm:"14px", md:"16px", lg:"19px" };
  let cur = localStorage.getItem("bq_font") || "md";
  function setFont(s) {
    cur = s;
    document.documentElement.style.setProperty("--base-font", sizes[s]);
    document.querySelectorAll(".a11y-btn[id^=font]").forEach(b => b.classList.remove("active"));
    document.getElementById(`font-${s}`)?.classList.add("active");
    localStorage.setItem("bq_font", s);
  }
  document.getElementById("font-sm")?.addEventListener("click", () => setFont("sm"));
  document.getElementById("font-md")?.addEventListener("click", () => setFont("md"));
  document.getElementById("font-lg")?.addEventListener("click", () => setFont("lg"));
  setFont(cur);

  let hc = localStorage.getItem("bq_hc") === "1";
  const hcBtn = document.getElementById("btn-contrast");
  function setContrast(v) {
    hc = v;
    document.body.classList.toggle("high-contrast", v);
    if (hcBtn) { hcBtn.classList.toggle("active", v); hcBtn.setAttribute("aria-pressed", v.toString()); }
    localStorage.setItem("bq_hc", v ? "1" : "0");
  }
  hcBtn?.addEventListener("click", () => setContrast(!hc));
  setContrast(hc);
}

// ─── UTILS ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
