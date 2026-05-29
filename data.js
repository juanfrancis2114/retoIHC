/* ══════════════════════════════════════
   BusQuito – data.js  (v7 – búsqueda por proximidad geográfica)
   ══════════════════════════════════════ */

const SUPABASE_URL  = "https://vedsmsrvllugtztyczxe.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHNtc3J2bGx1Z3R6dHljenhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjY4OTgsImV4cCI6MjA5NTEwMjg5OH0.wj2FT2s8pD0BQVMDmcTFTaPKz__MGtjd8arEp22KRQQ";

const SUPABASE_CONFIGURED =
  SUPABASE_URL.includes(".supabase.co") &&
  !SUPABASE_URL.includes("TU_PROYECTO") &&
  SUPABASE_ANON.length > 20 &&
  !SUPABASE_ANON.includes("TU_ANON");

// ─── Estado global ─────────────────────────────────────────
let SECTORS         = [];
let SECTOR_BY_ID    = {};
let ROUTES          = [];
let POPULAR_TRIPS   = [];
let POPULAR_SECTORS = [];

// ─── Zona según latitud ────────────────────────────────────
function inferZona(lat) {
  if (lat > -0.15)  return "norte";
  if (lat < -0.25)  return "sur";
  return "centro";
}

function aplanarCoordenadas(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const esSegmentos = Array.isArray(coords[0]) && Array.isArray(coords[0][0]);
  const puntos = esSegmentos ? coords.flat() : coords;
  return puntos.filter(p =>
    Array.isArray(p) && p.length >= 2 &&
    p[0] > -6 && p[0] < 2 &&
    p[1] > -82 && p[1] < -75
  );
}

// ══════════════════════════════════════════════════════════
//  PAGINACIÓN
// ══════════════════════════════════════════════════════════
async function fetchAllPages(table, selectCols, extraParams = {}) {
  const pageSize = 1000;
  let results    = [];
  let offset     = 0;
  let totalKnown = null;

  while (true) {
    const qsParts = [`select=${encodeURIComponent(selectCols)}`];
    Object.entries(extraParams).forEach(([k, v]) => {
      qsParts.push(`${k}=${v}`);
    });
    const url = `${SUPABASE_URL}/rest/v1/${table}?${qsParts.join("&")}`;

    const from = offset;
    const to   = offset + pageSize - 1;

    const res = await fetch(url, {
      headers: {
        "apikey":        SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "Range-Unit":    "items",
        "Range":         `${from}-${to}`,
        "Prefer":        "count=exact",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`❌ fetchAllPages error ${res.status} en "${table}":`, body);
      if (Object.keys(extraParams).length > 0) {
        console.warn(`⚠️ Reintentando "${table}" sin filtros extra…`);
        return fetchAllPages(table, selectCols, {});
      }
      break;
    }

    if (totalKnown === null) {
      const cr = res.headers.get("Content-Range");
      if (cr) {
        const parts = cr.split("/");
        const total = parseInt(parts[1]);
        if (!isNaN(total)) {
          totalKnown = total;
          console.log(`📊 ${table}: total en BD = ${total}`);
        }
      }
    }

    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;

    results = results.concat(chunk);
    console.log(`📦 ${table}: ${results.length}/${totalKnown ?? "?"} cargados`);

    if (totalKnown !== null && results.length >= totalKnown) break;
    if (chunk.length < pageSize) break;

    offset += pageSize;
  }

  return results;
}

// ══════════════════════════════════════════════════════════
//  CARGA DESDE SUPABASE
// ══════════════════════════════════════════════════════════
async function loadDataFromSupabase() {
  if (!SUPABASE_CONFIGURED) {
    console.warn("⚠️ Credenciales no configuradas. Usando datos de respaldo.");
    loadFallbackData();
    return false;
  }

  try {
    console.log("🔄 Cargando paradas…");
    const rawParadas = await fetchAllPages("paradas", "id_parada,nombre,latitud,longitud");
    if (!rawParadas || rawParadas.length === 0) throw new Error("Sin paradas en Supabase");
    console.log(`✅ Paradas cargadas: ${rawParadas.length}`);

    SECTORS = rawParadas.map(p => ({
      id:   String(p.id_parada),
      name: (p.nombre || `Parada ${p.id_parada}`).trim(),
      lat:  parseFloat(p.latitud),
      lng:  parseFloat(p.longitud),
      zona: inferZona(parseFloat(p.latitud)),
    })).filter(s => !isNaN(s.lat) && !isNaN(s.lng));

    SECTOR_BY_ID = {};
    SECTORS.forEach(s => {
      SECTOR_BY_ID[s.id]         = s;
      SECTOR_BY_ID[Number(s.id)] = s;
    });
    console.log(`✅ SECTOR_BY_ID: ${SECTORS.length} paradas`);

    console.log("🔄 Cargando rutas…");
    let rawRutas = await fetchAllPages(
      "rutas",
      "id_ruta,nombre,cooperativa,color,codigo,tiempo_estimado,activa,coordenadas",
      { "activa": "eq.true" }
    );
    if (!rawRutas || rawRutas.length === 0) {
      rawRutas = await fetchAllPages("rutas", "id_ruta,nombre,cooperativa,color,codigo,tiempo_estimado,activa,coordenadas");
    }
    if (!rawRutas || rawRutas.length === 0) throw new Error("Sin rutas en Supabase");
    console.log(`✅ Rutas cargadas: ${rawRutas.length}`);

    console.log("🔄 Cargando ruta_paradas…");
    const rawRP = await fetchAllPages("ruta_paradas", "id_ruta,id_parada,orden_parada", { "order": "orden_parada.asc" });
    console.log(`✅ ruta_paradas: ${rawRP.length}`);

    const paradasPorRuta = {};
    rawRP.forEach(rp => {
      const rid = String(rp.id_ruta);
      if (!paradasPorRuta[rid]) paradasPorRuta[rid] = [];
      paradasPorRuta[rid].push({ id: String(rp.id_parada), orden: rp.orden_parada });
    });

    let rutasDescartadas = 0, rutasConPath = 0;

    ROUTES = rawRutas.map(r => {
      const grupo = paradasPorRuta[String(r.id_ruta)] || [];
      const paradas = grupo
        .sort((a, b) => a.orden - b.orden)
        .map(p => {
          const found = SECTOR_BY_ID[p.id] || SECTOR_BY_ID[Number(p.id)];
          return found ? found.id : null;
        })
        .filter(Boolean);

      if (paradas.length < 2) { rutasDescartadas++; return null; }

      const linea = (r.codigo || r.nombre || String(r.id_ruta)).trim();

      let path = null;
      if (Array.isArray(r.coordenadas) && r.coordenadas.length > 0) {
        const puntos = aplanarCoordenadas(r.coordenadas);
        if (puntos.length >= 2) { path = puntos; rutasConPath++; }
      }

      return {
        id:           `r${r.id_ruta}`,
        _dbId:        r.id_ruta,
        linea,
        empresa:      (r.cooperativa || "Sin cooperativa").trim(),
        color:        r.color || randomRouteColor(r.id_ruta),
        stops:        paradas,
        estimatedMin: r.tiempo_estimado || null,
        path,
      };
    }).filter(Boolean);

    console.log(`✅ Rutas construidas: ${ROUTES.length} (${rutasDescartadas} descartadas, ${rutasConPath} con GPS)`);

    buildPopularData();
    return true;

  } catch (err) {
    console.error("❌ Error Supabase:", err.message);
    loadFallbackData();
    return false;
  }
}

function randomRouteColor(id) {
  const palette = ["#FF6B2B","#2196F3","#4CAF50","#9C27B0","#F44336","#00BCD4","#FF9800","#607D8B","#E91E63","#3F51B5"];
  return palette[id % palette.length];
}

function buildPopularData() {
  const byZona = { norte: [], centro: [], sur: [] };
  SECTORS.forEach(s => { if (byZona[s.zona]) byZona[s.zona].push(s); });

  POPULAR_SECTORS = [
    ...byZona.norte.slice(0, 4).map(s => s.id),
    ...byZona.centro.slice(0, 3).map(s => s.id),
    ...byZona.sur.slice(0, 3).map(s => s.id),
  ];

  const n1 = byZona.norte[0], c1 = byZona.centro[0], s1 = byZona.sur[0];
  const n2 = byZona.norte[1], c2 = byZona.centro[1], s2 = byZona.sur[1];

  POPULAR_TRIPS = [
    n1 && c1 && { from: n1.id, to: c1.id, label: `${n1.name} → ${c1.name}` },
    c1 && s1 && { from: c1.id, to: s1.id, label: `${c1.name} → ${s1.name}` },
    n2 && s1 && { from: n2.id, to: s1.id, label: `${n2.name} → ${s1.name}` },
    c2 && s2 && { from: c2.id, to: s2.id, label: `${c2.name} → ${s2.name}` },
  ].filter(Boolean);
}

// ══════════════════════════════════════════════════════════
//  DATOS DE RESPALDO
// ══════════════════════════════════════════════════════════
function loadFallbackData() {
  SECTORS = [
    { id:"carc",    name:"Carcelén",          lat:-0.0779, lng:-78.4792, zona:"norte"  },
    { id:"comu",    name:"Comité del Pueblo", lat:-0.0950, lng:-78.4770, zona:"norte"  },
    { id:"ofelia",  name:"La Ofelia",         lat:-0.1100, lng:-78.4900, zona:"norte"  },
    { id:"coton",   name:"Cotocollao",        lat:-0.1200, lng:-78.5000, zona:"norte"  },
    { id:"carol",   name:"La Carolina",       lat:-0.1828, lng:-78.4862, zona:"norte"  },
    { id:"uce",     name:"Univ. Central",     lat:-0.2102, lng:-78.5094, zona:"centro" },
    { id:"marin",   name:"Marín",             lat:-0.2232, lng:-78.5120, zona:"centro" },
    { id:"ejido",   name:"El Ejido",          lat:-0.2050, lng:-78.5030, zona:"centro" },
    { id:"quitum",  name:"Quitumbe",          lat:-0.3148, lng:-78.5551, zona:"sur"    },
    { id:"solanda", name:"Solanda",           lat:-0.2750, lng:-78.5350, zona:"sur"    },
  ];
  SECTOR_BY_ID = {};
  SECTORS.forEach(s => { SECTOR_BY_ID[s.id] = s; SECTOR_BY_ID[Number(s.id)] = s; });
  ROUTES = [
    { id:"r1", linea:"113", empresa:"CATAR",    color:"#FF6B2B", stops:["carc","comu","ofelia","coton","carol","uce","marin"], path:null },
    { id:"r2", linea:"48",  empresa:"Quitumbe", color:"#FF5722", stops:["marin","ejido","solanda","quitum"], path:null },
  ];
  POPULAR_TRIPS = [
    { from:"carc", to:"marin",  label:"Carcelén → Marín" },
    { from:"carol",to:"quitum", label:"La Carolina → Quitumbe" },
  ];
  POPULAR_SECTORS = ["carc","carol","uce","marin","quitum","solanda"];
}

// ══════════════════════════════════════════════════════════
//  MOTOR DE RUTAS POR PROXIMIDAD GEOGRÁFICA
//  Recibe {lat, lng} en lugar de IDs de paradas
// ══════════════════════════════════════════════════════════

// Radio máximo para considerar que un punto "cubre" un origen/destino
const MAX_WALK_M = 600; // 600 metros caminando

/**
 * Encuentra paradas cercanas a un punto geográfico, ordenadas por distancia.
 * @param {number} lat
 * @param {number} lng
 * @param {number} maxMetros
 * @param {number} topN
 * @returns {Array<{sector, distM}>}
 */
function paradasCercanas(lat, lng, maxMetros = MAX_WALK_M, topN = 5) {
  return SECTORS
    .map(s => ({ sector: s, distM: haversineM(lat, lng, s.lat, s.lng) }))
    .filter(x => x.distM <= maxMetros)
    .sort((a, b) => a.distM - b.distM)
    .slice(0, topN);
}

/**
 * Busca rutas entre dos puntos geográficos.
 * Tolerante: busca paradas cercanas al origen y destino,
 * luego encuentra rutas que pasen por ambos conjuntos.
 *
 * @param {{lat, lng}} origin
 * @param {{lat, lng}} dest
 * @returns {Array} resultados de rutas
 */
function findRoutesByCoords(origin, dest) {
  if (!origin || !dest) return [];

  // Paradas cercanas al origen y destino
  let nearOrigin = paradasCercanas(origin.lat, origin.lng, MAX_WALK_M, 8);
  let nearDest   = paradasCercanas(dest.lat, dest.lng, MAX_WALK_M, 8);

  // Si no hay paradas en radio de 600m, ampliar a 1.2km
  if (nearOrigin.length === 0) nearOrigin = paradasCercanas(origin.lat, origin.lng, 1200, 5);
  if (nearDest.length   === 0) nearDest   = paradasCercanas(dest.lat, dest.lng, 1200, 5);

  // Si sigue vacío, ampliar a 2km
  if (nearOrigin.length === 0) nearOrigin = paradasCercanas(origin.lat, origin.lng, 2000, 3);
  if (nearDest.length   === 0) nearDest   = paradasCercanas(dest.lat, dest.lng, 2000, 3);

  if (nearOrigin.length === 0 || nearDest.length === 0) {
    console.warn("⚠️ No se encontraron paradas cercanas al origen o destino");
    return [];
  }

  const originIds = nearOrigin.map(x => x.sector.id);
  const destIds   = nearDest.map(x => x.sector.id);

  const results = [];
  const seen    = new Set();

  // ── 1. Rutas DIRECTAS ──────────────────────────────────
  for (const route of ROUTES) {
    // Encontrar la parada de abordaje más cercana al origen
    let bestBoardIdx = -1, bestBoardDist = Infinity;
    for (const oid of originIds) {
      const idx = route.stops.indexOf(oid);
      if (idx === -1) continue;
      const d = nearOrigin.find(x => x.sector.id === oid)?.distM ?? Infinity;
      if (d < bestBoardDist) { bestBoardDist = d; bestBoardIdx = idx; }
    }
    if (bestBoardIdx === -1) continue;

    // Encontrar la parada de bajada más cercana al destino
    let bestAlightIdx = -1, bestAlightDist = Infinity;
    for (const did of destIds) {
      const idx = route.stops.indexOf(did);
      if (idx === -1) continue;
      const d = nearDest.find(x => x.sector.id === did)?.distM ?? Infinity;
      if (d < bestAlightDist) { bestAlightDist = d; bestAlightIdx = idx; }
    }
    if (bestAlightIdx === -1) continue;
    if (bestBoardIdx === bestAlightIdx) continue;

    // Determinar sentido
    let stops;
    if (bestBoardIdx < bestAlightIdx) {
      stops = route.stops.slice(bestBoardIdx, bestAlightIdx + 1);
    } else {
      stops = [...route.stops.slice(bestAlightIdx, bestBoardIdx + 1)].reverse();
    }
    if (stops.length < 2) continue;

    const key = `D:${route.id}:${stops[0]}:${stops[stops.length - 1]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const walkOriginM = Math.round(bestBoardDist);
    const walkDestM   = Math.round(bestAlightDist);
    const walkMin     = Math.ceil((walkOriginM + walkDestM) / 80); // ~80m/min caminando

    results.push({
      type:          "direct",
      legs:          [{ route, from: stops[0], to: stops[stops.length - 1], stops }],
      totalStops:    stops.length - 1,
      estimatedMin:  (route.estimatedMin
        ? Math.round(route.estimatedMin * stops.length / route.stops.length)
        : calcTime(stops)) + walkMin,
      transfers:     0,
      walkOriginM,
      walkDestM,
      boardStop:     SECTOR_BY_ID[stops[0]],
      alightStop:    SECTOR_BY_ID[stops[stops.length - 1]],
    });
  }

  // ── 2. Rutas CON UN TRANSBORDO ─────────────────────────
  for (const r1 of ROUTES) {
    // Parada de abordaje en r1
    let boardIdx1 = -1, boardDist1 = Infinity;
    for (const oid of originIds) {
      const idx = r1.stops.indexOf(oid);
      if (idx === -1) continue;
      const d = nearOrigin.find(x => x.sector.id === oid)?.distM ?? Infinity;
      if (d < boardDist1) { boardDist1 = d; boardIdx1 = idx; }
    }
    if (boardIdx1 === -1) continue;

    const afterBoard1 = r1.stops.slice(boardIdx1 + 1);

    for (const r2 of ROUTES) {
      if (r1.id === r2.id) continue;

      // Parada de bajada en r2
      let alightIdx2 = -1, alightDist2 = Infinity;
      for (const did of destIds) {
        const idx = r2.stops.indexOf(did);
        if (idx === -1) continue;
        const d = nearDest.find(x => x.sector.id === did)?.distM ?? Infinity;
        if (d < alightDist2) { alightDist2 = d; alightIdx2 = idx; }
      }
      if (alightIdx2 === -1) continue;

      // Buscar parada de transbordo en común
      for (const transferStop of afterBoard1) {
        if (destIds.includes(transferStop)) continue;
        const ti2 = r2.stops.indexOf(transferStop);
        if (ti2 === -1) continue;
        if (ti2 === alightIdx2) continue;

        const idx1 = r1.stops.indexOf(transferStop);
        if (idx1 <= boardIdx1) continue;

        const leg1stops = r1.stops.slice(boardIdx1, idx1 + 1);
        if (leg1stops.length < 2) continue;

        let leg2stops;
        if (ti2 < alightIdx2) {
          leg2stops = r2.stops.slice(ti2, alightIdx2 + 1);
        } else {
          leg2stops = [...r2.stops.slice(alightIdx2, ti2 + 1)].reverse();
        }
        if (leg2stops.length < 2) continue;

        const totalStops = leg1stops.length + leg2stops.length - 2;
        if (totalStops < 2) continue;

        const key = `T:${r1.id}:${transferStop}:${r2.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const walkMin = Math.ceil((boardDist1 + alightDist2) / 80);
        const t1 = r1.estimatedMin
          ? Math.round(r1.estimatedMin * leg1stops.length / r1.stops.length)
          : calcTime(leg1stops);
        const t2 = r2.estimatedMin
          ? Math.round(r2.estimatedMin * leg2stops.length / r2.stops.length)
          : calcTime(leg2stops);

        results.push({
          type: "transfer",
          legs: [
            { route: r1, from: leg1stops[0], to: transferStop, stops: leg1stops },
            { route: r2, from: transferStop, to: leg2stops[leg2stops.length - 1], stops: leg2stops },
          ],
          totalStops,
          transferStop,
          estimatedMin: t1 + t2 + 4 + walkMin,
          transfers: 1,
          walkOriginM: Math.round(boardDist1),
          walkDestM:   Math.round(alightDist2),
          boardStop:   SECTOR_BY_ID[leg1stops[0]],
          alightStop:  SECTOR_BY_ID[leg2stops[leg2stops.length - 1]],
        });

        break; // un transbordo por par de rutas
      }
    }
  }

  // Ordenar: primero directas, luego por tiempo estimado
  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === "direct" ? -1 : 1;
    return a.estimatedMin - b.estimatedMin;
  });

  return results.slice(0, 15);
}

// Mantener findRoutes por compatibilidad (algunos sitios del código lo usan con IDs)
function findRoutes(originId, destId) {
  const o = SECTOR_BY_ID[originId] || SECTOR_BY_ID[String(originId)];
  const d = SECTOR_BY_ID[destId]   || SECTOR_BY_ID[String(destId)];
  if (!o || !d) return [];
  return findRoutesByCoords({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng });
}

function calcTime(stops) {
  let km = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = SECTOR_BY_ID[stops[i]], b = SECTOR_BY_ID[stops[i+1]];
    if (a && b) km += haversineKm(a.lat, a.lng, b.lat, b.lng);
  }
  return Math.max(4, Math.round(km / 20 * 60 + stops.length * 0.8));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function haversineM(lat1, lng1, lat2, lng2) {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}

// ─── Tips por zona ────────────────────────────────────────
const ROUTE_TIPS = {
  norte: [
    "🚌 En hora pico (7–9 AM y 5–7 PM) las rutas del norte suelen estar llenas.",
    "💡 El Portal Norte del Metrobús conecta con múltiples líneas hacia el centro y sur.",
    "🔀 Desde Carcelén puedes tomar la Ecovía hasta Quitumbe sin transbordo.",
  ],
  centro: [
    "🚌 Desde Marín puedes tomar rutas hacia cualquier zona de la ciudad.",
    "💡 El Ejido es un punto de transbordo ideal entre norte y sur.",
    "🔀 El tramo Marín–UCE tiene varias líneas. Si una está llena, la siguiente pasa en minutos.",
  ],
  sur: [
    "🚌 Quitumbe es el terminal sur principal. Muchas rutas confluyen ahí.",
    "💡 El Trolebús y la Ecovía llegan hasta Quitumbe desde el norte.",
    "🔀 San Bartolo conecta fácilmente el centro con el sur de la ciudad.",
  ],
};

// ─── Auth con Supabase ────────────────────────────────────
const SupabaseAuth = {
  async register({ nombre, apellido, cedula, correo, password }) {
    const hash = await hashPassword(password);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json", "Prefer": "return=representation",
      },
      body: JSON.stringify({ nombre, apellido, cedula, correo, password_hash: hash }),
    });
    if (!res.ok) {
      const err = await res.json();
      if (err.code === "23505") {
        if (err.message?.includes("cedula")) throw new Error("La cédula ya está registrada.");
        if (err.message?.includes("correo")) throw new Error("El correo ya está registrado.");
      }
      throw new Error(err.message || "Error al registrar.");
    }
    return (await res.json())[0];
  },

  async login({ correo, password }) {
    const hash = await hashPassword(password);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&password_hash=eq.${encodeURIComponent(hash)}&select=id_usuario,nombre,apellido,correo`,
      { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
    );
    const rows = await res.json();
    if (!rows?.length) throw new Error("Correo o contraseña incorrectos.");
    return rows[0];
  },
};

async function hashPassword(password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ─── INICIALIZACIÓN ────────────────────────────────────────
async function initData() {
  document.body.insertAdjacentHTML("beforeend", `
    <div id="data-loader" style="
      position:fixed;inset:0;background:rgba(26,58,92,.95);
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;z-index:9999;gap:18px;
      font-family:'Plus Jakarta Sans',sans-serif;
    ">
      <svg width="56" height="56" viewBox="0 0 40 40">
        <rect width="40" height="40" rx="10" fill="#FF6B2B"/>
        <rect x="7" y="14" width="26" height="16" rx="4" fill="white"/>
        <circle cx="13" cy="31" r="3" fill="#1A3A5C"/>
        <circle cx="27" cy="31" r="3" fill="#1A3A5C"/>
        <rect x="10" y="9" width="20" height="7" rx="2" fill="white"/>
        <rect x="9" y="17" width="7" height="5" rx="1" fill="#ADE0FF"/>
        <rect x="18" y="17" width="7" height="5" rx="1" fill="#ADE0FF"/>
      </svg>
      <div style="color:white;font-weight:700;font-size:1.1rem;">Cargando rutas de Quito…</div>
      <div style="width:220px;height:5px;background:rgba(255,255,255,.15);border-radius:5px;overflow:hidden;">
        <div id="load-bar" style="height:100%;background:#FF6B2B;border-radius:5px;width:0%;transition:width .5s ease;"></div>
      </div>
      <div style="color:rgba(255,255,255,.4);font-size:.75rem;" id="load-sub">Conectando con la base de datos…</div>
    </div>
  `);

  const bar = document.getElementById("load-bar");
  const sub = document.getElementById("load-sub");
  if (bar) bar.style.width = "40%";

  const ok = await loadDataFromSupabase();

  if (bar) bar.style.width = "100%";
  if (sub) sub.textContent = ok
    ? `✅ ${SECTORS.length} paradas · ${ROUTES.length} rutas listas`
    : `⚠️ Usando datos de demostración (${SECTORS.length} paradas)`;

  await new Promise(r => setTimeout(r, 600));
  const loader = document.getElementById("data-loader");
  if (loader) { loader.style.opacity = "0"; loader.style.transition = "opacity .3s"; }
  await new Promise(r => setTimeout(r, 320));
  loader?.remove();
}
