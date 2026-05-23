/* ══════════════════════════════════════
   BusQuito – Lógica completa
   ══════════════════════════════════════ */

// ─── STATE ─────────────────────────────────────────────────
const APP = {
  screen: "home",
  origin: null,      // sector id
  dest: null,        // sector id
  results: [],       // route results
  selectedRoute: null,
  user: null,        // { name, email } o null
  favorites: [],     // [{ origin, dest, label }]
  history: [],       // [{ origin, dest, label, date }]
  maps: {},          // leaflet map instances
};

// ─── INIT ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadStorage();
  initA11y();
  initSearch();
  initExpertSearch();
  initLiveCard();
  initQuickSectors();
  initNav();
  initAuth();
  initFilters();
  updateAccountLabel();
  initMapPicker();
});

// ─── STORAGE ───────────────────────────────────────────────
function loadStorage() {
  try {
    const u = localStorage.getItem("bq_user");
    if (u) APP.user = JSON.parse(u);
    const f = localStorage.getItem("bq_fav");
    if (f) APP.favorites = JSON.parse(f);
    const h = localStorage.getItem("bq_hist");
    if (h) APP.history = JSON.parse(h);
  } catch(e) {}
}
function saveStorage() {
  localStorage.setItem("bq_user", JSON.stringify(APP.user));
  localStorage.setItem("bq_fav",  JSON.stringify(APP.favorites));
  localStorage.setItem("bq_hist", JSON.stringify(APP.history));
}

// ─── NAVEGACIÓN ENTRE PANTALLAS ────────────────────────────
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  APP.screen = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Update nav active state
  ["home","favorites","history"].forEach(n => {
    const btn = document.getElementById("nav-" + n);
    if (btn) btn.classList.toggle("active", n === name);
  });
}

function initNav() {
  document.getElementById("nav-home").addEventListener("click", () => showScreen("home"));
  document.getElementById("nav-favorites").addEventListener("click", () => { renderFavorites(); showScreen("favorites"); });
  document.getElementById("nav-history").addEventListener("click", () => { renderHistory(); showScreen("history"); });
  document.getElementById("logo-home").addEventListener("click", e => { e.preventDefault(); showScreen("home"); });
  document.getElementById("btn-account").addEventListener("click", () => { renderProfile(); showScreen("account"); });
  document.getElementById("back-from-results").addEventListener("click", () => showScreen("home"));
  document.getElementById("back-from-detail").addEventListener("click", () => showScreen("results"));
  document.getElementById("back-from-fav").addEventListener("click", () => showScreen("home"));
  document.getElementById("back-from-hist").addEventListener("click", () => showScreen("home"));
  document.getElementById("back-from-account").addEventListener("click", () => showScreen("home"));
  document.getElementById("swap-mini").addEventListener("click", swapPlaces);
  document.getElementById("clear-hist").addEventListener("click", clearHistory);
  document.getElementById("fav-btn").addEventListener("click", toggleFavorite);

  // ESC closes confirmation modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("modal-overlay");
      if (overlay && !overlay.classList.contains("hidden")) closeModal();
    }
  });
}

// ─── BÚSQUEDA PRINCIPAL ─────────────────────────────────────
function initSearch() {
  const inOrigin = document.getElementById("input-origin");
  const inDest   = document.getElementById("input-dest");
  const btnSearch = document.getElementById("btn-search");
  const btnSwap   = document.getElementById("btn-swap");

  setupAutocomplete(inOrigin, "ac-origin", id => {
    APP.origin = id;
    checkSearchReady();
  });
  setupAutocomplete(inDest, "ac-dest", id => {
    APP.dest = id;
    checkSearchReady();
  });

  // Clear buttons
  document.querySelectorAll(".sf-clear").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      target.value = "";
      btn.classList.add("hidden");
      if (btn.dataset.target === "input-origin") APP.origin = null;
      else APP.dest = null;
      checkSearchReady();
      target.focus();
    });
  });

  // Input events to show/hide clear
  [inOrigin, inDest].forEach(inp => {
    inp.addEventListener("input", () => {
      const clearBtn = inp.parentElement.querySelector(".sf-clear");
      clearBtn.classList.toggle("hidden", inp.value.trim() === "");
      // Reset stored id when typing
      if (inp.id === "input-origin") APP.origin = null;
      else APP.dest = null;
      checkSearchReady();
    });
  });

  btnSearch.addEventListener("click", doSearch);
  btnSwap.addEventListener("click", swapPlaces);
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && APP.origin && APP.dest) doSearch();
  });
}

function checkSearchReady() {
  const btn = document.getElementById("btn-search");
  btn.disabled = !(APP.origin && APP.dest && APP.origin !== APP.dest);
}

function setupAutocomplete(input, listId, onSelect) {
  const list = document.getElementById(listId);

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { list.hidden = true; return; }

    const matches = SECTORS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.zona.includes(q)
    ).slice(0, 7);

    list.innerHTML = "";
    list.hidden = matches.length === 0;

    matches.forEach((s, i) => {
      const li = document.createElement("li");
      li.className = "ac-item";
      li.setAttribute("role", "option");
      li.setAttribute("tabindex", "-1");
      li.setAttribute("aria-label", `${s.name}, zona ${s.zona}`);
      li.innerHTML = `
        <span class="ac-icon zona-${s.zona}" aria-hidden="true">
          ${s.zona === "norte" ? "↑" : s.zona === "sur" ? "↓" : "◎"}
        </span>
        <span class="ac-name">${highlight(s.name, input.value.trim())}</span>
        <span class="ac-zona">${s.zona}</span>
      `;
      li.addEventListener("mousedown", e => {
        e.preventDefault();
        input.value = s.name;
        list.hidden = true;
        onSelect(s.id);
        input.parentElement.querySelector(".sf-clear").classList.remove("hidden");
      });
      li.addEventListener("keydown", e => {
        if (e.key === "Enter") { li.dispatchEvent(new MouseEvent("mousedown")); }
        if (e.key === "ArrowDown") { li.nextElementSibling?.focus(); }
        if (e.key === "ArrowUp") { li.previousElementSibling?.focus() ?? input.focus(); }
        if (e.key === "Escape") { list.hidden = true; input.focus(); }
      });
      list.appendChild(li);
    });
  });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list.querySelector(".ac-item")?.focus();
    }
    if (e.key === "Escape") { list.hidden = true; }
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(`#${listId}`) && e.target !== input) list.hidden = true;
  });
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
  return text.replace(re, "<mark>$1</mark>");
}

function swapPlaces() {
  const io = document.getElementById("input-origin");
  const id = document.getElementById("input-dest");
  [io.value, id.value] = [id.value, io.value];
  [APP.origin, APP.dest] = [APP.dest, APP.origin];
  // clear buttons visibility
  io.parentElement.querySelector(".sf-clear").classList.toggle("hidden", !io.value);
  id.parentElement.querySelector(".sf-clear").classList.toggle("hidden", !id.value);
  checkSearchReady();
  showToast("Origen y destino intercambiados");
}

function doSearch() {
  if (!APP.origin || !APP.dest) return;
  const originSector = SECTOR_BY_ID[APP.origin];
  const destSector   = SECTOR_BY_ID[APP.dest];
  if (!originSector || !destSector) { showToast("Selecciona sectores válidos"); return; }

  APP.results = findRoutes(APP.origin, APP.dest);

  // Guardar en historial
  const entry = {
    origin: APP.origin,
    dest: APP.dest,
    label: `${originSector.name} → ${destSector.name}`,
    date: new Date().toLocaleDateString("es-EC", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
  };
  APP.history = [entry, ...APP.history.filter(h => h.label !== entry.label)].slice(0, 20);
  saveStorage();

  renderResults();
  showScreen("results");
}

// ─── RESULTADOS ─────────────────────────────────────────────
function renderResults() {
  const originSector = SECTOR_BY_ID[APP.origin];
  const destSector   = SECTOR_BY_ID[APP.dest];

  // Trip summary
  document.getElementById("trip-summary").innerHTML = `
    <span class="ts-origin"><span class="ts-dot o-dot"></span>${originSector.name}</span>
    <span class="ts-arrow">→</span>
    <span class="ts-dest"><span class="ts-dot d-dot"></span>${destSector.name}</span>
  `;

  renderResultsList(APP.results);
  initResultsMap();
}

function renderResultsList(routes) {
  const list = document.getElementById("results-list");
  list.innerHTML = "";

  if (routes.length === 0) {
    list.innerHTML = `
      <div class="no-results">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r="26" stroke="#DDE3EC" stroke-width="2"/>
          <path d="M20 28h16M28 20v16" stroke="#DDE3EC" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <h3>Sin rutas directas encontradas</h3>
        <p>Intenta con sectores más cercanos o usa la búsqueda experta para encontrar la línea manualmente.</p>
        <button class="btn-outline" onclick="showScreen('home')">Cambiar búsqueda</button>
      </div>`;
    return;
  }

  routes.forEach((result, idx) => {
    const card = document.createElement("div");
    card.className = `result-card ${result.type}`;
    card.setAttribute("role", "article");
    card.setAttribute("aria-label", `Opción ${idx + 1}: ${result.type === "direct" ? "Ruta directa" : "Con transbordo"}`);

    const leg1 = result.legs[0];
    const leg2 = result.legs[1] || null;

    card.innerHTML = `
      <div class="rc-header">
        <div class="rc-badges">
          <span class="rc-type ${result.type}">${result.type === "direct" ? "🟢 Directa" : "🔵 Transbordo"}</span>
          <span class="rc-time" aria-label="${result.estimatedMin} minutos estimados">~${result.estimatedMin} min</span>
        </div>
        ${isFavorite(APP.origin, APP.dest) ? '<span class="rc-fav-badge" aria-label="Guardada en favoritos">⭐</span>' : ''}
      </div>

      <div class="rc-legs">
        <div class="rc-leg">
          <div class="rc-line-badge" style="background:${leg1.route.color}" aria-label="Línea ${leg1.route.linea}">${leg1.route.linea}</div>
          <div class="rc-leg-info">
            <div class="rc-empresa">${leg1.route.empresa}</div>
            <div class="rc-leg-path">
              <span class="rc-stop-a">${SECTOR_BY_ID[leg1.from]?.name}</span>
              <span class="rc-stops-count" aria-label="${leg1.stops.length - 1} paradas">${leg1.stops.length - 1} paradas</span>
              <span class="rc-stop-b">${SECTOR_BY_ID[leg1.to]?.name}</span>
            </div>
          </div>
        </div>

        ${leg2 ? `
        <div class="rc-transfer-hint" aria-label="Transbordo en ${SECTOR_BY_ID[result.transferStop]?.name}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v10M4 9l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Bajar en <strong>${SECTOR_BY_ID[result.transferStop]?.name}</strong> · Subir a línea ${leg2.route.linea}
        </div>
        <div class="rc-leg">
          <div class="rc-line-badge" style="background:${leg2.route.color}" aria-label="Línea ${leg2.route.linea}">${leg2.route.linea}</div>
          <div class="rc-leg-info">
            <div class="rc-empresa">${leg2.route.empresa}</div>
            <div class="rc-leg-path">
              <span class="rc-stop-a">${SECTOR_BY_ID[leg2.from]?.name}</span>
              <span class="rc-stops-count" aria-label="${leg2.stops.length - 1} paradas">${leg2.stops.length - 1} paradas</span>
              <span class="rc-stop-b">${SECTOR_BY_ID[leg2.to]?.name}</span>
            </div>
          </div>
        </div>` : ""}
      </div>

      <div class="rc-footer">
        <button class="rc-detail-btn" data-idx="${idx}" aria-label="Ver detalle de esta ruta">
          Ver paso a paso →
        </button>
        <div class="rc-meta">
          <span>${result.totalStops} paradas</span>
          ${result.transfers > 0 ? `<span>· ${result.transfers} transbordo</span>` : ""}
        </div>
      </div>
    `;

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
      if (filter === "direct") filtered = filtered.filter(r => r.type === "direct");
      if (filter === "transfer") filtered = filtered.filter(r => r.type === "transfer");
      if (filter === "fast") filtered = [...filtered].sort((a,b) => a.estimatedMin - b.estimatedMin);
      renderResultsList(filtered);
    });
  });
}

// ─── DETALLE ───────────────────────────────────────────────
function renderDetail(result) {
  const originSector = SECTOR_BY_ID[APP.origin];
  const destSector   = SECTOR_BY_ID[APP.dest];
  document.getElementById("detail-title").textContent =
    `${originSector.name} → ${destSector.name}`;

  // Actualizar botón favorito
  const favBtn = document.getElementById("fav-btn");
  const isF = isFavorite(APP.origin, APP.dest);
  favBtn.setAttribute("aria-pressed", isF.toString());
  favBtn.innerHTML = isF
    ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 17l-7-7a4 4 0 0 1 5.657-5.657L10 5.686l1.343-1.343A4 4 0 0 1 17 10l-7 7z"/></svg> Guardado`
    : `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 17l-7-7a4 4 0 0 1 5.657-5.657L10 5.686l1.343-1.343A4 4 0 0 1 17 10l-7 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> Guardar`;
  favBtn.classList.toggle("saved", isF);

  // Steps
  const stepsEl = document.getElementById("detail-steps");
  stepsEl.innerHTML = "";

  // Step: caminar al paradero de origen
  stepsEl.appendChild(makeStep("walk", `Dirígete al paradero en <strong>${originSector.name}</strong>`, null, "Busca las señales de parada de bus"));

  result.legs.forEach((leg, li) => {
    // Step: abordar bus
    stepsEl.appendChild(makeStep("bus",
      `Aborda la línea <strong style="color:${leg.route.color}">${leg.route.linea}</strong> – ${leg.route.empresa}`,
      leg.route.color,
      `En la parada de <strong>${SECTOR_BY_ID[leg.from]?.name}</strong>`
    ));

    // Paradas intermedias
    const intermedias = leg.stops.slice(1, -1);
    if (intermedias.length > 0) {
      const div = document.createElement("div");
      div.className = "step-stops-detail";
      div.innerHTML = `
        <button class="toggle-stops" aria-expanded="false" aria-controls="stops-${li}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 4v4M4 6h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Ver ${intermedias.length} paradas intermedias
        </button>
        <ul class="stops-list hidden" id="stops-${li}">
          ${intermedias.map(id => `<li class="stop-item">
            <span class="stop-item-dot" aria-hidden="true" style="background:${leg.route.color}"></span>
            ${SECTOR_BY_ID[id]?.name || id}
          </li>`).join("")}
        </ul>
      `;
      div.querySelector(".toggle-stops").addEventListener("click", function() {
        const ul = div.querySelector(".stops-list");
        const expanded = this.getAttribute("aria-expanded") === "true";
        ul.classList.toggle("hidden", expanded);
        this.setAttribute("aria-expanded", (!expanded).toString());
        this.innerHTML = expanded
          ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 4v4M4 6h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Ver ${intermedias.length} paradas intermedias`
          : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M4 6h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Ocultar paradas`;
      });
      stepsEl.appendChild(div);
    }

    // Step: bajarse o transbordo
    if (li < result.legs.length - 1) {
      stepsEl.appendChild(makeStep("transfer",
        `Bájate en <strong>${SECTOR_BY_ID[leg.to]?.name}</strong> y espera la siguiente línea`,
        null, "Transbordo · busca el paradero de la línea " + result.legs[li+1].route.linea
      ));
    } else {
      stepsEl.appendChild(makeStep("arrive",
        `Llega a <strong>${SECTOR_BY_ID[leg.to]?.name}</strong>`,
        null, "🎉 ¡Llegaste a tu destino!"
      ));
    }
  });

  // Info lateral
  const allStops = result.legs.flatMap(l => l.stops);
  const zonas = [...new Set(result.legs.map(l => SECTOR_BY_ID[l.from]?.zona))];
  document.getElementById("detail-info").innerHTML = `
    <div class="di-row"><span class="di-label">Tiempo estimado</span><span class="di-val">~${result.estimatedMin} min</span></div>
    <div class="di-row"><span class="di-label">Total paradas</span><span class="di-val">${result.totalStops}</span></div>
    <div class="di-row"><span class="di-label">Transbordos</span><span class="di-val">${result.transfers}</span></div>
    <div class="di-row"><span class="di-label">Líneas</span><span class="di-val">${result.legs.map(l => l.route.linea).join(", ")}</span></div>
    <div class="di-row"><span class="di-label">Tipo</span><span class="di-val ${result.type}">${result.type === "direct" ? "🟢 Directa" : "🔵 Con transbordo"}</span></div>
  `;

  // Tips
  const zona = zonas[0] || "centro";
  const tips = ROUTE_TIPS[zona] || ROUTE_TIPS.centro;
  const tip = tips[Math.floor(Math.random() * tips.length)];
  document.getElementById("detail-tips").innerHTML = `<div class="tip-box"><p>${tip}</p></div>`;

  // Mapa detalle
  initDetailMap(result);
}

function makeStep(type, mainText, color, subText) {
  const div = document.createElement("div");
  div.className = `route-step step-${type}`;
  const icons = { walk:"🚶", bus:"🚌", transfer:"🔄", arrive:"📍" };
  div.innerHTML = `
    <div class="rs-icon" aria-hidden="true" ${color ? `style="background:${color}20;border-color:${color}"` : ""}>${icons[type]}</div>
    <div class="rs-content">
      <div class="rs-main">${mainText}</div>
      ${subText ? `<div class="rs-sub">${subText}</div>` : ""}
    </div>
  `;
  return div;
}

// ─── MAPAS ─────────────────────────────────────────────────
function initResultsMap() {
  if (APP.maps.results) { APP.maps.results.remove(); delete APP.maps.results; }
  const m = L.map("results-map", { zoomControl:true }).setView([-0.21, -78.51], 12);
  APP.maps.results = m;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:"© OpenStreetMap", maxZoom:18
  }).addTo(m);

  // Mostrar origen y destino
  const o = SECTOR_BY_ID[APP.origin];
  const d = SECTOR_BY_ID[APP.dest];
  if (o) addMapMarker(m, o.lat, o.lng, o.name, "#27AE60");
  if (d) addMapMarker(m, d.lat, d.lng, d.name, "#FF6B2B");

  // Líneas de todas las rutas encontradas
  APP.results.forEach(result => {
    result.legs.forEach(leg => {
      const latlngs = leg.stops.map(id => {
        const s = SECTOR_BY_ID[id];
        return s ? [s.lat, s.lng] : null;
      }).filter(Boolean);
      L.polyline(latlngs, { color: leg.route.color, weight:3, opacity:.5, dashArray:"6 4" }).addTo(m);
    });
  });

  if (o && d) {
    m.fitBounds([[o.lat, o.lng],[d.lat, d.lng]], { padding:[30,30] });
  }
}

function initDetailMap(result) {
  if (APP.maps.detail) { APP.maps.detail.remove(); delete APP.maps.detail; }
  const m = L.map("detail-map", { zoomControl:true }).setView([-0.21,-78.51], 12);
  APP.maps.detail = m;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:"© OpenStreetMap", maxZoom:18
  }).addTo(m);

  const allCoords = [];
  result.legs.forEach(leg => {
    const latlngs = leg.stops.map(id => {
      const s = SECTOR_BY_ID[id];
      return s ? [s.lat, s.lng] : null;
    }).filter(Boolean);
    allCoords.push(...latlngs);
    L.polyline(latlngs, { color: leg.route.color, weight:4, opacity:.75 }).addTo(m);
    latlngs.forEach((ll, i) => {
      const id = leg.stops[i];
      const s = SECTOR_BY_ID[id];
      if (!s) return;
      const isKey = i === 0 || i === latlngs.length-1;
      addMapMarker(m, ll[0], ll[1], s.name, isKey ? leg.route.color : "#888", isKey ? 10 : 6);
    });
  });

  if (allCoords.length > 1) {
    m.fitBounds(allCoords, { padding:[24,24] });
  }
}

function addMapMarker(map, lat, lng, name, color="#FF6B2B", size=12) {
  const icon = L.divIcon({
    className:"",
    html:`<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.25);"></div>`,
    iconSize:[size,size], iconAnchor:[size/2,size/2],
  });
  L.marker([lat,lng],{icon}).addTo(map).bindTooltip(name,{direction:"top",offset:[0,-6]});
}

// ─── LIVE CARD (hero derecho) ────────────────────────────────
function initLiveCard() {
  const container = document.getElementById("lc-routes");
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
    div.setAttribute("role","button");
    div.setAttribute("tabindex","0");
    div.setAttribute("aria-label",`Ruta popular: ${trip.label}`);
    div.innerHTML = `
      <div class="lcr-path">${trip.label}</div>
      <div class="lcr-meta">${best ? `${best.legs.length > 1 ? "Transbordo" : "Directo"} · ~${best.estimatedMin} min` : "Ver rutas"}</div>
    `;
    div.addEventListener("click", () => {
      document.getElementById("input-origin").value = o.name;
      document.getElementById("input-dest").value = d.name;
      APP.origin = trip.from;
      APP.dest = trip.to;
      document.getElementById("input-origin").parentElement.querySelector(".sf-clear").classList.remove("hidden");
      document.getElementById("input-dest").parentElement.querySelector(".sf-clear").classList.remove("hidden");
      checkSearchReady();
      doSearch();
    });
    div.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") div.click(); });
    container.appendChild(div);
  });
}

// ─── SECTORES RÁPIDOS ────────────────────────────────────────
function initQuickSectors() {
  const container = document.getElementById("qs-chips");
  POPULAR_SECTORS.forEach(id => {
    const s = SECTOR_BY_ID[id];
    if (!s) return;
    const btn = document.createElement("button");
    btn.className = "qs-chip";
    btn.textContent = s.name;
    btn.setAttribute("aria-label",`Buscar rutas hacia ${s.name}`);
    btn.setAttribute("role","listitem");
    btn.addEventListener("click", () => {
      const inDest = document.getElementById("input-dest");
      inDest.value = s.name;
      APP.dest = s.id;
      inDest.parentElement.querySelector(".sf-clear").classList.remove("hidden");
      checkSearchReady();
      inDest.focus();
      showToast(`Destino: ${s.name}`);
    });
    container.appendChild(btn);
  });
}

// ─── BÚSQUEDA EXPERTA ────────────────────────────────────────
function initExpertSearch() {
  const input   = document.getElementById("expert-input");
  const results = document.getElementById("expert-results");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { results.hidden = true; return; }

    const matches = [];
    Object.entries(getAllRoutesByLinea()).forEach(([linea, route]) => {
      if (linea.includes(q) || route.empresa.toLowerCase().includes(q) ||
          route.stops.some(id => SECTOR_BY_ID[id]?.name.toLowerCase().includes(q))) {
        matches.push(route);
      }
    });

    results.innerHTML = "";
    results.hidden = matches.length === 0;

    matches.slice(0, 8).forEach(route => {
      const endA = SECTOR_BY_ID[route.stops[0]]?.name;
      const endB = SECTOR_BY_ID[route.stops[route.stops.length-1]]?.name;
      const li = document.createElement("li");
      li.className = "er-item";
      li.setAttribute("role","option");
      li.innerHTML = `
        <span class="er-badge" style="background:${route.color}">${route.linea}</span>
        <div class="er-info">
          <span class="er-empresa">${route.empresa}</span>
          <span class="er-path">${endA} ↔ ${endB}</span>
        </div>
        <button class="er-go" aria-label="Ver esta ruta">Ver →</button>
      `;
      li.querySelector(".er-go").addEventListener("click", () => {
        APP.origin = route.stops[0];
        APP.dest   = route.stops[route.stops.length - 1];
        const o = SECTOR_BY_ID[APP.origin];
        const d = SECTOR_BY_ID[APP.dest];
        document.getElementById("input-origin").value = o?.name || "";
        document.getElementById("input-dest").value   = d?.name || "";
        APP.results = findRoutes(APP.origin, APP.dest);
        renderResults();
        showScreen("results");
        results.hidden = true;
        document.getElementById("expert-panel").removeAttribute("open");
      });
      results.appendChild(li);
    });
  });

  document.addEventListener("click", e => {
    if (!e.target.closest("#expert-panel")) results.hidden = true;
  });
}

function getAllRoutesByLinea() {
  const map = {};
  ROUTES.forEach(r => { map[r.linea] = r; });
  return map;
}

// ─── FAVORITOS ─────────────────────────────────────────────
function isFavorite(orig, dest) {
  return APP.favorites.some(f => f.origin === orig && f.dest === dest);
}

function toggleFavorite() {
  if (!APP.user) {
    showToast("Inicia sesión para guardar favoritos");
    setTimeout(() => { renderProfile(); showScreen("account"); }, 1200);
    return;
  }
  const idx = APP.favorites.findIndex(f => f.origin === APP.origin && f.dest === APP.dest);
  if (idx === -1) {
    const o = SECTOR_BY_ID[APP.origin];
    const d = SECTOR_BY_ID[APP.dest];
    APP.favorites.push({ origin: APP.origin, dest: APP.dest, label: `${o?.name} → ${d?.name}` });
    showToast("⭐ Guardado en favoritos");
  } else {
    APP.favorites.splice(idx, 1);
    showToast("Eliminado de favoritos");
  }
  saveStorage();
  // Refresh fav button
  if (APP.selectedRoute) renderDetail(APP.selectedRoute);
  updateProfileStats();
}

function renderFavorites() {
  const list = document.getElementById("favorites-list");
  list.innerHTML = "";
  if (APP.favorites.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No tienes rutas guardadas aún.</p><p>Busca una ruta y toca <strong>Guardar</strong> en el detalle.</p></div>`;
    return;
  }
  APP.favorites.forEach((fav, i) => {
    const card = document.createElement("div");
    card.className = "fav-card";
    const routes = findRoutes(fav.origin, fav.dest);
    const best = routes[0];
    card.innerHTML = `
      <div class="fav-main">
        <div class="fav-label">${fav.label}</div>
        ${best ? `<div class="fav-meta">${best.type === "direct" ? "🟢 Directa" : "🔵 Transbordo"} · ${best.legs.map(l=>l.route.linea).join(" + ")} · ~${best.estimatedMin} min</div>` : ""}
      </div>
      <div class="fav-actions">
        <button class="fav-go" data-i="${i}" aria-label="Buscar esta ruta favorita">Buscar →</button>
        <button class="fav-del" data-i="${i}" aria-label="Eliminar de favoritos">🗑</button>
      </div>
    `;
    card.querySelector(".fav-go").addEventListener("click", () => {
      APP.origin = fav.origin;
      APP.dest   = fav.dest;
      const o = SECTOR_BY_ID[fav.origin];
      const d = SECTOR_BY_ID[fav.dest];
      document.getElementById("input-origin").value = o?.name || "";
      document.getElementById("input-dest").value   = d?.name || "";
      document.getElementById("input-origin").parentElement.querySelector(".sf-clear").classList.remove("hidden");
      document.getElementById("input-dest").parentElement.querySelector(".sf-clear").classList.remove("hidden");
      APP.results = findRoutes(fav.origin, fav.dest);
      renderResults();
      showScreen("results");
    });
    card.querySelector(".fav-del").addEventListener("click", () => {
      APP.favorites.splice(i, 1);
      saveStorage();
      renderFavorites();
      showToast("Eliminado de favoritos");
      updateProfileStats();
    });
    list.appendChild(card);
  });
}

// ─── HISTORIAL ─────────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  if (APP.history.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Tu historial de búsquedas aparecerá aquí.</p></div>`;
    return;
  }
  APP.history.forEach((entry, i) => {
    const card = document.createElement("div");
    card.className = "hist-card";
    card.innerHTML = `
      <div class="hist-main">
        <div class="hist-label">${entry.label}</div>
        <div class="hist-date">${entry.date}</div>
      </div>
      <button class="hist-go" data-i="${i}" aria-label="Repetir búsqueda: ${entry.label}">Repetir →</button>
    `;
    card.querySelector(".hist-go").addEventListener("click", () => {
      APP.origin = entry.origin;
      APP.dest   = entry.dest;
      const o = SECTOR_BY_ID[entry.origin];
      const d = SECTOR_BY_ID[entry.dest];
      document.getElementById("input-origin").value = o?.name || "";
      document.getElementById("input-dest").value   = d?.name || "";
      document.getElementById("input-origin").parentElement.querySelector(".sf-clear").classList.remove("hidden");
      document.getElementById("input-dest").parentElement.querySelector(".sf-clear").classList.remove("hidden");
      APP.results = findRoutes(entry.origin, entry.dest);
      renderResults();
      showScreen("results");
    });
    list.appendChild(card);
  });
}

function clearHistory() {
  showModal("Borrar historial", "¿Estás seguro de que quieres borrar todo tu historial?", () => {
    APP.history = [];
    saveStorage();
    renderHistory();
    updateProfileStats();
    showToast("Historial borrado");
  });
}

// ─── AUTH ──────────────────────────────────────────────────
function initAuth() {
  // Tabs
  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected","false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected","true");
      document.getElementById("form-login").classList.toggle("hidden",   tab.dataset.tab !== "login");
      document.getElementById("form-register").classList.toggle("hidden", tab.dataset.tab !== "register");
    });
  });
  document.querySelectorAll(".link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(`.auth-tab[data-tab="${btn.dataset.tab}"]`).click();
    });
  });

  // Login
  document.getElementById("btn-login").addEventListener("click", () => {
    const email = document.getElementById("login-email").value.trim();
    const pass  = document.getElementById("login-pass").value;
    const err   = document.getElementById("login-error");
    if (!email || !pass) { showError(err, "Completa todos los campos"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showError(err, "Correo inválido"); return; }
    // Simular auth (localStorage)
    const stored = localStorage.getItem("bq_accounts");
    const accounts = stored ? JSON.parse(stored) : {};
    if (!accounts[email]) { showError(err, "No existe una cuenta con ese correo"); return; }
    if (accounts[email].pass !== btoa(pass)) { showError(err, "Contraseña incorrecta"); return; }
    APP.user = { name: accounts[email].name, email };
    saveStorage();
    updateAccountLabel();
    renderProfile();
    showToast(`Bienvenido, ${APP.user.name} 👋`);
    err.classList.add("hidden");
  });

  // Register
  document.getElementById("btn-register").addEventListener("click", () => {
    const name  = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const pass  = document.getElementById("reg-pass").value;
    const err   = document.getElementById("reg-error");
    if (!name || !email || !pass) { showError(err, "Completa todos los campos"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showError(err, "Correo inválido"); return; }
    if (pass.length < 6) { showError(err, "La contraseña debe tener al menos 6 caracteres"); return; }
    const stored = localStorage.getItem("bq_accounts");
    const accounts = stored ? JSON.parse(stored) : {};
    if (accounts[email]) { showError(err, "Ya existe una cuenta con ese correo"); return; }
    accounts[email] = { name, pass: btoa(pass) };
    localStorage.setItem("bq_accounts", JSON.stringify(accounts));
    APP.user = { name, email };
    saveStorage();
    updateAccountLabel();
    renderProfile();
    showToast(`Cuenta creada. Bienvenido, ${name} 🎉`);
    err.classList.add("hidden");
  });

  // Password toggle
  document.querySelectorAll(".pass-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    showModal("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", () => {
      APP.user = null;
      saveStorage();
      updateAccountLabel();
      renderProfile();
      showToast("Sesión cerrada");
    });
  });

  // Profile nav
  document.getElementById("pgo-fav").addEventListener("click",  () => { renderFavorites(); showScreen("favorites"); });
  document.getElementById("pgo-hist").addEventListener("click", () => { renderHistory();   showScreen("history"); });
}

function renderProfile() {
  const isLoggedIn = !!APP.user;
  document.getElementById("view-auth").classList.toggle("hidden", isLoggedIn);
  document.getElementById("view-profile").classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) {
    document.getElementById("profile-name").textContent = APP.user.name;
    document.getElementById("profile-email").textContent = APP.user.email;
    document.getElementById("profile-avatar").textContent =
      APP.user.name.charAt(0).toUpperCase();
    updateProfileStats();
  }
}

function updateProfileStats() {
  const fe = document.getElementById("pstat-fav");
  const he = document.getElementById("pstat-hist");
  if (fe) fe.textContent = APP.favorites.length;
  if (he) he.textContent = APP.history.length;
}

function updateAccountLabel() {
  document.getElementById("account-label").textContent = APP.user ? APP.user.name.split(" ")[0] : "Entrar";
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ─── MODAL ────────────────────────────────────────────────
function showModal(title, body, onConfirm) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").textContent  = body;

  // Clone both buttons to wipe all previous listeners
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn  = document.getElementById("modal-cancel");
  const newConfirm = confirmBtn.cloneNode(true);
  const newCancel  = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancel,  cancelBtn);

  newConfirm.addEventListener("click", () => { closeModal(); onConfirm(); });
  newCancel.addEventListener("click",  closeModal);

  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("is-open");

  overlay.onclick = e => { if (e.target === overlay) closeModal(); };
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) { overlay.classList.remove("is-open"); overlay.onclick = null; }
}

// ─── TOAST ────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2400);
}

// ─── ACCESIBILIDAD ─────────────────────────────────────────
function initA11y() {
  const sizes = { sm:"14px", md:"16px", lg:"19px" };
  let cur = localStorage.getItem("bq_font") || "md";
  function setFont(s) {
    cur = s;
    document.documentElement.style.setProperty("--base-font", sizes[s]);
    document.querySelectorAll(".a11y-btn[id^=font]").forEach(b => b.classList.remove("active"));
    document.getElementById(`font-${s}`).classList.add("active");
    localStorage.setItem("bq_font", s);
  }
  document.getElementById("font-sm").addEventListener("click", () => setFont("sm"));
  document.getElementById("font-md").addEventListener("click", () => setFont("md"));
  document.getElementById("font-lg").addEventListener("click", () => setFont("lg"));
  setFont(cur);

  let hc = localStorage.getItem("bq_hc") === "1";
  const hcBtn = document.getElementById("btn-contrast");
  function setContrast(v) {
    hc = v;
    document.body.classList.toggle("high-contrast", v);
    hcBtn.classList.toggle("active", v);
    hcBtn.setAttribute("aria-pressed", v.toString());
    localStorage.setItem("bq_hc", v ? "1" : "0");
  }
  hcBtn.addEventListener("click", () => setContrast(!hc));
  setContrast(hc);
}

// ─── UTILS ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── MAP PICKER ───────────────────────────────────────────
const pickerState = {
  mode: null,          // "origin" | "dest"
  selectedId: null,
  map: null,
  markers: [],
};

function initMapPicker() {
  // Wire all "En mapa" buttons
  document.querySelectorAll(".map-pick-btn").forEach(btn => {
    btn.addEventListener("click", () => openMapPicker(btn.dataset.mode));
  });
  document.getElementById("map-modal-close").addEventListener("click", closeMapPicker);
  document.getElementById("map-confirm-btn").addEventListener("click", confirmMapSelection);

  // Close on overlay click
  document.getElementById("map-picker-modal").addEventListener("click", e => {
    if (e.target === document.getElementById("map-picker-modal")) closeMapPicker();
  });

  // ESC closes
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("map-picker-modal").classList.contains("hidden")) {
      closeMapPicker();
    }
  });
}

function openMapPicker(mode) {
  pickerState.mode = mode;
  pickerState.selectedId = mode === "origin" ? APP.origin : APP.dest;

  // Update modal header
  const isOrigin = mode === "origin";
  const indicator = document.getElementById("map-modal-indicator");
  indicator.className = "map-modal-indicator" + (isOrigin ? "" : " dest");
  document.getElementById("map-modal-title").textContent =
    isOrigin ? "Selecciona tu punto de origen" : "Selecciona tu destino";
  document.getElementById("map-modal-hint").textContent =
    isOrigin
      ? "Toca la parada desde donde saldrás"
      : "Toca la parada a la que quieres llegar";

  // Reset footer
  updatePickerDisplay(pickerState.selectedId);

  // Show modal
  document.getElementById("map-picker-modal").classList.add("is-open");
  document.body.style.overflow = "hidden";

  // Init map (destroy previous if any)
  if (pickerState.map) { pickerState.map.remove(); pickerState.map = null; }
  pickerState.markers = [];

  setTimeout(() => {
    const map = L.map("picker-map", { zoomControl: true }).setView([-0.21, -78.51], 12);
    pickerState.map = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 18,
    }).addTo(map);

    // Render all sectors as clickable markers
    SECTORS.forEach(sector => {
      const isSelected = sector.id === pickerState.selectedId;
      const icon = L.divIcon({
        className: "",
        html: `<div class="picker-marker zona-${sector.zona}${isSelected ? (isOrigin ? " selected-origin" : " selected-dest") : ""}"
                    tabindex="0" role="button"
                    aria-label="Parada: ${sector.name}, zona ${sector.zona}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([sector.lat, sector.lng], { icon })
        .addTo(map)
        .bindTooltip(`<strong>${sector.name}</strong><br><small>Zona ${sector.zona}</small>`, {
          direction: "top", offset: [0, -10], className: "picker-tooltip"
        });

      marker.on("click", () => selectPickerMarker(sector, map));

      const el = marker.getElement();
      if (el) {
        el.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPickerMarker(sector, map); }
        });
      }

      pickerState.markers.push({ marker, sector });
    });

    // Zoom to current selection if any
    if (pickerState.selectedId) {
      const s = SECTOR_BY_ID[pickerState.selectedId];
      if (s) map.setView([s.lat, s.lng], 14);
    }
  }, 80);
}

function selectPickerMarker(sector, map) {
  pickerState.selectedId = sector.id;
  const isOrigin = pickerState.mode === "origin";

  // Update all marker classes
  pickerState.markers.forEach(({ marker, sector: s }) => {
    const el = marker.getElement()?.querySelector(".picker-marker");
    if (!el) return;
    el.classList.remove("selected-origin", "selected-dest");
    if (s.id === sector.id) {
      el.classList.add(isOrigin ? "selected-origin" : "selected-dest");
    }
  });

  updatePickerDisplay(sector.id);
  showToast(isOrigin ? `Origen: ${sector.name}` : `Destino: ${sector.name}`);
}

function updatePickerDisplay(sectorId) {
  const display   = document.getElementById("map-selected-display");
  const confirmBtn = document.getElementById("map-confirm-btn");
  const isOrigin  = pickerState.mode === "origin";

  if (sectorId) {
    const s = SECTOR_BY_ID[sectorId];
    display.innerHTML = `
      <div class="msd-selected">
        <span class="msd-dot" style="background:${isOrigin ? "var(--green)" : "var(--orange)"}"></span>
        ${s ? s.name : sectorId}
        <span style="font-size:.72rem;color:var(--gray-text);font-weight:500">(zona ${s?.zona})</span>
      </div>`;
    confirmBtn.classList.remove("hidden");
  } else {
    display.innerHTML = `<span class="msd-placeholder">Ninguna parada seleccionada</span>`;
    confirmBtn.classList.add("hidden");
  }
}

function confirmMapSelection() {
  const mode = pickerState.mode;
  const sectorId = pickerState.selectedId;
  if (!sectorId) return;

  const s = SECTOR_BY_ID[sectorId];
  if (!s) return;

  if (mode === "origin") {
    APP.origin = sectorId;
    const inp = document.getElementById("input-origin");
    inp.value = s.name;
    inp.parentElement.querySelector(".sf-clear").classList.remove("hidden");
  } else {
    APP.dest = sectorId;
    const inp = document.getElementById("input-dest");
    inp.value = s.name;
    inp.parentElement.querySelector(".sf-clear").classList.remove("hidden");
  }

  checkSearchReady();
  closeMapPicker();

  // Si ya hay origen y destino, ofrecemos buscar automáticamente
  if (APP.origin && APP.dest) {
    setTimeout(() => {
      showToast("✅ Origen y destino listos. Toca 'Buscar rutas'.");
    }, 300);
  }
}

function closeMapPicker() {
  document.getElementById("map-picker-modal").classList.remove("is-open");
  document.body.style.overflow = "";
  if (pickerState.map) { pickerState.map.remove(); pickerState.map = null; }
  pickerState.markers = [];
}
