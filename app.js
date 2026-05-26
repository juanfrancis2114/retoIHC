/* ══════════════════════════════════════
   BusQuito – app.js  (v3 – fix null checks)
   ══════════════════════════════════════ */

const APP = {
  screen: "home",
  origin: null,
  dest: null,
  results: [],
  selectedRoute: null,
  originLatLng: null,
  destLatLng:   null,
  user: null,
  favorites: [],
  history: [],
  maps: {},
};

document.addEventListener("DOMContentLoaded", async () => {
  await initData();
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

// ─── NAVEGACIÓN ────────────────────────────────────────────
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
  safe("nav-home",           () => showScreen("home"));
  safe("nav-favorites",      () => { renderFavorites(); showScreen("favorites"); });
  safe("nav-history",        () => { renderHistory();   showScreen("history"); });
  safe("logo-home",          e  => { e.preventDefault(); showScreen("home"); });
  safe("btn-account",        () => { renderProfile(); showScreen("account"); });
  safe("back-from-results",  () => showScreen("home"));
  safe("back-from-detail",   () => showScreen("results"));
  safe("back-from-fav",      () => showScreen("home"));
  safe("back-from-hist",     () => showScreen("home"));
  safe("back-from-account",  () => showScreen("home"));
  safe("swap-mini",          () => swapPlaces());
  safe("clear-hist",         () => clearHistory());
  safe("fav-btn",            () => toggleFavorite());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("modal-overlay");
      if (overlay && overlay.classList.contains("is-open")) closeModal();
    }
  });
}

// ─── BÚSQUEDA PRINCIPAL ────────────────────────────────────
function initSearch() {
  const inOrigin  = document.getElementById("input-origin");
  const inDest    = document.getElementById("input-dest");
  const btnSearch = document.getElementById("btn-search");
  const btnSwap   = document.getElementById("btn-swap");
  if (!inOrigin || !inDest || !btnSearch) return;

  setupAutocomplete(inOrigin, "ac-origin", id => { APP.origin = id; APP.originLatLng = null; checkSearchReady(); });
  setupAutocomplete(inDest,   "ac-dest",   id => { APP.dest   = id; APP.destLatLng   = null; checkSearchReady(); });

  document.querySelectorAll(".sf-clear").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.value = "";
      btn.classList.add("hidden");
      if (btn.dataset.target === "input-origin") {
        APP.origin = null; APP.originLatLng = null;
      } else {
        APP.dest = null; APP.destLatLng = null;
      }
      checkSearchReady();
      target.focus();
    });
  });

  [inOrigin, inDest].forEach(inp => {
    inp.addEventListener("input", () => {
      const clearBtn = inp.parentElement.querySelector(".sf-clear");
      if (clearBtn) clearBtn.classList.toggle("hidden", inp.value.trim() === "");
      if (inp.id === "input-origin") { APP.origin = null; APP.originLatLng = null; }
      else                           { APP.dest   = null; APP.destLatLng   = null; }
      checkSearchReady();
    });
  });

  btnSearch.addEventListener("click", doSearch);
  if (btnSwap) btnSwap.addEventListener("click", swapPlaces);
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !btnSearch.disabled) doSearch();
  });
}

function checkSearchReady() {
  const btn = document.getElementById("btn-search");
  if (!btn) return;
  const hasOrigin = APP.origin || APP.originLatLng;
  const hasDest   = APP.dest   || APP.destLatLng;
  const sameStop  = APP.origin && APP.dest && APP.origin === APP.dest;
  btn.disabled = !(hasOrigin && hasDest && !sameStop);
}

function setupAutocomplete(input, listId, onSelect) {
  const list = document.getElementById(listId);
  if (!list) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { list.hidden = true; return; }
    const matches = SECTORS.filter(s =>
      s.name.toLowerCase().includes(q) || s.zona.includes(q)
    ).slice(0, 7);
    list.innerHTML = "";
    list.hidden = matches.length === 0;
    matches.forEach(s => {
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
        <span class="ac-zona">${s.zona}</span>`;
      li.addEventListener("mousedown", e => {
        e.preventDefault();
        input.value = s.name;
        list.hidden = true;
        onSelect(s.id);
        const clr = input.parentElement.querySelector(".sf-clear");
        if (clr) clr.classList.remove("hidden");
      });
      li.addEventListener("keydown", e => {
        if (e.key === "Enter")     { li.dispatchEvent(new MouseEvent("mousedown")); }
        if (e.key === "ArrowDown") { li.nextElementSibling?.focus(); }
        if (e.key === "ArrowUp")   { li.previousElementSibling?.focus() ?? input.focus(); }
        if (e.key === "Escape")    { list.hidden = true; input.focus(); }
      });
      list.appendChild(li);
    });
  });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); list.querySelector(".ac-item")?.focus(); }
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
  if (!io || !id) return;
  [io.value, id.value]               = [id.value, io.value];
  [APP.origin,      APP.dest]         = [APP.dest,       APP.origin];
  [APP.originLatLng, APP.destLatLng]  = [APP.destLatLng, APP.originLatLng];
  const clo = io.parentElement.querySelector(".sf-clear");
  const cld = id.parentElement.querySelector(".sf-clear");
  if (clo) clo.classList.toggle("hidden", !io.value);
  if (cld) cld.classList.toggle("hidden", !id.value);
  checkSearchReady();
  showToast("Origen y destino intercambiados");
}

function doSearch() {
  const hasOrigin = APP.origin || APP.originLatLng;
  const hasDest   = APP.dest   || APP.destLatLng;
  if (!hasOrigin || !hasDest) return;
  if (!APP.origin || !APP.dest) { showToast("Selecciona un sector o parada válida"); return; }

  APP.results = findRoutes(APP.origin, APP.dest);

  const o = SECTOR_BY_ID[APP.origin];
  const d = SECTOR_BY_ID[APP.dest];
  if (o && d) {
    const entry = {
      origin: APP.origin, dest: APP.dest,
      label: `${o.name} → ${d.name}`,
      date: new Date().toLocaleDateString("es-EC", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }),
    };
    APP.history = [entry, ...APP.history.filter(h => h.label !== entry.label)].slice(0, 20);
    saveStorage();
  }

  renderResults();
  showScreen("results");
}

// ─── RESULTADOS ────────────────────────────────────────────
function renderResults() {
  const o = SECTOR_BY_ID[APP.origin];
  const d = SECTOR_BY_ID[APP.dest];
  const oName = o?.name || "Origen";
  const dName = d?.name || "Destino";

  const ts = document.getElementById("trip-summary");
  if (ts) ts.innerHTML = `
    <span class="ts-origin"><span class="ts-dot o-dot"></span>${oName}</span>
    <span class="ts-arrow">→</span>
    <span class="ts-dest"><span class="ts-dot d-dot"></span>${dName}</span>`;

  renderResultsList(APP.results);
  initResultsMap();
}

function renderResultsList(routes) {
  const list = document.getElementById("results-list");
  if (!list) return;
  list.innerHTML = "";

  if (routes.length === 0) {
    list.innerHTML = `
      <div class="no-results">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r="26" stroke="#DDE3EC" stroke-width="2"/>
          <path d="M20 28h16M28 20v16" stroke="#DDE3EC" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <h3>Sin rutas encontradas</h3>
        <p>Intenta con sectores más cercanos o usa la búsqueda experta.</p>
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
              <span class="rc-stop-a">${SECTOR_BY_ID[leg1.from]?.name || leg1.from}</span>
              <span class="rc-stops-count">${leg1.stops.length - 1} paradas</span>
              <span class="rc-stop-b">${SECTOR_BY_ID[leg1.to]?.name || leg1.to}</span>
            </div>
          </div>
        </div>
        ${leg2 ? `
        <div class="rc-transfer-hint">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v10M4 9l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Bajar en <strong>${SECTOR_BY_ID[result.transferStop]?.name}</strong> · Subir a línea ${leg2.route.linea}
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
        <button class="rc-detail-btn" data-idx="${idx}" aria-label="Ver detalle de esta ruta">Ver paso a paso →</button>
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

// ─── DETALLE ───────────────────────────────────────────────
function renderDetail(result) {
  const o = SECTOR_BY_ID[APP.origin];
  const d = SECTOR_BY_ID[APP.dest];
  const titleEl = document.getElementById("detail-title");
  if (titleEl) titleEl.textContent = `${o?.name || "Origen"} → ${d?.name || "Destino"}`;

  const favBtn = document.getElementById("fav-btn");
  if (favBtn) {
    const isF = isFavorite(APP.origin, APP.dest);
    favBtn.setAttribute("aria-pressed", isF.toString());
    favBtn.innerHTML = isF
      ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 17l-7-7a4 4 0 0 1 5.657-5.657L10 5.686l1.343-1.343A4 4 0 0 1 17 10l-7 7z"/></svg> Guardado`
      : `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 17l-7-7a4 4 0 0 1 5.657-5.657L10 5.686l1.343-1.343A4 4 0 0 1 17 10l-7 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> Guardar`;
    favBtn.classList.toggle("saved", isF);
  }

  const stepsEl = document.getElementById("detail-steps");
  if (!stepsEl) return;
  stepsEl.innerHTML = "";
  stepsEl.appendChild(makeStep("walk",
    `Dirígete al paradero en <strong>${o?.name || "tu ubicación"}</strong>`,
    null, "Busca las señales de parada de bus"));

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
        <button class="toggle-stops" aria-expanded="false" aria-controls="stops-${li}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 4v4M4 6h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Ver ${intermedias.length} paradas intermedias
        </button>
        <ul class="stops-list hidden" id="stops-${li}">
          ${intermedias.map(id => `<li class="stop-item">
            <span class="stop-item-dot" aria-hidden="true" style="background:${leg.route.color}"></span>
            ${SECTOR_BY_ID[id]?.name || id}
          </li>`).join("")}
        </ul>`;
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

    if (li < result.legs.length - 1) {
      stepsEl.appendChild(makeStep("transfer",
        `Bájate en <strong>${SECTOR_BY_ID[leg.to]?.name}</strong> y espera la siguiente línea`,
        null, "Transbordo · busca el paradero de la línea " + result.legs[li+1].route.linea));
    } else {
      stepsEl.appendChild(makeStep("arrive",
        `Llega a <strong>${SECTOR_BY_ID[leg.to]?.name || "tu destino"}</strong>`,
        null, "🎉 ¡Llegaste a tu destino!"));
    }
  });

  const infoEl = document.getElementById("detail-info");
  if (infoEl) infoEl.innerHTML = `
    <div class="di-row"><span class="di-label">Tiempo estimado</span><span class="di-val">~${result.estimatedMin} min</span></div>
    <div class="di-row"><span class="di-label">Total paradas</span><span class="di-val">${result.totalStops}</span></div>
    <div class="di-row"><span class="di-label">Transbordos</span><span class="di-val">${result.transfers}</span></div>
    <div class="di-row"><span class="di-label">Líneas</span><span class="di-val">${result.legs.map(l => l.route.linea).join(", ")}</span></div>
    <div class="di-row"><span class="di-label">Tipo</span><span class="di-val ${result.type}">${result.type === "direct" ? "🟢 Directa" : "🔵 Con transbordo"}</span></div>`;

  const zona  = SECTOR_BY_ID[result.legs[0]?.from]?.zona || "centro";
  const tips  = ROUTE_TIPS[zona] || ROUTE_TIPS.centro;
  const tipsEl = document.getElementById("detail-tips");
  if (tipsEl) tipsEl.innerHTML =
    `<div class="tip-box"><p>${tips[Math.floor(Math.random() * tips.length)]}</p></div>`;

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
    </div>`;
  return div;
}

// ─── LIVE CARD ─────────────────────────────────────────────
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
    const best   = routes[0];
    const div = document.createElement("div");
    div.className = "lc-route";
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");
    div.setAttribute("aria-label", `Ruta popular: ${trip.label}`);
    div.innerHTML = `
      <div class="lcr-path">${trip.label}</div>
      <div class="lcr-meta">${best ? `${best.legs.length > 1 ? "Transbordo" : "Directo"} · ~${best.estimatedMin} min` : "Ver rutas"}</div>`;
    div.addEventListener("click", () => {
      const io = document.getElementById("input-origin");
      const id = document.getElementById("input-dest");
      if (io) io.value = o.name;
      if (id) id.value = d.name;
      APP.origin = trip.from; APP.originLatLng = null;
      APP.dest   = trip.to;   APP.destLatLng   = null;
      if (io) io.parentElement.querySelector(".sf-clear")?.classList.remove("hidden");
      if (id) id.parentElement.querySelector(".sf-clear")?.classList.remove("hidden");
      checkSearchReady();
      doSearch();
    });
    div.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") div.click(); });
    container.appendChild(div);
  });
}

// ─── SECTORES RÁPIDOS ──────────────────────────────────────
function initQuickSectors() {
  const container = document.getElementById("qs-chips");
  if (!container) return;
  if (!POPULAR_SECTORS || POPULAR_SECTORS.length === 0) return;
  POPULAR_SECTORS.forEach(id => {
    const s = SECTOR_BY_ID[id];
    if (!s) return;
    const btn = document.createElement("button");
    btn.className = "qs-chip";
    btn.textContent = s.name;
    btn.setAttribute("aria-label", `Buscar rutas hacia ${s.name}`);
    btn.addEventListener("click", () => {
      const inDest = document.getElementById("input-dest");
      if (!inDest) return;
      inDest.value = s.name;
      APP.dest = s.id; APP.destLatLng = null;
      inDest.parentElement.querySelector(".sf-clear")?.classList.remove("hidden");
      checkSearchReady();
      showToast(`Destino: ${s.name}`);
    });
    container.appendChild(btn);
  });
}

// ─── BÚSQUEDA EXPERTA ──────────────────────────────────────
function initExpertSearch() {
  const input   = document.getElementById("expert-input");
  const results = document.getElementById("expert-results");
  if (!input || !results) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { results.hidden = true; return; }
    const matches = [];
    ROUTES.forEach(route => {
      if (route.linea.toLowerCase().includes(q) ||
          route.empresa.toLowerCase().includes(q) ||
          route.stops.some(id => SECTOR_BY_ID[id]?.name.toLowerCase().includes(q))) {
        matches.push(route);
      }
    });
    results.innerHTML = "";
    results.hidden = matches.length === 0;
    matches.slice(0, 8).forEach(route => {
      const endA = SECTOR_BY_ID[route.stops[0]]?.name || "—";
      const endB = SECTOR_BY_ID[route.stops[route.stops.length-1]]?.name || "—";
      const li = document.createElement("li");
      li.className = "er-item";
      li.setAttribute("role", "option");
      li.innerHTML = `
        <span class="er-badge" style="background:${route.color}">${route.linea}</span>
        <div class="er-info">
          <span class="er-empresa">${route.empresa}</span>
          <span class="er-path">${endA} ↔ ${endB}</span>
        </div>
        <button class="er-go" aria-label="Ver esta ruta">Ver →</button>`;
      li.querySelector(".er-go").addEventListener("click", () => {
        APP.origin = route.stops[0]; APP.originLatLng = null;
        APP.dest   = route.stops[route.stops.length - 1]; APP.destLatLng = null;
        const o = SECTOR_BY_ID[APP.origin];
        const d = SECTOR_BY_ID[APP.dest];
        const io = document.getElementById("input-origin");
        const id = document.getElementById("input-dest");
        if (io) io.value = o?.name || "";
        if (id) id.value = d?.name || "";
        APP.results = findRoutes(APP.origin, APP.dest);
        renderResults();
        showScreen("results");
        results.hidden = true;
        const panel = document.getElementById("expert-panel");
        if (panel) panel.removeAttribute("open");
      });
      results.appendChild(li);
    });
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#expert-panel")) results.hidden = true;
  });
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
  if (APP.selectedRoute) renderDetail(APP.selectedRoute);
  updateProfileStats();
}

function renderFavorites() {
  const list = document.getElementById("favorites-list");
  if (!list) return;
  list.innerHTML = "";
  if (APP.favorites.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No tienes rutas guardadas aún.</p><p>Busca una ruta y toca <strong>Guardar</strong>.</p></div>`;
    return;
  }
  APP.favorites.forEach((fav, i) => {
    const card = document.createElement("div");
    card.className = "fav-card";
    const routes = findRoutes(fav.origin, fav.dest);
    const best   = routes[0];
    card.innerHTML = `
      <div class="fav-main">
        <div class="fav-label">${fav.label}</div>
        ${best ? `<div class="fav-meta">${best.type === "direct" ? "🟢 Directa" : "🔵 Transbordo"} · ${best.legs.map(l=>l.route.linea).join(" + ")} · ~${best.estimatedMin} min</div>` : ""}
      </div>
      <div class="fav-actions">
        <button class="fav-go" aria-label="Buscar esta ruta">Buscar →</button>
        <button class="fav-del" aria-label="Eliminar de favoritos">🗑</button>
      </div>`;
    card.querySelector(".fav-go").addEventListener("click", () => {
      APP.origin = fav.origin; APP.dest = fav.dest;
      APP.originLatLng = null; APP.destLatLng = null;
      const o = SECTOR_BY_ID[fav.origin];
      const d = SECTOR_BY_ID[fav.dest];
      const io = document.getElementById("input-origin");
      const id = document.getElementById("input-dest");
      if (io) { io.value = o?.name || ""; io.parentElement.querySelector(".sf-clear")?.classList.remove("hidden"); }
      if (id) { id.value = d?.name || ""; id.parentElement.querySelector(".sf-clear")?.classList.remove("hidden"); }
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
  if (!list) return;
  list.innerHTML = "";
  if (APP.history.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Tu historial aparecerá aquí.</p></div>`;
    return;
  }
  APP.history.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "hist-card";
    card.innerHTML = `
      <div class="hist-main">
        <div class="hist-label">${entry.label}</div>
        <div class="hist-date">${entry.date}</div>
      </div>
      <button class="hist-go" aria-label="Repetir búsqueda: ${entry.label}">Repetir →</button>`;
    card.querySelector(".hist-go").addEventListener("click", () => {
      APP.origin = entry.origin; APP.dest = entry.dest;
      APP.originLatLng = null;   APP.destLatLng = null;
      const o = SECTOR_BY_ID[entry.origin];
      const d = SECTOR_BY_ID[entry.dest];
      const io = document.getElementById("input-origin");
      const id = document.getElementById("input-dest");
      if (io) { io.value = o?.name || ""; io.parentElement.querySelector(".sf-clear")?.classList.remove("hidden"); }
      if (id) { id.value = d?.name || ""; id.parentElement.querySelector(".sf-clear")?.classList.remove("hidden"); }
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
const ALLOWED_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com"];

function validateEmail(email) {
  const parts = email.split("@");
  if (parts.length !== 2) return { ok: false, msg: "El correo debe tener exactamente un @" };
  const [local, domain] = parts;
  if (!local || local.length < 1) return { ok: false, msg: "Escribe el nombre antes del @" };
  if (!ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
    return { ok: false, msg: `Solo se permiten: @gmail.com, @hotmail.com, @outlook.com` };
  }
  return { ok: true };
}

function buildEmailField(inputId) {
  return `
    <div class="email-input-group">
      <input id="${inputId}" type="text" placeholder="Tu correo" autocomplete="off" class="email-local-input"/>
      <span class="email-at">@</span>
      <select id="${inputId}-domain" class="email-domain-select" aria-label="Seleccionar dominio de correo">
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
      const fl = document.getElementById("form-login");
      const fr = document.getElementById("form-register");
      if (fl) fl.classList.toggle("hidden", tab.dataset.tab !== "login");
      if (fr) fr.classList.toggle("hidden", tab.dataset.tab !== "register");
    });
  });
  document.querySelectorAll(".link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(`.auth-tab[data-tab="${btn.dataset.tab}"]`)?.click();
    });
  });

  const btnLogin = document.getElementById("btn-login");
  if (btnLogin) btnLogin.addEventListener("click", async () => {
    const email = getEmailValue("login-email");
    const pass  = document.getElementById("login-pass")?.value;
    const err   = document.getElementById("login-error");
    if (!email || !pass) { showError(err, "Completa todos los campos"); return; }
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) { showError(err, emailCheck.msg); return; }
    try {
      const userData = await SupabaseAuth.login({ correo: email, password: pass });
      APP.user = { name: `${userData.nombre} ${userData.apellido || ""}`.trim(), email: userData.correo };
      saveStorage(); updateAccountLabel(); renderProfile();
      showToast(`Bienvenido, ${APP.user.name} 👋`);
      if (err) err.classList.add("hidden");
      return;
    } catch (supaErr) {}
    const accounts = getAccounts();
    if (!accounts[email]) { showError(err, "No existe una cuenta con ese correo"); return; }
    const hash = await sha256(pass);
    if (accounts[email].pass !== hash && accounts[email].pass !== btoa(pass)) {
      showError(err, "Contraseña incorrecta"); return;
    }
    APP.user = { name: accounts[email].name, email };
    saveStorage(); updateAccountLabel(); renderProfile();
    showToast(`Bienvenido, ${APP.user.name} 👋`);
    if (err) err.classList.add("hidden");
  });

  const btnRegister = document.getElementById("btn-register");
  if (btnRegister) btnRegister.addEventListener("click", async () => {
    const name  = document.getElementById("reg-name")?.value.trim();
    const email = getEmailValue("reg-email");
    const pass  = document.getElementById("reg-pass")?.value;
    const err   = document.getElementById("reg-error");
    if (!name || !email || !pass) { showError(err, "Completa todos los campos"); return; }
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) { showError(err, emailCheck.msg); return; }
    if (pass.length < 6) { showError(err, "La contraseña debe tener al menos 6 caracteres"); return; }
    try {
      const nameParts = name.trim().split(" ");
      await SupabaseAuth.register({ nombre: nameParts[0], apellido: nameParts.slice(1).join(" ") || "", cedula: "", correo: email, password: pass });
      APP.user = { name, email };
      saveStorage(); updateAccountLabel(); renderProfile();
      showToast(`Cuenta creada. ¡Bienvenido, ${name}! 🎉`);
      if (err) err.classList.add("hidden");
      return;
    } catch (supaErr) {
      if (supaErr.message?.includes("registrado") || supaErr.message?.includes("duplicado")) {
        showError(err, supaErr.message); return;
      }
    }
    const accounts = getAccounts();
    if (accounts[email]) { showError(err, "Ya existe una cuenta con ese correo"); return; }
    const hash = await sha256(pass);
    accounts[email] = { name, pass: hash };
    localStorage.setItem("bq_accounts", JSON.stringify(accounts));
    APP.user = { name, email };
    saveStorage(); updateAccountLabel(); renderProfile();
    showToast(`Cuenta creada. ¡Bienvenido, ${name}! 🎉`);
    if (err) err.classList.add("hidden");
  });

  document.querySelectorAll(".pass-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", () => {
    showModal("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", () => {
      APP.user = null; saveStorage(); updateAccountLabel(); renderProfile();
      showToast("Sesión cerrada");
    });
  });

  document.getElementById("pgo-fav")?.addEventListener("click",  () => { renderFavorites(); showScreen("favorites"); });
  document.getElementById("pgo-hist")?.addEventListener("click", () => { renderHistory();   showScreen("history"); });
}

function getAccounts() {
  try { return JSON.parse(localStorage.getItem("bq_accounts") || "{}"); } catch { return {}; }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function renderProfile() {
  const isLoggedIn = !!APP.user;
  document.getElementById("view-auth")?.classList.toggle("hidden", isLoggedIn);
  document.getElementById("view-profile")?.classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) {
    const pn = document.getElementById("profile-name");
    const pe = document.getElementById("profile-email");
    const pa = document.getElementById("profile-avatar");
    if (pn) pn.textContent  = APP.user.name;
    if (pe) pe.textContent  = APP.user.email;
    if (pa) pa.textContent  = APP.user.name.charAt(0).toUpperCase();
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
  cancelBtn.parentNode.replaceChild(newCancel,  cancelBtn);
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
    const el = document.getElementById(`font-${s}`);
    if (el) el.classList.add("active");
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
  for (let i = arr.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
