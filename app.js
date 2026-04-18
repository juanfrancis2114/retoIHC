/* ══════════════════════════════════════
   BusQuito – Lógica principal
   ══════════════════════════════════════ */

// ─── 1. DATA ───────────────────────────────────────────────
const DATA = {
  "Carcelén-Tarqui (CATAR)": [
    { ruta: "113", nombre: "Marín - Carcelén", flota: 30 },
    { ruta: "62",  nombre: "Ejido - Carcelén - Josefina", flota: 20 },
    { ruta: "61",  nombre: "Ejido - Av. Eloy Alfaro - Carcelén Bajo", flota: 29 },
    { ruta: "63",  nombre: "Carcelén - 6 de Diciembre - Don Bosco", flota: 0 },
    { ruta: "130", nombre: "Pulida - Estadio Olímpico", flota: 13 },
  ],
  "Monserrat": [
    { ruta: "30", nombre: "Marín - Carcelén Bajo", flota: 22 },
    { ruta: "31", nombre: "Marianitas - San José de Morán - Estadio Olímpico", flota: 5 },
  ],
  "Alborada / Tranquito": [
    { ruta: "143", nombre: "Atucucho - Comité del Pueblo", flota: 0 },
    { ruta: "22",  nombre: "Marín - Estadio - Comité del Pueblo", flota: 30 },
  ],
  "Quiteño Libre": [
    { ruta: "119", nombre: "Marín - Zona 11 (Comité del Pueblo)", flota: 0 },
    { ruta: "118", nombre: "Marín - Quintana - Carmen Bajo", flota: 12 },
  ],
  "Guadalajara": [
    { ruta: "09", nombre: "Pueblo Blanco - Comité del Pueblo - Congreso", flota: 25 },
  ],
  "Paquisha": [
    { ruta: "74", nombre: "Ejido - Cotocollao - Machala - 23 de Junio", flota: 17 },
  ],
  "Águila Dorada": [
    { ruta: "71",  nombre: "Congreso - Condado - Velasco", flota: 27 },
    { ruta: "102", nombre: "La Planada - El Labrador", flota: 25 },
    { ruta: "153", nombre: "Roldós - Estadio Olímpico - Jardín", flota: 0 },
  ],
  "Rapitrans": [
    { ruta: "154", nombre: "Planada - Colinas del Norte - Marín", flota: 23 },
  ],
  "San Carlos": [
    { ruta: "53", nombre: "Rancho Alto - Planada - Cotocollao - Los Arupos", flota: 0 },
    { ruta: "55", nombre: "Tiwintza - Plan Techo - Cotocollao - Terminal Carcelén", flota: 0 },
    { ruta: "89", nombre: "La Roldós - Occidental - La Magdalena", flota: 19 },
    { ruta: "88", nombre: "Estadio de la Liga - Occidental - La Magdalena", flota: 21 },
    { ruta: "51", nombre: "Atucucho - Occidental - La Magdalena", flota: 0 },
    { ruta: "52", nombre: "Atucucho - Seminario Mayor", flota: 0 },
  ],
  "Transporsel": [
    { ruta: "99", nombre: "Babilonia - San Juan - Carapungo - Ejido", flota: 26 },
    { ruta: "98", nombre: "Luz y Vida - Carapungo - Ejido", flota: 14 },
    { ruta: "97", nombre: "Marín - Chillogallo - Las Cuadras", flota: 10 },
  ],
  "Transhemisféricos Mitad del Mundo": [
    { ruta: "66", nombre: "San Vicente - Ejido", flota: 9 },
  ],
  "Semgyllfor": [
    { ruta: "69", nombre: "Ciudad Bicentenario - Carapungo - Ejido", flota: 11 },
  ],
  "OPERNOR": [
    { ruta: "161", nombre: "Pomasqui - Bicentenario - Naciones Unidas", flota: 0 },
    { ruta: "162", nombre: "San Juan de Calderón - Naciones Unidas", flota: 0 },
  ],
  "San Juan": [
    { ruta: "150", nombre: "Ana María - San Juan - Ofelia", flota: 0 },
    { ruta: "151", nombre: "Las Antenas - Ofelia", flota: 0 },
  ],
  "Reino de Quito": [
    { ruta: "96", nombre: "Llano Chico - Edén - San Pablo", flota: 25 },
    { ruta: "93", nombre: "Buenos Aires - La Carolina", flota: 0 },
    { ruta: "45", nombre: "Marín - Reino de Quito", flota: 10 },
    { ruta: "115", nombre: "Reino de Quito - Vicentina - San Pablo", flota: 19 },
  ],
  "Latina": [
    { ruta: "67", nombre: "Marín - Chillogallo - 23 de Mayo", flota: 26 },
  ],
  "Urban Quito": [
    { ruta: "56", nombre: "Marín - Avenida Simón Bolívar - Chillogallo", flota: 24 },
  ],
  "San Cristóbal": [
    { ruta: "18", nombre: "Marín - San Luis de Chillogallo", flota: 22 },
    { ruta: "29", nombre: "Marín - Ciudadela Ibarra - Huarcay", flota: 23 },
    { ruta: "20", nombre: "Vista Hermosa - Puente de Guajaló", flota: 8 },
  ],
  "Quitumbe": [
    { ruta: "48", nombre: "Marín - Ciudadela del Ejército", flota: 18 },
    { ruta: "08", nombre: "Maternidad del Sur - Ciudadela del Ejército - San Roque", flota: 17 },
  ],
  "Ecuatoriana": [
    { ruta: "49",  nombre: "Marín - La Ecuatoriana - Santospamba", flota: 10 },
    { ruta: "146", nombre: "Marín - La Ecuatoriana - Nuevos Horizontes - Manuelita Saenz", flota: 11 },
    { ruta: "44",  nombre: "San Roque - La Ecuatoriana - Camal - 18 de Octubre", flota: 10 },
    { ruta: "43",  nombre: "San Roque - La Ecuatoriana - Camal - Santa Anita del Sur", flota: 10 },
  ],
  "Transplaneta": [
    { ruta: "77",  nombre: "Marín - Guamaní - Venecia - Terranova", flota: 0 },
    { ruta: "78",  nombre: "Marín - Garrochal - Santo Tomas 2 - Ciudad Jardín", flota: 0 },
    { ruta: "12",  nombre: "Quitus Colonial - Guajaló - Centro Histórico - UCE", flota: 21 },
    { ruta: "46B", nombre: "San José de Cutuglagua - San Roque", flota: 13 },
    { ruta: "46",  nombre: "Santo Domingo de Cutuglagua - San Roque", flota: 0 },
    { ruta: "40",  nombre: "Las Casas - Alma Lojana - Buenos Aires", flota: 16 },
  ],
  "7 de Mayo": [
    { ruta: "144", nombre: "Marín - Guamaní - El Rocío", flota: 16 },
    { ruta: "145", nombre: "Marín - Guamaní - Paquisha", flota: 17 },
  ],
  "Juan Pablo II": [
    { ruta: "126", nombre: "Marín - Guamaní Alto - El Porvenir", flota: 18 },
    { ruta: "121", nombre: "Marín - Solanda - Terminal Quitumbe", flota: 17 },
    { ruta: "125", nombre: "San Roque - Guamaní - Cdla. Lozada", flota: 14 },
  ],
  "Disutransa": [
    { ruta: "32", nombre: "San Roque - Quitumbe - El Porvenir", flota: 14 },
    { ruta: "34", nombre: "El Tejar - Guajaló - Nueva Aurora", flota: 18 },
  ],
  "6 de Diciembre": [
    { ruta: "157", nombre: "Caupicho - El Troje - Avenida Simón Bolívar - Marín", flota: 0 },
    { ruta: "14",  nombre: "La Cocha - San Martín - Villaflora", flota: 18 },
  ],
  "Vencedores (VEPIEX)": [
    { ruta: "47", nombre: "El Recreo - Ciudadela Tarqui", flota: 10 },
    { ruta: "28", nombre: "Caupicho - Universidad Central", flota: 19 },
    { ruta: "03", nombre: "La Colmena - Universidad Central", flota: 17 },
    { ruta: "05", nombre: "Atacazo - Libertad - Universidad Central", flota: 14 },
  ],
  "Tran Zeta": [
    { ruta: "90", nombre: "Forestal - San Isidro del Inca", flota: 12 },
    { ruta: "91", nombre: "Forestal - San Patricio - Chilibulo", flota: 6 },
  ],
  "Lujoturissa": [
    { ruta: "76", nombre: "La Joya - Cutuglagua - Universidad Central", flota: 20 },
  ],
  "Metrotrans": [
    { ruta: "140", nombre: "San Fernando de Guamaní - Av. Oriental - Estadio", flota: 22 },
    { ruta: "141", nombre: "El Rocío de Guamaní - San Roque - Estadio Olímpico", flota: 21 },
  ],
  "San Francisco": [
    { ruta: "27", nombre: "24 de Mayo - Chillogallo - San Marcelo", flota: 12 },
  ],
  "Translatinos": [
    { ruta: "135", nombre: "El Beaterio - Seminario Mayor", flota: 44 },
  ],
  "Bellavista": [
    { ruta: "06", nombre: "Guajaló - Turubamba - San Juan - Toctiuco", flota: 22 },
  ],
  "Victoria": [
    { ruta: "19", nombre: "Oriente Quiteño - La Gasca", flota: 21 },
    { ruta: "02", nombre: "Colón - Camal", flota: 26 },
  ],
  "Cía. Nacional": [
    { ruta: "25", nombre: "Camal - Hipódromo", flota: 23 },
  ],
  "Trans Alfa": [
    { ruta: "131", nombre: "Obrero Independiente - La Comuna", flota: 18 },
    { ruta: "132", nombre: "Primavera - Las Casas - Balcón del Valle", flota: 25 },
  ],
  "Mariscal Sucre": [
    { ruta: "83", nombre: "Hospital Metropolitano - Orquídeas - El Guabo", flota: 17 },
    { ruta: "84", nombre: "Colegio Juan Montalvo - UCE - Monserrat - Focalpi", flota: 19 },
    { ruta: "85", nombre: "Colegio Juan Montalvo - UCE - 6 de Diciembre - Chachas", flota: 0 },
  ],
  "Colectrans": [
    { ruta: "134", nombre: "Camal - Aeropuerto", flota: 23 },
  ],
  "21 de Julio": [
    { ruta: "107", nombre: "Chorrera - Marín", flota: 0 },
    { ruta: "108", nombre: "Chorrera - Bolivia - Toctiuco", flota: 0 },
    { ruta: "109", nombre: "San Salvador - Colegio Mejía - Carchi", flota: 0 },
    { ruta: "110", nombre: "Chorrera - Seminario Mayor", flota: 0 },
  ],
  "Transmetropoli": [
    { ruta: "82", nombre: "Monjas Alto - El Dorado", flota: 0 },
    { ruta: "83", nombre: "Edén del Valle - 1 de Mayo - El Dorado", flota: 0 },
    { ruta: "81", nombre: "San Isidro de Puengasí - Escuela Sucre", flota: 7 },
  ],
  "Cóndor Mirador": [
    { ruta: "81", nombre: "San Isidro de Puengasí - Escuela Sucre", flota: 7 },
  ],
};

// ─── 2. STOPS ──────────────────────────────────────────────
// Named bus stops scattered around Quito with real-ish coords
const QUITO_STOPS = [
  { name: "Marín",              lat: -0.2232, lng: -78.5120 },
  { name: "El Ejido",           lat: -0.2084, lng: -78.4986 },
  { name: "La Mariscal",        lat: -0.1975, lng: -78.4930 },
  { name: "Colón",              lat: -0.1982, lng: -78.4955 },
  { name: "La Carolina",        lat: -0.1828, lng: -78.4862 },
  { name: "Naciones Unidas",    lat: -0.1726, lng: -78.4844 },
  { name: "Cotocollao",         lat: -0.1148, lng: -78.5015 },
  { name: "Carcelén",           lat: -0.0779, lng: -78.4792 },
  { name: "Comité del Pueblo",  lat: -0.1115, lng: -78.4511 },
  { name: "Carapungo",          lat: -0.0906, lng: -78.4426 },
  { name: "San Roque",          lat: -0.2258, lng: -78.5220 },
  { name: "Solanda",            lat: -0.2651, lng: -78.5175 },
  { name: "Chillogallo",        lat: -0.2952, lng: -78.5350 },
  { name: "Guamaní",            lat: -0.3357, lng: -78.5528 },
  { name: "Quitumbe",           lat: -0.3148, lng: -78.5551 },
  { name: "La Ecuatoriana",     lat: -0.2975, lng: -78.5610 },
  { name: "Terminal Carcelén",  lat: -0.0715, lng: -78.4759 },
  { name: "Estadio Olímpico",   lat: -0.2027, lng: -78.4918 },
  { name: "Occidental",         lat: -0.1890, lng: -78.5130 },
  { name: "La Magdalena",       lat: -0.2418, lng: -78.5275 },
  { name: "Villaflora",         lat: -0.2540, lng: -78.5130 },
  { name: "El Recreo",          lat: -0.2713, lng: -78.5420 },
  { name: "Universidad Central",lat: -0.2102, lng: -78.5094 },
  { name: "San Juan",           lat: -0.2189, lng: -78.5148 },
  { name: "Centro Histórico",   lat: -0.2200, lng: -78.5120 },
  { name: "La Gasca",           lat: -0.2002, lng: -78.5052 },
  { name: "Atucucho",           lat: -0.1601, lng: -78.5261 },
  { name: "Seminario Mayor",    lat: -0.1812, lng: -78.5142 },
  { name: "El Condado",         lat: -0.1258, lng: -78.5088 },
  { name: "Aeropuerto",         lat: -0.1273, lng: -78.3577 },
];

// ─── 3. STATE ──────────────────────────────────────────────
const state = {
  empresa: null,
  linea: null,
  step: 1,
  map: null,
  markers: [],
  stopRefreshTimer: null,
};

// ─── 4. INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderEmpresas();
  document.getElementById('back-to-step1').addEventListener('click', goToStep1);
  document.getElementById('back-to-step2').addEventListener('click', goToStep2);
  document.getElementById('close-panel').addEventListener('click', closePanel);
});

// ─── 5. STEP 1 – EMPRESAS ──────────────────────────────────
function renderEmpresas() {
  const grid = document.getElementById('empresa-grid');
  grid.innerHTML = '';
  Object.keys(DATA).sort().forEach(empresa => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = empresa;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-label', `Seleccionar empresa ${empresa}`);
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('click', () => selectEmpresa(empresa));
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectEmpresa(empresa); } });
    grid.appendChild(btn);
  });
}

function selectEmpresa(empresa) {
  state.empresa = empresa;
  showToast(`Empresa: ${empresa}`);
  goToStep2(null, empresa);
}

// ─── 6. STEP 2 – LÍNEAS ────────────────────────────────────
function renderLineas(empresa) {
  const grid = document.getElementById('linea-grid');
  const label = document.getElementById('empresa-selected-label');
  label.textContent = `Líneas de ${empresa}`;
  grid.innerHTML = '';

  const rutas = DATA[empresa] || [];
  rutas.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'route-item';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-label', `Línea ${r.ruta} – ${r.nombre}${r.flota ? ', flota: ' + r.flota + ' buses' : ''}`);
    btn.innerHTML = `
      <span class="route-badge">${r.ruta}</span>
      <span class="route-name">${r.nombre}</span>
      ${r.flota ? `<span class="route-fleet" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="7" rx="2" stroke="#6B7A92" stroke-width="1.2"/><circle cx="4" cy="11.5" r="1.2" fill="#6B7A92"/><circle cx="10" cy="11.5" r="1.2" fill="#6B7A92"/><rect x="3" y="2" width="8" height="3" rx="1" stroke="#6B7A92" stroke-width="1.2"/></svg>
        ${r.flota}
      </span>` : ''}
    `;
    btn.addEventListener('click', () => selectLinea(r));
    grid.appendChild(btn);
  });
}

function selectLinea(r) {
  state.linea = r;
  showToast(`Línea ${r.ruta} seleccionada`);
  showStep(3);
  document.getElementById('linea-selected-label').textContent = `Línea ${r.ruta} · ${r.nombre}`;
  setTimeout(initMap, 100); // wait for div to be visible
}

// ─── 7. MAP ────────────────────────────────────────────────
function initMap() {
  if (state.map) {
    state.map.remove();
    state.map = null;
  }
  clearMarkers();

  const map = L.map('map', { zoomControl: true, attributionControl: true });
  state.map = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  map.setView([-0.2200, -78.5120], 12);

  // Select 8-12 stops pseudo-randomly based on route name
  const seed = hashCode(state.linea.ruta);
  const stops = shuffleSeed(QUITO_STOPS, seed).slice(0, 8 + (seed % 5));

  stops.forEach((stop, i) => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-marker" title="${stop.name}" tabindex="0" role="button" aria-label="Parada ${stop.name}"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const marker = L.marker([stop.lat, stop.lng], { icon })
      .addTo(map)
      .bindTooltip(stop.name, { permanent: false, direction: 'top', className: 'bus-tooltip' });

    marker.on('click', () => showStop(stop));
    marker.getElement()?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showStop(stop); }
    });

    state.markers.push(marker);
  });

  // Draw a dashed polyline connecting stops (simulates route)
  const latlngs = stops.map(s => [s.lat, s.lng]);
  L.polyline(latlngs, { color: '#FF6B2B', weight: 3, opacity: .5, dashArray: '8 6' }).addTo(map);
}

function clearMarkers() {
  state.markers.forEach(m => m.remove());
  state.markers = [];
}

// ─── 8. STOP PANEL ─────────────────────────────────────────
function showStop(stop) {
  const panel = document.getElementById('stop-panel');
  document.getElementById('stop-name').textContent = stop.name;
  renderArrivals();
  panel.classList.remove('hidden');

  // Auto-refresh arrivals every 30s
  if (state.stopRefreshTimer) clearInterval(state.stopRefreshTimer);
  state.stopRefreshTimer = setInterval(renderArrivals, 30000);
}

function renderArrivals() {
  const list = document.getElementById('arrivals-list');
  list.innerHTML = '';

  // Generate 3 arrival times with random 5-15 min intervals
  const times = generateArrivals();
  times.forEach((mins, i) => {
    const row = document.createElement('div');
    row.className = 'arrival-row';

    const label = i === 0 ? 'Próximo bus' : i === 1 ? 'Segundo bus' : 'Tercer bus';
    const cls = mins <= 6 ? 'soon' : mins <= 10 ? 'mid' : 'far';
    const text = mins === 0 ? 'Llegando...' : `${mins} min`;

    row.innerHTML = `
      <span class="arrival-label">${label}</span>
      <span class="arrival-time ${cls}" aria-label="${label}: ${text}">${text}</span>
    `;
    list.appendChild(row);
  });
}

function generateArrivals() {
  // First arrival: 0-15 min (random)
  const first = Math.floor(Math.random() * 16); // 0-15
  // Subsequent buses: +5 to +15 min each
  const second = first + 5 + Math.floor(Math.random() * 11);
  const third  = second + 5 + Math.floor(Math.random() * 11);
  return [first, second, third];
}

function closePanel() {
  document.getElementById('stop-panel').classList.add('hidden');
  if (state.stopRefreshTimer) { clearInterval(state.stopRefreshTimer); state.stopRefreshTimer = null; }
}

// ─── 9. STEP NAVIGATION ────────────────────────────────────
function showStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`step${i}`).classList.toggle('hidden', i !== n);
  });
  updateStepper(n);
  state.step = n;
  // Scroll to section
  document.getElementById('selector').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goToStep1() {
  state.empresa = null;
  state.linea = null;
  closePanel();
  showStep(1);
}

function goToStep2(e, empresa) {
  const emp = empresa || state.empresa;
  if (!emp) return;
  state.empresa = emp;
  renderLineas(emp);
  showStep(2);
}

function updateStepper(n) {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`step${i}-indicator`);
    const line = el.nextElementSibling; // step-line
    el.classList.toggle('active', i === n);
    el.classList.toggle('done', i < n);
    if (line && line.classList.contains('step-line')) {
      line.classList.toggle('done', i < n);
    }
    // aria-current
    if (i === n) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
}

// ─── 10. TOAST ─────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
}

// ─── 11. UTILS ─────────────────────────────────────────────
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
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