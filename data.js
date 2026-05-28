/* ══════════════════════════════════════
   BusQuito – data.js  (v5 – FIXES RUTAS)
   
   FIXES:
   1. fetchAllPages: extraParams sin doble-encode
   2. Rutas: usa fetchAllPages en vez de SBQuery
   3. Fallback: si activa=eq.true falla, filtra en JS
   4. SECTOR_BY_ID indexado por string Y número
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

// ══════════════════════════════════════════════════════════
//  PAGINACIÓN — extraParams sin doble encodeURIComponent
//  Los valores ya vienen en formato PostgREST: "eq.true", "asc"
// ══════════════════════════════════════════════════════════
async function fetchAllPages(table, selectCols, extraParams = {}) {
  const pageSize = 1000;
  let results    = [];
  let offset     = 0;
  let totalKnown = null;

  while (true) {
    const qsParts = [`select=${encodeURIComponent(selectCols)}`];
    Object.entries(extraParams).forEach(([k, v]) => {
      // NO doble-encodear: v ya es valor PostgREST (ej: "eq.true", "orden_parada.asc")
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
      // Si falla con filtros, reintentar sin ellos
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
    if (!Array.isArray(chunk) || chunk.length === 0) {
      console.log(`✅ ${table}: fin de datos en offset ${offset}`);
      break;
    }

    results = results.concat(chunk);
    console.log(`📦 ${table}: ${results.length}/${totalKnown ?? "?"} cargados`);

    if (totalKnown !== null && results.length >= totalKnown) {
      console.log(`✅ ${table}: carga completa (${results.length} registros)`);
      break;
    }
    if (chunk.length < pageSize) {
      console.log(`✅ ${table}: última página (chunk=${chunk.length})`);
      break;
    }

    offset += pageSize;
  }

  return results;
}

// ══════════════════════════════════════════════════════════
//  CARGA DESDE SUPABASE
// ══════════════════════════════════════════════════════════
async function loadDataFromSupabase() {
  if (!SUPABASE_CONFIGURED) {
    console.warn("⚠️  Credenciales de Supabase no configuradas. Usando datos de respaldo.");
    loadFallbackData();
    return false;
  }

  try {
    // ── 1. Paradas ─────────────────────────────────────────
    console.log("🔄 Cargando paradas…");
    const rawParadas = await fetchAllPages(
      "paradas",
      "id_parada,nombre,latitud,longitud"
    );

    if (!rawParadas || rawParadas.length === 0) {
      throw new Error("Sin paradas en Supabase — verifica RLS y permisos anon");
    }
    console.log(`✅ Paradas cargadas: ${rawParadas.length}`);

    SECTORS = rawParadas.map(p => ({
      id:   String(p.id_parada),
      name: (p.nombre || `Parada ${p.id_parada}`).trim(),
      lat:  parseFloat(p.latitud),
      lng:  parseFloat(p.longitud),
      zona: inferZona(parseFloat(p.latitud)),
    })).filter(s => !isNaN(s.lat) && !isNaN(s.lng));

    // FIX: indexar por string Y por número para evitar mismatches de tipo
    SECTOR_BY_ID = {};
    SECTORS.forEach(s => {
      SECTOR_BY_ID[s.id]        = s;   // "123" → sector
      SECTOR_BY_ID[Number(s.id)] = s;  // 123   → sector
    });
    console.log(`✅ SECTOR_BY_ID construido con ${SECTORS.length} entradas`);

    // ── 2. Rutas — ahora con fetchAllPages en vez de SBQuery ──
    console.log("🔄 Cargando rutas…");

    // Intentar primero con filtro activa=true
    let rawRutas = await fetchAllPages(
      "rutas",
      "id_ruta,nombre,cooperativa,color,codigo,tiempo_estimado,activa",
      { "activa": "eq.true" }
    );

    // Si no trajo nada con el filtro, traer todas y filtrar en JS
    if (!rawRutas || rawRutas.length === 0) {
      console.warn("⚠️ Sin rutas con activa=eq.true, cargando todas y filtrando en JS…");
      rawRutas = await fetchAllPages(
        "rutas",
        "id_ruta,nombre,cooperativa,color,codigo,tiempo_estimado,activa"
      );
      rawRutas = rawRutas.filter(r => r.activa !== false);
      console.log(`⚠️ Rutas tras filtrar en JS: ${rawRutas.length}`);
    }

    // Si todavía no hay rutas, intentar sin columna codigo (por si no existe)
    if (!rawRutas || rawRutas.length === 0) {
      console.warn("⚠️ Reintentando rutas sin columna 'codigo'…");
      rawRutas = await fetchAllPages(
        "rutas",
        "id_ruta,nombre,cooperativa,color,tiempo_estimado,activa"
      );
      rawRutas = rawRutas.filter(r => r.activa !== false);
      console.log(`⚠️ Rutas (sin codigo) tras filtrar en JS: ${rawRutas.length}`);
    }

    if (!rawRutas || rawRutas.length === 0) {
      throw new Error("Sin rutas en Supabase — verifica RLS y que activa=true en alguna ruta");
    }
    console.log(`✅ Rutas cargadas desde BD: ${rawRutas.length}`);

    // ── 3. Relación ruta↔parada ────────────────────────────
    console.log("🔄 Cargando ruta_paradas…");
    const rawRP = await fetchAllPages(
      "ruta_paradas",
      "id_ruta,id_parada,orden_parada",
      { "order": "orden_parada.asc" }
    );
    console.log(`✅ Ruta-paradas cargadas: ${rawRP.length}`);

    // Agrupar paradas por ruta
    const paradasPorRuta = {};
    rawRP.forEach(rp => {
      const rid = String(rp.id_ruta);
      if (!paradasPorRuta[rid]) paradasPorRuta[rid] = [];
      paradasPorRuta[rid].push({
        id:    String(rp.id_parada),
        orden: rp.orden_parada,
      });
    });

    // Diagnóstico
    let paradasNoEncontradas = 0;
    let paradasEncontradas   = 0;
    let rutasDescartadas     = 0;

    ROUTES = rawRutas.map(r => {
      const grupo   = paradasPorRuta[String(r.id_ruta)] || [];
      const paradas = grupo
        .sort((a, b) => a.orden - b.orden)
        .map(p => {
          // FIX: buscar por string Y por número
          const found = SECTOR_BY_ID[p.id] || SECTOR_BY_ID[Number(p.id)];
          if (found) {
            paradasEncontradas++;
            return found.id; // siempre retornar el id como string canónico
          } else {
            paradasNoEncontradas++;
            return null;
          }
        })
        .filter(Boolean);

      if (paradas.length < 2) {
        rutasDescartadas++;
        return null;
      }

      const linea = (r.codigo || r.nombre || String(r.id_ruta)).trim();

      return {
        id:           `r${r.id_ruta}`,
        _dbId:        r.id_ruta,
        linea,
        empresa:      (r.cooperativa || "Sin cooperativa").trim(),
        color:        r.color || randomRouteColor(r.id_ruta),
        stops:        paradas,
        estimatedMin: r.tiempo_estimado || null,
        path:         null,
      };
    }).filter(Boolean);

    console.log(`✅ Rutas construidas: ${ROUTES.length}`);
    if (rutasDescartadas > 0)
      console.warn(`⚠️ ${rutasDescartadas} rutas descartadas por <2 paradas válidas`);
    if (paradasNoEncontradas > 0)
      console.warn(`⚠️ ${paradasNoEncontradas} paradas en ruta_paradas sin match en SECTOR_BY_ID`);

    const pctMissing = rawRP.length > 0
      ? Math.round(paradasNoEncontradas / rawRP.length * 100)
      : 0;
    if (pctMissing > 10) {
      console.error(
        `🚨 ${pctMissing}% de ruta_paradas sin match. ` +
        `BD tiene ${rawParadas.length} paradas. Muestra de IDs en ruta_paradas:`,
        rawRP.slice(0, 3).map(r => r.id_parada),
        `Muestra de IDs en SECTOR_BY_ID:`,
        Object.keys(SECTOR_BY_ID).slice(0, 3)
      );
    }

    // ── 4. Coordenadas de ruta ─────────────────────────────
    console.log("🔄 Cargando coordenadas_ruta…");
    const rawCoords = await fetchAllPages(
      "coordenadas_ruta",
      "id_ruta,latitud,longitud,orden_coordenada",
      { "order": "orden_coordenada.asc" }
    );
    console.log(`✅ Coordenadas GPS cargadas: ${rawCoords.length}`);

    if (rawCoords.length > 0) {
      const coordsPorRuta = {};
      rawCoords.forEach(c => {
        const rid = String(c.id_ruta);
        if (!coordsPorRuta[rid]) coordsPorRuta[rid] = [];
        coordsPorRuta[rid].push({
          lat:   parseFloat(c.latitud),
          lng:   parseFloat(c.longitud),
          orden: c.orden_coordenada,
        });
      });

      let rutasConPath = 0;
      ROUTES.forEach(route => {
        const rid    = String(route._dbId);
        const puntos = coordsPorRuta[rid];
        if (puntos && puntos.length > 1) {
          route.path = puntos
            .sort((a, b) => a.orden - b.orden)
            .map(p => [p.lat, p.lng]);
          rutasConPath++;
        }
      });
      console.log(`✅ ${rutasConPath} rutas con trayectoria GPS real`);
    } else {
      console.warn("⚠️ coordenadas_ruta vacía — mapas con líneas rectas entre paradas");
    }

    buildPopularData();

    console.log(
      `\n🚌 BusQuito listo:\n` +
      `   Paradas : ${SECTORS.length}\n` +
      `   Rutas   : ${ROUTES.length}\n` +
      `   Con GPS : ${ROUTES.filter(r => r.path).length}`
    );

    // Test del motor de búsqueda
    if (ROUTES.length > 0) {
      const r0 = ROUTES[0];
      const testO = r0.stops[0];
      const testD = r0.stops[r0.stops.length - 1];
      const testResults = findRoutes(testO, testD);
      console.log(`🔍 Test findRoutes(${testO} → ${testD}): ${testResults.length} resultados`);
      if (testResults.length === 0) {
        console.error("🚨 findRoutes retorna 0 en ruta conocida");
        console.log("   Stops de r0:", r0.stops.slice(0, 5));
        console.log("   Keys SECTOR_BY_ID:", Object.keys(SECTOR_BY_ID).slice(0, 5));
      }
    }

    return true;

  } catch (err) {
    console.error("❌ Error cargando desde Supabase:", err.message, err);
    loadFallbackData();
    return false;
  }
}

// ─── Color consistente por id ──────────────────────────────
function randomRouteColor(id) {
  const palette = ["#FF6B2B","#2196F3","#4CAF50","#9C27B0","#F44336","#00BCD4","#FF9800","#607D8B","#E91E63","#3F51B5"];
  return palette[id % palette.length];
}

// ─── Popular data ──────────────────────────────────────────
function buildPopularData() {
  const byZona = { norte: [], centro: [], sur: [] };
  SECTORS.forEach(s => { if (byZona[s.zona]) byZona[s.zona].push(s); });

  POPULAR_SECTORS = [
    ...byZona.norte.slice(0, 4).map(s => s.id),
    ...byZona.centro.slice(0, 3).map(s => s.id),
    ...byZona.sur.slice(0, 3).map(s => s.id),
  ];

  const n1 = byZona.norte[0],  n2 = byZona.norte[1];
  const c1 = byZona.centro[0], c2 = byZona.centro[1];
  const s1 = byZona.sur[0],    s2 = byZona.sur[1];

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
  console.warn("⚠️  Usando datos de respaldo offline.");

  SECTORS = [
    { id:"carc",    name:"Carcelén",            lat:-0.0779, lng:-78.4792, zona:"norte"  },
    { id:"comu",    name:"Comité del Pueblo",   lat:-0.0950, lng:-78.4770, zona:"norte"  },
    { id:"ofelia",  name:"La Ofelia",           lat:-0.1100, lng:-78.4900, zona:"norte"  },
    { id:"coton",   name:"Cotocollao",          lat:-0.1200, lng:-78.5000, zona:"norte"  },
    { id:"carol",   name:"La Carolina",         lat:-0.1828, lng:-78.4862, zona:"norte"  },
    { id:"jipij",   name:"Jipijapa",            lat:-0.1700, lng:-78.4830, zona:"norte"  },
    { id:"6dic",    name:"6 de Diciembre",      lat:-0.1900, lng:-78.4880, zona:"norte"  },
    { id:"quito",   name:"El Quito",            lat:-0.1650, lng:-78.5050, zona:"norte"  },
    { id:"belav",   name:"Bellavista",          lat:-0.1750, lng:-78.4970, zona:"norte"  },
    { id:"rumin",   name:"Rumipamba",           lat:-0.1820, lng:-78.5020, zona:"norte"  },
    { id:"uce",     name:"Univ. Central",       lat:-0.2102, lng:-78.5094, zona:"centro" },
    { id:"marin",   name:"Marín",               lat:-0.2232, lng:-78.5120, zona:"centro" },
    { id:"legar",   name:"La Gasca",            lat:-0.2000, lng:-78.5100, zona:"centro" },
    { id:"ejido",   name:"El Ejido",            lat:-0.2050, lng:-78.5030, zona:"centro" },
    { id:"plaza",   name:"Plaza Grande",        lat:-0.2200, lng:-78.5130, zona:"centro" },
    { id:"sanfr",   name:"San Francisco",       lat:-0.2240, lng:-78.5140, zona:"centro" },
    { id:"laflo",   name:"La Floresta",         lat:-0.2100, lng:-78.4960, zona:"centro" },
    { id:"gonza",   name:"González Suárez",     lat:-0.2150, lng:-78.4870, zona:"centro" },
    { id:"inca",    name:"El Inca",             lat:-0.1985, lng:-78.4820, zona:"norte"  },
    { id:"batall",  name:"Batallón Pichincha",  lat:-0.2050, lng:-78.5200, zona:"centro" },
    { id:"sroke",   name:"San Roque",           lat:-0.2310, lng:-78.5180, zona:"centro" },
    { id:"calcet",  name:"Calacalí (conexión)", lat:-0.2280, lng:-78.5220, zona:"centro" },
    { id:"quitum",  name:"Quitumbe",            lat:-0.3148, lng:-78.5551, zona:"sur"    },
    { id:"chillo",  name:"Chillogallo",         lat:-0.2952, lng:-78.5350, zona:"sur"    },
    { id:"solanda", name:"Solanda",             lat:-0.2750, lng:-78.5350, zona:"sur"    },
    { id:"turub",   name:"Turubamba",           lat:-0.3200, lng:-78.5450, zona:"sur"    },
    { id:"guaman",  name:"Guamaní",             lat:-0.3350, lng:-78.5500, zona:"sur"    },
    { id:"cdmex",   name:"Cdla. México",        lat:-0.2600, lng:-78.5250, zona:"sur"    },
    { id:"laarg",   name:"La Argelia",          lat:-0.2700, lng:-78.5100, zona:"sur"    },
    { id:"villag",  name:"Villa Gloria",        lat:-0.2550, lng:-78.5400, zona:"sur"    },
    { id:"pormef",  name:"El Porvenirmef",      lat:-0.2800, lng:-78.5300, zona:"sur"    },
    { id:"cbella",  name:"Ciudad Bel Bella",    lat:-0.2450, lng:-78.5300, zona:"sur"    },
    { id:"portal",  name:"Portal Norte (Metrobús)", lat:-0.0810, lng:-78.4782, zona:"norte" },
    { id:"ecovtq",  name:"Trole/Eco - Quitumbe",    lat:-0.3150, lng:-78.5560, zona:"sur"   },
    { id:"cmagd",   name:"C. Comercial Magda",       lat:-0.1500, lng:-78.4950, zona:"norte" },
    { id:"emed",    name:"El Mercado",               lat:-0.2180, lng:-78.5150, zona:"centro"},
    { id:"ltung",   name:"La Tungurahua",            lat:-0.2420, lng:-78.5220, zona:"sur"   },
    { id:"sanbar",  name:"San Bartolo",              lat:-0.2500, lng:-78.5280, zona:"sur"   },
    { id:"catali",  name:"Santa Catalina",           lat:-0.2640, lng:-78.5310, zona:"sur"   },
    { id:"mitad",   name:"Mitad del Mundo",          lat: 0.0022, lng:-78.4558, zona:"norte" },
  ];

  SECTOR_BY_ID = {};
  SECTORS.forEach(s => {
    SECTOR_BY_ID[s.id]        = s;
    SECTOR_BY_ID[Number(s.id)] = s;
  });

  ROUTES = [
    { id:"r1",  linea:"113",    empresa:"CATAR",        color:"#FF6B2B", stops:["carc","comu","ofelia","coton","carol","uce","marin"] },
    { id:"r2",  linea:"67",     empresa:"Latina",       color:"#2196F3", stops:["marin","uce","ejido","laflo","gonza","6dic","carol"] },
    { id:"r3",  linea:"48",     empresa:"Quitumbe",     color:"#FF5722", stops:["marin","plaza","sanfr","sroke","cdmex","solanda","chillo","quitum"] },
    { id:"r4",  linea:"25",     empresa:"Servilujos",   color:"#4CAF50", stops:["portal","carc","comu","jipij","carol","ejido","uce","marin"] },
    { id:"r5",  linea:"32",     empresa:"Cotocollao",   color:"#9C27B0", stops:["coton","quito","belav","rumin","uce","ejido","sanfr","plaza"] },
    { id:"r6",  linea:"55",     empresa:"Turubamba",    color:"#E91E63", stops:["quitum","turub","guaman","solanda","chillo","villag","cbella","ltung","emed","marin"] },
    { id:"r7",  linea:"78",     empresa:"Sur Express",  color:"#00BCD4", stops:["portal","inca","6dic","gonza","laflo","uce","batall","sroke","laarg","solanda","quitum"] },
    { id:"r8",  linea:"83",     empresa:"Ecuador",      color:"#FF9800", stops:["mitad","carc","portal","comu","cmagd","carol","jipij","rumin","uce"] },
    { id:"r9",  linea:"112",    empresa:"CATAR Norte",  color:"#3F51B5", stops:["carc","ofelia","coton","quito","belav","inca","6dic","carol","ejido"] },
    { id:"r10", linea:"91",     empresa:"Villaflora",   color:"#795548", stops:["uce","ejido","laflo","gonza","inca","6dic","carol","jipij"] },
    { id:"r11", linea:"24A",    empresa:"San Bartolo",  color:"#607D8B", stops:["marin","emed","ltung","sanbar","catali","cdmex","pormef","solanda","chillo"] },
    { id:"r12", linea:"36",     empresa:"Río Coca",     color:"#8BC34A", stops:["carol","belav","rumin","ejido","uce","batall","calcet","sroke","cbella","sanbar"] },
    { id:"r13", linea:"71",     empresa:"Oriental",     color:"#F44336", stops:["comu","coton","quito","belav","rumin","6dic","gonza","laflo","ejido","uce","marin","plaza"] },
    { id:"r14", linea:"Ecovía", empresa:"EcovíaQ",      color:"#009688", stops:["portal","comu","ofelia","coton","carol","inca","ejido","uce","marin","ltung","sanbar","catali","solanda","quitum","ecovtq"] },
    { id:"r15", linea:"Trole",  empresa:"Trolebús",     color:"#1A3A5C", stops:["portal","quito","belav","uce","ejido","marin","sroke","cdmex","solanda","chillo","quitum","ecovtq"] },
  ];

  POPULAR_TRIPS = [
    { from:"carc",   to:"marin",   label:"Carcelén → Marín" },
    { from:"carol",  to:"quitum",  label:"La Carolina → Quitumbe" },
    { from:"uce",    to:"chillo",  label:"Univ. Central → Chillogallo" },
    { from:"portal", to:"solanda", label:"Portal Norte → Solanda" },
  ];

  POPULAR_SECTORS = ["carc","carol","uce","marin","quitum","solanda","portal","ejido","6dic","gonza"];
}

// ══════════════════════════════════════════════════════════
//  MOTOR DE RUTAS
// ══════════════════════════════════════════════════════════
function findRoutes(originId, destId) {
  if (!originId || !destId || originId === destId) return [];

  originId = String(originId);
  destId   = String(destId);

  const results = [];
  const seen    = new Set();

  function distBetween(idA, idB) {
    const a = SECTOR_BY_ID[idA], b = SECTOR_BY_ID[idB];
    if (!a || !b) return 0;
    return haversineKm(a.lat, a.lng, b.lat, b.lng);
  }

  function calcTime(stops) {
    let km = 0;
    for (let i = 0; i < stops.length - 1; i++) km += distBetween(stops[i], stops[i+1]);
    return Math.max(4, Math.round(km / 20 * 60 + stops.length * 0.8));
  }

  // ── 1. Rutas DIRECTAS ────────────────────────────────
  ROUTES.forEach(route => {
    const si = route.stops.indexOf(originId);
    const di = route.stops.indexOf(destId);
    if (si === -1 || di === -1 || si === di) return;

    const stopsInOrder = si < di
      ? route.stops.slice(si, di + 1)
      : [...route.stops.slice(di, si + 1)].reverse();

    const key = `D:${route.id}:${si}:${di}`;
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      type:         "direct",
      legs:         [{ route, from: originId, to: destId, stops: stopsInOrder }],
      totalStops:   stopsInOrder.length - 1,
      estimatedMin: route.estimatedMin || calcTime(stopsInOrder),
      transfers:    0,
    });
  });

  // ── 2. Rutas CON UN TRANSBORDO ───────────────────────
  ROUTES.forEach(r1 => {
    const si1 = r1.stops.indexOf(originId);
    if (si1 === -1) return;

    const afterOrigin = r1.stops.slice(si1 + 1);

    ROUTES.forEach(r2 => {
      if (r1.id === r2.id) return;
      const di2 = r2.stops.indexOf(destId);
      if (di2 === -1) return;

      for (const transferStop of afterOrigin) {
        if (transferStop === originId || transferStop === destId) continue;

        const ti2 = r2.stops.indexOf(transferStop);
        if (ti2 === -1) continue;

        const idx1 = r1.stops.indexOf(transferStop);
        if (idx1 <= si1) continue;

        const leg1stops = r1.stops.slice(si1, idx1 + 1);
        if (leg1stops.length < 2) continue;

        const leg2stops = ti2 < di2
          ? r2.stops.slice(ti2, di2 + 1)
          : [...r2.stops.slice(di2, ti2 + 1)].reverse();

        if (leg2stops.length < 2) continue;

        const totalStops = leg1stops.length + leg2stops.length - 2;
        if (totalStops < 1) continue;

        const key = `T:${r1.id}:${transferStop}:${r2.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const t1 = r1.estimatedMin
          ? Math.round(r1.estimatedMin * leg1stops.length / r1.stops.length)
          : calcTime(leg1stops);
        const t2 = r2.estimatedMin
          ? Math.round(r2.estimatedMin * leg2stops.length / r2.stops.length)
          : calcTime(leg2stops);

        results.push({
          type: "transfer",
          legs: [
            { route: r1, from: originId,    to: transferStop, stops: leg1stops },
            { route: r2, from: transferStop, to: destId,       stops: leg2stops },
          ],
          totalStops,
          transferStop,
          estimatedMin: t1 + t2 + 4,
          transfers: 1,
        });

        break;
      }
    });
  });

  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === "direct" ? -1 : 1;
    return a.estimatedMin - b.estimatedMin;
  });

  return results.slice(0, 15);
}

// ─── Haversine ────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── Tips por zona ────────────────────────────────────────
const ROUTE_TIPS = {
  norte: [
    "🚌 En hora pico (7–9 AM y 5–7 PM) las rutas del norte suelen estar llenas. Considera salir un poco antes.",
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
    const res  = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
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
    const res  = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&password_hash=eq.${encodeURIComponent(hash)}&select=id_usuario,nombre,apellido,correo`,
      { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
    );
    const rows = await res.json();
    if (!rows?.length) throw new Error("Correo o contraseña incorrectos.");
    return rows[0];
  },
};

async function hashPassword(password) {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
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
      <div style="color:white;font-weight:700;font-size:1.1rem;" id="load-msg">
        Cargando rutas de Quito…
      </div>
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
    ? `✅ ${SECTORS.length} paradas · ${ROUTES.length} rutas`
    : `⚠️ Usando datos de demostración (${SECTORS.length} paradas)`;

  await new Promise(r => setTimeout(r, 600));
  const loader = document.getElementById("data-loader");
  if (loader) { loader.style.opacity = "0"; loader.style.transition = "opacity .3s"; }
  await new Promise(r => setTimeout(r, 320));
  loader?.remove();
}
