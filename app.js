/* ══════════════════════════════════════
   BusQuito – Lógica principal
   ══════════════════════════════════════ */

// ─── 1. DATA POR ZONA ──────────────────────────────────────
const ZONAS = {
  norte: {
    label: "Norte",
    empresas: {
      "Catar": [
        { ruta: "113", nombre: "Marín – Carcelén", flota: 30 },
        { ruta: "62",  nombre: "Ejido – Carcelén – Josefina", flota: 20 },
        { ruta: "61",  nombre: "Ejido – Av. Eloy Alfaro – Carcelén Bajo", flota: 29 },
        { ruta: "63",  nombre: "Carcelén – 6 de Diciembre – Don Bosco", flota: 0 },
        { ruta: "130", nombre: "Pulida – Estadio Olímpico", flota: 13 },
      ],
      "Monserrat": [
        { ruta: "30", nombre: "Marín – Carcelén Bajo", flota: 22 },
        { ruta: "31", nombre: "Marianitas – San José de Morán – Estadio Olímpico", flota: 5 },
      ],
      "Alborada": [
        { ruta: "143", nombre: "Atucucho – Comité del Pueblo", flota: 0 },
        { ruta: "22",  nombre: "Marín – Estadio – Comité del Pueblo", flota: 30 },
      ],
      "Quiteño Libre": [
        { ruta: "119", nombre: "Marín – Zona 11 (Comité del Pueblo)", flota: 0 },
        { ruta: "118", nombre: "Marín – Quintana – Carmen Bajo", flota: 12 },
      ],
      "Guadalajara": [
        { ruta: "09", nombre: "Pueblo Blanco – Comité del Pueblo – Congreso", flota: 25 },
      ],
      "Paquisha": [
        { ruta: "74", nombre: "Ejido – Cotocollao – Machala – 23 de Junio", flota: 17 },
      ],
      "Águila Dorada": [
        { ruta: "71",  nombre: "Congreso – Condado – Velasco", flota: 27 },
        { ruta: "102", nombre: "La Planada – El Labrador", flota: 25 },
        { ruta: "153", nombre: "Roldós – Estadio Olímpico – Jardín", flota: 0 },
      ],
      "Rapitrans": [
        { ruta: "154", nombre: "Planada – Colinas del Norte – Marín", flota: 23 },
      ],
      "San Carlos": [
        { ruta: "53", nombre: "Rancho Alto – Planada – Cotocollao – Los Arupos", flota: 0 },
        { ruta: "55", nombre: "Tiwintza – Plan Techo – Cotocollao – Terminal Carcelén", flota: 0 },
        { ruta: "89", nombre: "La Roldós – Occidental – La Magdalena", flota: 19 },
        { ruta: "88", nombre: "Estadio de la Liga – Occidental – La Magdalena", flota: 21 },
        { ruta: "51", nombre: "Atucucho – Occidental – La Magdalena", flota: 0 },
        { ruta: "52", nombre: "Atucucho – Seminario Mayor", flota: 0 },
      ],
      "Transporsel (Norte)": [
        { ruta: "99", nombre: "Babilonia – San Juan – Carapungo – Ejido", flota: 26 },
        { ruta: "98", nombre: "Luz y Vida – Carapungo – Ejido", flota: 14 },
      ],
      "Transhemisféricos Mitad del Mundo": [
        { ruta: "66", nombre: "San Vicente – Ejido", flota: 9 },
      ],
      "Semgyllfor": [
        { ruta: "69", nombre: "Ciudad Bicentenario – Carapungo – Ejido", flota: 11 },
      ],
      "Calderón": [
        { ruta: "161", nombre: "Pomasqui – Bicentenario – Naciones Unidas", flota: 0 },
        { ruta: "162", nombre: "San Juan de Calderón – Naciones Unidas", flota: 0 },
      ],
      "San Juan": [
        { ruta: "150", nombre: "Ana María – San Juan – Ofelia", flota: 0 },
        { ruta: "151", nombre: "Las Antenas – Ofelia", flota: 0 },
      ],
      "Reino de Quito (Norte)": [
        { ruta: "96", nombre: "Llano Chico – Edén – San Pablo", flota: 25 },
        { ruta: "93", nombre: "Buenos Aires – La Carolina", flota: 0 },
      ],
    }
  },

  sur: {
    label: "Sur",
    empresas: {
      "Transporsel (Sur)": [
        { ruta: "97", nombre: "Marín – Chillogallo – Las Cuadras", flota: 10 },
      ],
      "TransLatina": [
        { ruta: "67", nombre: "Marín – Chillogallo – 23 de Mayo", flota: 26 },
      ],
      "Urban Quito": [
        { ruta: "56", nombre: "Marín – Avenida Simón Bolívar – Chillogallo", flota: 24 },
      ],
      "San Cristóbal": [
        { ruta: "18", nombre: "Marín – San Luis de Chillogallo", flota: 22 },
        { ruta: "29", nombre: "Marín – Ciudadela Ibarra – Huarcay", flota: 23 },
        { ruta: "20", nombre: "Vista Hermosa – Puente de Guajaló", flota: 8 },
      ],
      "Quitumbe": [
        { ruta: "48",  nombre: "Marín – Ciudadela del Ejército", flota: 18 },
        { ruta: "08",  nombre: "Maternidad del Sur – Ciudadela del Ejército – San Roque", flota: 17 },
        { ruta: "115", nombre: "Reino de Quito – Vicentina – San Pablo", flota: 19 },
      ],
      "Ecuatoriana": [
        { ruta: "49",  nombre: "Marín – La Ecuatoriana – Santospamba", flota: 10 },
        { ruta: "146", nombre: "Marín – La Ecuatoriana – Nuevos Horizontes – Manuelita Saenz", flota: 11 },
        { ruta: "44",  nombre: "San Roque – La Ecuatoriana – Camal Metropolitano – 18 de Octubre", flota: 10 },
        { ruta: "43",  nombre: "San Roque – La Ecuatoriana – Camal Metropolitano – Santa Anita del Sur", flota: 10 },
      ],
      "Transplaneta (Sur)": [
        { ruta: "77",  nombre: "Marín – Guamaní – Venecia – Terranova", flota: 0 },
        { ruta: "78",  nombre: "Marín – Garrochal – Santo Tomas 2 – Ciudad Jardín", flota: 0 },
        { ruta: "12",  nombre: "Quitus Colonial – Guajaló – Centro Histórico – UCE", flota: 21 },
        { ruta: "46B", nombre: "San José de Cutuglagua – San Roque", flota: 13 },
        { ruta: "46",  nombre: "Santo Domingo de Cutuglagua – San Roque", flota: 0 },
      ],
      "7 de Mayo": [
        { ruta: "144", nombre: "Marín – Guamaní – El Rocío", flota: 16 },
        { ruta: "145", nombre: "Marín – Guamaní – Paquisha", flota: 17 },
      ],
      "Juan Pablo II": [
        { ruta: "126", nombre: "Marín – Guamaní Alto – El Porvenir", flota: 18 },
        { ruta: "121", nombre: "Marín – Solanda – Terminal Quitumbe", flota: 17 },
        { ruta: "125", nombre: "San Roque – Guamaní – Cdla. Lozada", flota: 14 },
      ],
      "Disutransa": [
        { ruta: "32", nombre: "San Roque – Quitumbe – El Porvenir", flota: 14 },
        { ruta: "34", nombre: "El Tejar – Guajaló – Nueva Aurora", flota: 18 },
      ],
      "6 de Diciembre": [
        { ruta: "157", nombre: "Caupicho – El Troje – Avenida Simón Bolívar – Marín", flota: 0 },
        { ruta: "14",  nombre: "La Cocha – San Martín – Villaflora", flota: 18 },
      ],
      "Vencedores Sur": [
        { ruta: "47", nombre: "El Recreo – Ciudadela Tarqui", flota: 10 },
        { ruta: "45", nombre: "Marín – Reino de Quito", flota: 10 },
        { ruta: "28", nombre: "Caupicho – Universidad Central", flota: 19 },
      ],
      "Tran Zeta": [
        { ruta: "90", nombre: "Forestal – San Isidro del Inca", flota: 12 },
        { ruta: "91", nombre: "Forestal – San Patricio – Chilibulo", flota: 6 },
      ],
      "Lujoturissa": [
        { ruta: "76", nombre: "La Joya – Cutuglagua – Universidad Central", flota: 20 },
      ],
      "Metrotrans": [
        { ruta: "140", nombre: "San Fernando de Guamaní – Av. Oriental – Estadio Olímpico", flota: 22 },
        { ruta: "141", nombre: "El Rocío de Guamaní – San Roque – Estadio Olímpico", flota: 21 },
      ],
      "San Francisco": [
        { ruta: "27", nombre: "24 de Mayo – Chillogallo – San Marcelo", flota: 12 },
      ],
      "Translatinos": [
        { ruta: "135", nombre: "El Beaterio – Seminario Mayor", flota: 44 },
      ],
      "Bellavista": [
        { ruta: "06", nombre: "Guajaló – Turubamba – San Juan – Toctiuco", flota: 22 },
      ],
      "Victoria (Sur)": [
        { ruta: "19", nombre: "Oriente Quiteño – La Gasca", flota: 21 },
      ],
    }
  },

  centro: {
    label: "Centro",
    empresas: {
      "Victoria": [
        { ruta: "02", nombre: "Colón – Camal", flota: 26 },
      ],
      "Cía. Nacional": [
        { ruta: "25", nombre: "Camal – Hipódromo", flota: 23 },
      ],
      "Vencedores Centro": [
        { ruta: "03", nombre: "La Colmena – Universidad Central", flota: 17 },
        { ruta: "05", nombre: "Atacazo – Libertad – Universidad Central", flota: 14 },
      ],
      "Trans Alfa": [
        { ruta: "131", nombre: "Obrero Independiente – La Comuna", flota: 18 },
        { ruta: "132", nombre: "Primavera – Las Casas – Balcón del Valle", flota: 25 },
      ],
      "Transplaneta Centro": [
        { ruta: "40", nombre: "Las Casas – Alma Lojana – Buenos Aires", flota: 16 },
      ],
      "Mariscal Sucre": [
        { ruta: "83", nombre: "Hospital Metropolitano – Orquídeas – El Guabo", flota: 17 },
        { ruta: "84", nombre: "Colegio Juan Montalvo – UCE – Monserrat – Focalpi", flota: 19 },
        { ruta: "85", nombre: "Colegio Juan Montalvo – UCE – 6 de Diciembre – Chachas", flota: 0 },
      ],
      "Collectrans": [
        { ruta: "134", nombre: "Camal – Aeropuerto", flota: 23 },
      ],
      "21 de Julio": [
        { ruta: "107", nombre: "Chorrera – Marín", flota: 0 },
        { ruta: "108", nombre: "Chorrera – Bolivia – Toctiuco", flota: 0 },
        { ruta: "109", nombre: "San Salvador – Colegio Mejía – Carchi", flota: 0 },
        { ruta: "110", nombre: "Chorrera – Seminario Mayor", flota: 0 },
      ],
      "Transmetropoli": [
        { ruta: "82", nombre: "Monjas Alto – El Dorado", flota: 0 },
        { ruta: "83", nombre: "Edén del Valle – 1 de Mayo – El Dorado", flota: 0 },
        { ruta: "81", nombre: "San Isidro de Puengasí – Escuela Sucre", flota: 7 },
      ],
    }
  }
};

// ─── 2. PARADAS ────────────────────────────────────────────
const PARADAS_POR_ZONA = {
  norte: [
    { name: "Terminal Carcelén",   lat: -0.0715, lng: -78.4759 },
    { name: "Carcelén",            lat: -0.0779, lng: -78.4792 },
    { name: "El Condado",          lat: -0.1258, lng: -78.5088 },
    { name: "Cotocollao",          lat: -0.1148, lng: -78.5015 },
    { name: "Comité del Pueblo",   lat: -0.1115, lng: -78.4511 },
    { name: "Carapungo",           lat: -0.0906, lng: -78.4426 },
    { name: "Naciones Unidas",     lat: -0.1726, lng: -78.4844 },
    { name: "La Carolina",         lat: -0.1828, lng: -78.4862 },
    { name: "Atucucho",            lat: -0.1601, lng: -78.5261 },
    { name: "La Roldós",           lat: -0.1352, lng: -78.5175 },
    { name: "La Planada",          lat: -0.1041, lng: -78.5050 },
    { name: "San Juan de Calderón",lat: -0.0820, lng: -78.4250 },
  ],
  sur: [
    { name: "Marín",               lat: -0.2232, lng: -78.5120 },
    { name: "Solanda",             lat: -0.2651, lng: -78.5175 },
    { name: "Chillogallo",         lat: -0.2952, lng: -78.5350 },
    { name: "Guamaní",             lat: -0.3357, lng: -78.5528 },
    { name: "Quitumbe",            lat: -0.3148, lng: -78.5551 },
    { name: "La Ecuatoriana",      lat: -0.2975, lng: -78.5610 },
    { name: "El Recreo",           lat: -0.2713, lng: -78.5420 },
    { name: "Villaflora",          lat: -0.2540, lng: -78.5130 },
    { name: "La Magdalena",        lat: -0.2418, lng: -78.5275 },
    { name: "El Beaterio",         lat: -0.3480, lng: -78.5600 },
    { name: "San Roque",           lat: -0.2258, lng: -78.5220 },
    { name: "Caupicho",            lat: -0.3200, lng: -78.5700 },
  ],
  centro: [
    { name: "Universidad Central", lat: -0.2102, lng: -78.5094 },
    { name: "Colón",               lat: -0.1982, lng: -78.4955 },
    { name: "El Ejido",            lat: -0.2084, lng: -78.4986 },
    { name: "Centro Histórico",    lat: -0.2200, lng: -78.5120 },
    { name: "Camal Metropolitano", lat: -0.2490, lng: -78.5000 },
    { name: "San Juan",            lat: -0.2189, lng: -78.5148 },
    { name: "La Gasca",            lat: -0.2002, lng: -78.5052 },
    { name: "Occidental",          lat: -0.1890, lng: -78.5130 },
    { name: "Seminario Mayor",     lat: -0.1812, lng: -78.5142 },
    { name: "Toctiuco",            lat: -0.2150, lng: -78.5200 },
    { name: "Las Casas",           lat: -0.2030, lng: -78.5180 },
    { name: "El Dorado",           lat: -0.2350, lng: -78.4900 },
  ],
};

const ZONA_CENTER = {
  norte:  { lat: -0.130, lng: -78.492, zoom: 12 },
  sur:    { lat: -0.280, lng: -78.540, zoom: 12 },
  centro: { lat: -0.210, lng: -78.510, zoom: 13 },
};

// ─── 3. STATE ──────────────────────────────────────────────
const state = {
  zona: null,
  empresa: null,
  linea: null,
  step: 1,
  map: null,
  markers: [],
  polyline: null,
  activeMarkerEl: null,
  stopRefreshTimer: null,
};

// ─── 4. UTILS DE TEXTO ─────────────────────────────────────
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

// ─── 5. INIT ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  Object.entries(ZONAS).forEach(([key, z]) => {
    const el = document.getElementById(`count-${key}`);
    if (el) {
      const n = Object.keys(z.empresas).length;
      el.textContent = `${n} empresa${n !== 1 ? "s" : ""}`;
    }
  });

  document.querySelectorAll(".zone-card").forEach(card => {
    const zone = card.dataset.zone;
    card.addEventListener("click", () => selectZona(zone));
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectZona(zone);
      }
    });
    card.setAttribute("tabindex", "0");
  });

  document.getElementById("back1").addEventListener("click", goToStep1);
  document.getElementById("back2").addEventListener("click", goToStep2);
  document.getElementById("back3").addEventListener("click", goToStep3);

  document.getElementById("logo-link").addEventListener("click", e => {
    e.preventDefault();
    goToStep1();
  });

  initSearch();

  document.addEventListener("click", e => {
    const wrapper = document.getElementById("search-wrapper");
    if (wrapper && !wrapper.contains(e.target)) closeDropdown();
  });
});

// ─── 6. SEARCH ─────────────────────────────────────────────
function buildSearchIndex() {
  const index = [];

  Object.entries(ZONAS).forEach(([zonaKey, zona]) => {
    const empresasAgregadas = new Set();

    Object.entries(zona.empresas).forEach(([empKey, rutas]) => {
      const displayName = empKey.replace(/ \((Norte|Sur|Centro)\)$/, "");

      if (!empresasAgregadas.has(displayName + zonaKey)) {
        empresasAgregadas.add(displayName + zonaKey);
        index.push({
          type: "empresa",
          zona: zonaKey,
          zonaLabel: zona.label,
          empKey,
          displayName,
          searchText: normalizeText(`${displayName} ${zonaKey} ${zona.label}`),
        });
      }

      rutas.forEach(r => {
        index.push({
          type: "ruta",
          zona: zonaKey,
          zonaLabel: zona.label,
          empKey,
          displayName,
          ruta: r.ruta,
          nombre: r.nombre,
          flota: r.flota,
          searchText: normalizeText(`linea ${r.ruta} ${r.nombre} ${displayName} ${zona.label}`),
        });
      });
    });
  });

  return index;
}

let searchIndex = null;

function initSearch() {
  searchIndex = buildSearchIndex();

  const input = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");
  const dropdown = document.getElementById("search-dropdown");

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearBtn.classList.toggle("hidden", q.length === 0);

    if (q.length === 0) {
      closeDropdown();
      return;
    }

    renderDropdown(q);
  });

  input.addEventListener("focus", () => {
    const q = input.value.trim();
    if (q.length > 0) renderDropdown(q);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeDropdown();
      input.blur();
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const first = dropdown.querySelector(".search-result-item");
      if (first) first.focus();
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.add("hidden");
    closeDropdown();
    input.focus();
  });

  dropdown.addEventListener("keydown", e => {
    const items = [...dropdown.querySelectorAll(".search-result-item")];
    const idx = items.indexOf(document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[idx + 1];
      if (next) next.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx === 0) {
        input.focus();
      } else {
        const prev = items[idx - 1];
        if (prev) prev.focus();
      }
    } else if (e.key === "Escape") {
      closeDropdown();
      input.focus();
    }
  });
}

function renderDropdown(query) {
  const dropdown = document.getElementById("search-dropdown");
  const q = normalizeText(query.trim());

  const results = searchIndex
    .filter(item => item.searchText.includes(q))
    .slice(0, 18);

  if (results.length === 0) {
    dropdown.innerHTML = `<div class="search-empty">Sin resultados para "<strong>${escapeHtml(query)}</strong>"</div>`;
    dropdown.classList.remove("hidden");
    document.getElementById("search-input").setAttribute("aria-expanded", "true");
    return;
  }

  const rutas = results.filter(r => r.type === "ruta");
  const empresas = results.filter(r => r.type === "empresa");

  let html = "";

  if (rutas.length > 0) {
    html += `<div class="search-group-label">Líneas de bus</div>`;
    rutas.slice(0, 10).forEach(item => {
      html += `
        <button class="search-result-item" role="option"
          data-zona="${item.zona}"
          data-emp="${escapeAttr(item.empKey)}"
          data-ruta='${escapeAttr(JSON.stringify({ ruta: item.ruta, nombre: item.nombre, flota: item.flota }))}'>
          <span class="sri-badge">${item.ruta}</span>
          <span class="sri-info">
            <span class="sri-name">${escapeHtml(item.nombre)}</span>
            <span class="sri-meta">${escapeHtml(item.displayName)}</span>
          </span>
          <span class="sri-zone ${item.zona}">${item.zonaLabel}</span>
        </button>`;
    });
  }

  if (empresas.length > 0) {
    html += `<div class="search-group-label">Empresas operadoras</div>`;
    empresas.slice(0, 6).forEach(item => {
      const rutaCount = ZONAS[item.zona].empresas[item.empKey]?.length || 0;
      html += `
        <button class="search-result-item" role="option"
          data-zona="${item.zona}"
          data-emp="${escapeAttr(item.empKey)}">
          <span class="sri-badge empresa">EMP</span>
          <span class="sri-info">
            <span class="sri-name">${escapeHtml(item.displayName)}</span>
            <span class="sri-meta">${rutaCount} línea${rutaCount !== 1 ? "s" : ""}</span>
          </span>
          <span class="sri-zone ${item.zona}">${item.zonaLabel}</span>
        </button>`;
    });
  }

  dropdown.innerHTML = html;
  dropdown.classList.remove("hidden");
  document.getElementById("search-input").setAttribute("aria-expanded", "true");

  dropdown.querySelectorAll(".search-result-item").forEach(btn => {
    btn.addEventListener("click", () => handleSearchSelect(btn));
    btn.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSearchSelect(btn);
      }
    });
  });
}

function handleSearchSelect(btn) {
  const zona = btn.dataset.zona;
  const empKey = btn.dataset.emp;
  const rutaRaw = btn.dataset.ruta;

  closeDropdown();
  document.getElementById("search-input").value = "";
  document.getElementById("search-clear").classList.add("hidden");

  if (rutaRaw) {
    const r = JSON.parse(rutaRaw);
    state.zona = zona;
    state.empresa = empKey;
    state.linea = r;
    document.getElementById("linea-selected-label").textContent = `Línea ${r.ruta} · ${r.nombre}`;
    showStep(4);
    showToast(`Línea ${r.ruta} · ${r.nombre}`);
    requestAnimationFrame(() => setTimeout(initMap, 80));
  } else {
    state.zona = zona;
    state.empresa = empKey;
    const displayName = empKey.replace(/ \((Norte|Sur|Centro)\)$/, "");
    renderLineas(empKey, displayName);
    showStep(3);
    showToast(displayName);
  }
}

function closeDropdown() {
  const dropdown = document.getElementById("search-dropdown");
  if (dropdown) {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
  }

  const input = document.getElementById("search-input");
  if (input) input.setAttribute("aria-expanded", "false");
}

// ─── 7. ZONA ───────────────────────────────────────────────
function selectZona(zona) {
  state.zona = zona;
  state.empresa = null;
  state.linea = null;
  renderEmpresas(zona);
  showStep(2);
  showToast(`Zona ${ZONAS[zona].label} seleccionada`);
}

// ─── 8. EMPRESA ────────────────────────────────────────────
function renderEmpresas(zona) {
  const grid = document.getElementById("empresa-grid");
  const label = document.getElementById("zona-selected-label");

  label.textContent = `Zona ${ZONAS[zona].label} · elige tu empresa`;
  grid.innerHTML = "";

  const empresas = Object.keys(ZONAS[zona].empresas).sort();

  empresas.forEach(emp => {
    const btn = document.createElement("button");
    btn.className = "chip";

    const displayName = emp.replace(/ \((Norte|Sur|Centro)\)$/, "");
    btn.textContent = displayName;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-label", `Seleccionar ${displayName}`);
    btn.setAttribute("tabindex", "0");

    btn.addEventListener("click", () => selectEmpresa(emp, displayName));
    btn.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectEmpresa(emp, displayName);
      }
    });

    grid.appendChild(btn);
  });
}

function selectEmpresa(emp, displayName) {
  state.empresa = emp;
  renderLineas(emp, displayName || emp);
  showStep(3);
  showToast(displayName || emp);
}

// ─── 9. LÍNEA ──────────────────────────────────────────────
function renderLineas(emp, displayName) {
  const grid = document.getElementById("linea-grid");
  const label = document.getElementById("empresa-selected-label");

  label.textContent = displayName || emp;
  grid.innerHTML = "";

  const rutas = ZONAS[state.zona].empresas[emp] || [];

  rutas.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "route-item";
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-label", `Línea ${r.ruta} – ${r.nombre}${r.flota ? ", " + r.flota + " buses" : ""}`);
    btn.innerHTML = `
      <span class="route-badge">${r.ruta}</span>
      <span class="route-name">${r.nombre}</span>
      ${r.flota ? `<span class="route-fleet" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="4" width="12" height="7" rx="2" stroke="#6B7A92" stroke-width="1.2"/>
          <circle cx="4" cy="11.5" r="1.2" fill="#6B7A92"/>
          <circle cx="10" cy="11.5" r="1.2" fill="#6B7A92"/>
          <rect x="3" y="2" width="8" height="3" rx="1" stroke="#6B7A92" stroke-width="1.2"/>
        </svg>
        ${r.flota}
      </span>` : ""}
    `;

    btn.addEventListener("click", () => selectLinea(r));
    grid.appendChild(btn);
  });
}

function selectLinea(r) {
  state.linea = r;
  const label = document.getElementById("linea-selected-label");
  label.textContent = `Línea ${r.ruta} · ${r.nombre}`;
  showStep(4);
  showToast(`Línea ${r.ruta}`);
  requestAnimationFrame(() => setTimeout(initMap, 80));
}

// ─── 10. MAPA ──────────────────────────────────────────────
function initMap() {
  if (state.map) {
    state.map.remove();
    state.map = null;
  }

  state.markers = [];
  state.activeMarkerEl = null;

  document.getElementById("stop-empty").classList.remove("hidden");
  document.getElementById("stop-content").classList.add("hidden");

  const c = ZONA_CENTER[state.zona];
  const map = L.map("map", { zoomControl: true }).setView([c.lat, c.lng], c.zoom);
  state.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  const seed = hashCode(state.linea.ruta + state.zona);
  const allStops = PARADAS_POR_ZONA[state.zona];
  const stops = shuffleSeed(allStops, seed).slice(0, 6 + (seed % 4));

  const latlngs = stops.map(s => [s.lat, s.lng]);
  state.polyline = L.polyline(latlngs, {
    color: "#FF6B2B",
    weight: 3.5,
    opacity: 0.55,
    dashArray: "8 5"
  }).addTo(map);

  stops.forEach(stop => {
    const icon = L.divIcon({
      className: "",
      html: `<div class="bus-stop-marker" tabindex="0" role="button" aria-label="Parada: ${stop.name}"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([stop.lat, stop.lng], { icon })
      .addTo(map)
      .bindTooltip(stop.name, { direction: "top", offset: [0, -8] });

    marker.on("click", () => {
      setActiveMarker(marker);
      showStop(stop);
    });

    const el = marker.getElement();
    if (el) {
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveMarker(marker);
          showStop(stop);
        }
      });
    }

    state.markers.push(marker);
  });
}

function setActiveMarker(marker) {
  if (state.activeMarkerEl) {
    state.activeMarkerEl.querySelector(".bus-stop-marker")?.classList.remove("active");
  }

  const el = marker.getElement();
  if (el) {
    el.querySelector(".bus-stop-marker")?.classList.add("active");
    state.activeMarkerEl = el;
  }
}

// ─── 11. PARADA / TIEMPOS ──────────────────────────────────
function showStop(stop) {
  document.getElementById("stop-empty").classList.add("hidden");
  document.getElementById("stop-content").classList.remove("hidden");
  document.getElementById("stop-name").textContent = stop.name;
  renderArrivals();

  if (state.stopRefreshTimer) clearInterval(state.stopRefreshTimer);
  state.stopRefreshTimer = setInterval(renderArrivals, 30000);
}

function renderArrivals() {
  const list = document.getElementById("arrivals-list");
  list.innerHTML = "";

  generateArrivals().forEach((mins, i) => {
    const labels = ["Próximo bus", "Segundo bus", "Tercer bus"];
    const cls = mins <= 5 ? "soon" : mins <= 10 ? "mid" : "far";
    const text = mins === 0 ? "Llegando…" : `${mins} min`;

    const row = document.createElement("div");
    row.className = "arrival-row";
    row.innerHTML = `
      <span class="arrival-label">${labels[i]}</span>
      <span class="arrival-time ${cls}" aria-label="${labels[i]}: ${text}">${text}</span>
    `;
    list.appendChild(row);
  });
}

function generateArrivals() {
  const a = Math.floor(Math.random() * 16);
  const b = a + 5 + Math.floor(Math.random() * 11);
  const c = b + 5 + Math.floor(Math.random() * 11);
  return [a, b, c];
}

// ─── 12. NAVEGACIÓN ────────────────────────────────────────
function showStep(n) {
  [1, 2, 3, 4].forEach(i => {
    document.getElementById(`step${i}`).classList.toggle("hidden", i !== n);
  });

  updateStepper(n);
  updateBreadcrumb(n);
  state.step = n;
  document.getElementById("selector").scrollIntoView({ behavior: "smooth", block: "start" });
}

function goToStep1() {
  state.zona = null;
  state.empresa = null;
  state.linea = null;

  if (state.stopRefreshTimer) clearInterval(state.stopRefreshTimer);
  if (state.map) {
    state.map.remove();
    state.map = null;
  }

  showStep(1);
}

function goToStep2() {
  state.empresa = null;
  state.linea = null;

  if (state.stopRefreshTimer) clearInterval(state.stopRefreshTimer);
  if (state.map) {
    state.map.remove();
    state.map = null;
  }

  renderEmpresas(state.zona);
  showStep(2);
}

function goToStep3() {
  state.linea = null;

  if (state.stopRefreshTimer) clearInterval(state.stopRefreshTimer);
  if (state.map) {
    state.map.remove();
    state.map = null;
  }

  const displayName = state.empresa.replace(/ \((Norte|Sur|Centro)\)$/, "");
  renderLineas(state.empresa, displayName);
  showStep(3);
}

function updateStepper(n) {
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById(`step${i}-indicator`);
    el.classList.toggle("active", i === n);
    el.classList.toggle("done", i < n);

    if (i === n) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  });

  [1, 2, 3].forEach(i => {
    const line = document.getElementById(`line-${i}`);
    if (line) line.classList.toggle("done", i < n);
  });
}

function updateBreadcrumb() {
  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = "";

  const items = [];
  if (state.zona) items.push({ label: ZONAS[state.zona].label, step: 1 });
  if (state.empresa) items.push({ label: state.empresa.replace(/ \((Norte|Sur|Centro)\)$/, ""), step: 2 });
  if (state.linea) items.push({ label: `Línea ${state.linea.ruta}`, step: 3 });

  items.forEach((item, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "bc-sep";
      sep.textContent = "›";
      sep.setAttribute("aria-hidden", "true");
      bc.appendChild(sep);
    }

    const span = document.createElement("span");
    span.className = "bc-item" + (idx === items.length - 1 ? " active" : "");
    span.textContent = item.label;

    if (idx < items.length - 1) {
      span.title = `Volver a ${item.label}`;
      span.addEventListener("click", () => {
        if (item.step === 1) goToStep1();
        else if (item.step === 2) goToStep2();
        else if (item.step === 3) goToStep3();
      });
    }

    bc.appendChild(span);
  });
}

// ─── 13. TOAST ─────────────────────────────────────────────
let toastTimer;

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2200);
}

// ─── 14. UTILS ─────────────────────────────────────────────
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function shuffleSeed(arr, seed) {
  const a = [...arr];
  let s = seed;

  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}
