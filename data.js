/* ══════════════════════════════════════
   BusQuito – Datos: sectores y rutas
   ══════════════════════════════════════ */

// ── SECTORES DE QUITO (con coordenadas y zona) ──────────────
const SECTORS = [
  // Norte
  { id:"carc",   name:"Carcelén",            lat:-0.0779, lng:-78.4792, zona:"norte" },
  { id:"term_c", name:"Terminal Carcelén",   lat:-0.0715, lng:-78.4759, zona:"norte" },
  { id:"cotoc",  name:"Cotocollao",          lat:-0.1148, lng:-78.5015, zona:"norte" },
  { id:"comi",   name:"Comité del Pueblo",   lat:-0.1115, lng:-78.4511, zona:"norte" },
  { id:"carap",  name:"Carapungo",           lat:-0.0906, lng:-78.4426, zona:"norte" },
  { id:"cond",   name:"El Condado",          lat:-0.1258, lng:-78.5088, zona:"norte" },
  { id:"rold",   name:"La Roldós",           lat:-0.1352, lng:-78.5175, zona:"norte" },
  { id:"atuc",   name:"Atucucho",            lat:-0.1601, lng:-78.5261, zona:"norte" },
  { id:"plan",   name:"La Planada",          lat:-0.1041, lng:-78.5050, zona:"norte" },
  { id:"nac_u",  name:"Naciones Unidas",     lat:-0.1726, lng:-78.4844, zona:"norte" },
  { id:"carol",  name:"La Carolina",         lat:-0.1828, lng:-78.4862, zona:"norte" },
  { id:"pomasq", name:"Pomasqui",            lat:-0.0370, lng:-78.4548, zona:"norte" },
  { id:"caldc",  name:"San Juan de Calderón",lat:-0.0820, lng:-78.4250, zona:"norte" },
  { id:"ofeli",  name:"Ofelia",              lat:-0.1550, lng:-78.4890, zona:"norte" },
  { id:"llano",  name:"Llano Chico",         lat:-0.0780, lng:-78.4370, zona:"norte" },
  // Centro
  { id:"marin",  name:"Marín",               lat:-0.2232, lng:-78.5120, zona:"centro" },
  { id:"ejido",  name:"El Ejido",            lat:-0.2084, lng:-78.4986, zona:"centro" },
  { id:"colon",  name:"Colón",               lat:-0.1982, lng:-78.4955, zona:"centro" },
  { id:"marisca",name:"La Mariscal",         lat:-0.1975, lng:-78.4930, zona:"centro" },
  { id:"uce",    name:"Universidad Central", lat:-0.2102, lng:-78.5094, zona:"centro" },
  { id:"san_ju", name:"San Juan",            lat:-0.2189, lng:-78.5148, zona:"centro" },
  { id:"ch_hist",name:"Centro Histórico",    lat:-0.2200, lng:-78.5120, zona:"centro" },
  { id:"la_gas", name:"La Gasca",            lat:-0.2002, lng:-78.5052, zona:"centro" },
  { id:"occi",   name:"Occidental",          lat:-0.1890, lng:-78.5130, zona:"centro" },
  { id:"sem_m",  name:"Seminario Mayor",     lat:-0.1812, lng:-78.5142, zona:"centro" },
  { id:"tocti",  name:"Toctiuco",            lat:-0.2150, lng:-78.5200, zona:"centro" },
  { id:"las_c",  name:"Las Casas",           lat:-0.2030, lng:-78.5180, zona:"centro" },
  { id:"estadio",name:"Estadio Olímpico",    lat:-0.2027, lng:-78.4918, zona:"centro" },
  { id:"aerop",  name:"Aeropuerto",          lat:-0.1273, lng:-78.3577, zona:"centro" },
  { id:"camal",  name:"Camal Metropolitano", lat:-0.2490, lng:-78.5000, zona:"centro" },
  // Sur
  { id:"solanda",name:"Solanda",             lat:-0.2651, lng:-78.5175, zona:"sur" },
  { id:"chillo", name:"Chillogallo",         lat:-0.2952, lng:-78.5350, zona:"sur" },
  { id:"guaman", name:"Guamaní",             lat:-0.3357, lng:-78.5528, zona:"sur" },
  { id:"quitum", name:"Quitumbe",            lat:-0.3148, lng:-78.5551, zona:"sur" },
  { id:"ecuato", name:"La Ecuatoriana",      lat:-0.2975, lng:-78.5610, zona:"sur" },
  { id:"recreo", name:"El Recreo",           lat:-0.2713, lng:-78.5420, zona:"sur" },
  { id:"villaf", name:"Villaflora",          lat:-0.2540, lng:-78.5130, zona:"sur" },
  { id:"magda",  name:"La Magdalena",        lat:-0.2418, lng:-78.5275, zona:"sur" },
  { id:"beater", name:"El Beaterio",         lat:-0.3480, lng:-78.5600, zona:"sur" },
  { id:"san_ro", name:"San Roque",           lat:-0.2258, lng:-78.5220, zona:"sur" },
  { id:"caupic", name:"Caupicho",            lat:-0.3200, lng:-78.5700, zona:"sur" },
  { id:"guajal", name:"Guajaló",             lat:-0.2780, lng:-78.5300, zona:"sur" },
  { id:"cutug",  name:"Cutuglagua",          lat:-0.3600, lng:-78.5750, zona:"sur" },
  { id:"nueva_a",name:"Nueva Aurora",        lat:-0.3020, lng:-78.5230, zona:"sur" },
];

// Índice por id
const SECTOR_BY_ID = {};
SECTORS.forEach(s => { SECTOR_BY_ID[s.id] = s; });

// ── RUTAS (simplificadas: origen → destino + empresa + línea + paradas clave) ──
// Formato: { id, linea, empresa, stops:[sectorId,...], tipo:"directo"|"zona" }
// "stops" = sectores en orden por donde pasa la ruta
const ROUTES = [
  // ═══ NORTE ═══
  { id:"r113", linea:"113", empresa:"CATAR",           color:"#FF6B2B",
    stops:["carc","term_c","cotoc","cond","carol","nac_u","ejido","marin"] },
  { id:"r62",  linea:"62",  empresa:"CATAR",           color:"#FF6B2B",
    stops:["carc","cotoc","ejido","marin"] },
  { id:"r22",  linea:"22",  empresa:"Alborada",        color:"#E91E63",
    stops:["comi","cotoc","carol","estadio","marin"] },
  { id:"r74",  linea:"74",  empresa:"Paquisha",        color:"#9C27B0",
    stops:["ejido","cotoc","cond","caldc"] },
  { id:"r71",  linea:"71",  empresa:"Águila Dorada",   color:"#FF9800",
    stops:["cond","cotoc","uce","marin"] },
  { id:"r102", linea:"102", empresa:"Águila Dorada",   color:"#FF9800",
    stops:["plan","cond","nac_u","carol"] },
  { id:"r161", linea:"161", empresa:"OPERNOR",         color:"#00BCD4",
    stops:["pomasq","ofeli","nac_u","carol","ejido"] },
  { id:"r162", linea:"162", empresa:"OPERNOR",         color:"#00BCD4",
    stops:["caldc","nac_u","carol","ejido"] },
  { id:"r89",  linea:"89",  empresa:"San Carlos",      color:"#4CAF50",
    stops:["rold","atuc","occi","magda","marin"] },
  { id:"r88",  linea:"88",  empresa:"San Carlos",      color:"#4CAF50",
    stops:["estadio","occi","magda","marin"] },
  { id:"r99",  linea:"99",  empresa:"Transporsel",     color:"#607D8B",
    stops:["carap","comi","ejido","marin"] },
  { id:"r98",  linea:"98",  empresa:"Transporsel",     color:"#607D8B",
    stops:["carap","ejido","marin"] },
  { id:"r96",  linea:"96",  empresa:"Reino de Quito",  color:"#3F51B5",
    stops:["llano","caldc","nac_u","carol"] },

  // ═══ CENTRO ═══
  { id:"r02",  linea:"02",  empresa:"Victoria",        color:"#795548",
    stops:["colon","uce","san_ju","camal","marin"] },
  { id:"r25",  linea:"25",  empresa:"Cía. Nacional",   color:"#FF5722",
    stops:["camal","estadio","colon"] },
  { id:"r03",  linea:"03",  empresa:"VEPIEX",          color:"#009688",
    stops:["las_c","uce","marin"] },
  { id:"r84",  linea:"84",  empresa:"Mariscal Sucre",  color:"#673AB7",
    stops:["uce","colon","carol","nac_u"] },
  { id:"r134", linea:"134", empresa:"Colectrans",      color:"#F44336",
    stops:["camal","estadio","colon","aerop"] },
  { id:"r131", linea:"131", empresa:"Trans Alfa",      color:"#8BC34A",
    stops:["occi","las_c","uce","carol"] },

  // ═══ SUR ═══
  { id:"r67",  linea:"67",  empresa:"Latina",          color:"#2196F3",
    stops:["marin","san_ro","magda","villaf","chillo"] },
  { id:"r56",  linea:"56",  empresa:"Urban Quito",     color:"#03A9F4",
    stops:["marin","magda","chillo"] },
  { id:"r18",  linea:"18",  empresa:"San Cristóbal",   color:"#E91E63",
    stops:["marin","magda","chillo"] },
  { id:"r48",  linea:"48",  empresa:"Quitumbe",        color:"#FF5722",
    stops:["marin","san_ro","solanda","quitum"] },
  { id:"r49",  linea:"49",  empresa:"Ecuatoriana",     color:"#4CAF50",
    stops:["marin","san_ro","ecuato","caupic"] },
  { id:"r121", linea:"121", empresa:"Juan Pablo II",   color:"#9C27B0",
    stops:["marin","solanda","quitum"] },
  { id:"r144", linea:"144", empresa:"7 de Mayo",       color:"#FF9800",
    stops:["marin","san_ro","guaman","recreo"] },
  { id:"r32",  linea:"32",  empresa:"Disutransa",      color:"#607D8B",
    stops:["san_ro","recreo","quitum"] },
  { id:"r06",  linea:"06",  empresa:"Bellavista",      color:"#009688",
    stops:["san_ju","guajal","quitum","nueva_a"] },
  { id:"r135", linea:"135", empresa:"Translatinos",    color:"#795548",
    stops:["beater","san_ro","marin","sem_m"] },
  { id:"r76",  linea:"76",  empresa:"Lujoturissa",     color:"#3F51B5",
    stops:["cutug","ecuato","san_ro","uce"] },
  { id:"r140", linea:"140", empresa:"Metrotrans",      color:"#F44336",
    stops:["guaman","san_ro","estadio","marin"] },
  { id:"r141", linea:"141", empresa:"Metrotrans",      color:"#F44336",
    stops:["recreo","san_ro","estadio"] },
];

// ── MOTOR DE BÚSQUEDA DE RUTAS ──────────────────────────────
// Busca rutas directas y con un transbordo entre dos sectores

function findRoutes(originId, destId) {
  if (!originId || !destId || originId === destId) return [];

  const results = [];

  // 1. Rutas DIRECTAS
  ROUTES.forEach(route => {
    const si = route.stops.indexOf(originId);
    const di = route.stops.indexOf(destId);
    if (si !== -1 && di !== -1) {
      const forward = di > si;
      const stopsInOrder = forward
        ? route.stops.slice(si, di + 1)
        : [...route.stops.slice(di, si + 1)].reverse();

      results.push({
        type: "direct",
        legs: [{ route, from: originId, to: destId, stops: stopsInOrder }],
        totalStops: stopsInOrder.length - 1,
        estimatedMin: estimateTime(stopsInOrder.length),
        transfers: 0,
      });
    }
  });

  // 2. Rutas CON UN TRANSBORDO
  if (results.length < 5) {
    ROUTES.forEach(r1 => {
      const si = r1.stops.indexOf(originId);
      if (si === -1) return;

      ROUTES.forEach(r2 => {
        if (r1.id === r2.id) return;
        const di = r2.stops.indexOf(destId);
        if (di === -1) return;

        // Busca intersección entre los stops de r1 (desde origen) y r2 (hasta destino)
        const r1remaining = si <= r1.stops.length - 1
          ? r1.stops.slice(si)
          : r1.stops.slice(0, si + 1).reverse();

        for (const transferStop of r1remaining) {
          const ti2 = r2.stops.indexOf(transferStop);
          if (ti2 === -1) continue;
          const forward2 = di > ti2;
          if (!forward2 && di === ti2) continue;

          const leg1stops = r1remaining.slice(0, r1remaining.indexOf(transferStop) + 1);
          const leg2stops = forward2
            ? r2.stops.slice(ti2, di + 1)
            : [...r2.stops.slice(di, ti2 + 1)].reverse();

          const totalStops = leg1stops.length + leg2stops.length - 2;
          if (totalStops < 1) continue;

          // Evitar duplicados de transbordo
          const key = `${r1.id}-${transferStop}-${r2.id}`;
          if (results.find(r => r._key === key)) continue;

          results.push({
            _key: key,
            type: "transfer",
            legs: [
              { route: r1, from: originId, to: transferStop, stops: leg1stops },
              { route: r2, from: transferStop, to: destId, stops: leg2stops },
            ],
            totalStops,
            transferStop,
            estimatedMin: estimateTime(totalStops) + 5,
            transfers: 1,
          });
          break; // solo la primera intersección por par de rutas
        }
      });
    });
  }

  // Ordenar: directas primero, luego por tiempo
  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === "direct" ? -1 : 1;
    return a.estimatedMin - b.estimatedMin;
  });

  // Limitar a 8 resultados para no saturar
  return results.slice(0, 8);
}

function estimateTime(stops) {
  // ~3 min por parada + 2 min base
  return Math.max(5, stops * 3 + 2);
}

// ── RUTAS POPULARES (para la live card) ─────────────────────
const POPULAR_TRIPS = [
  { from:"carol",   to:"quitum",  label:"La Carolina → Quitumbe" },
  { from:"carc",    to:"marin",   label:"Carcelén → Marín" },
  { from:"caldc",   to:"uce",     label:"Calderón → UCE" },
  { from:"colon",   to:"chillo",  label:"Colón → Chillogallo" },
  { from:"ejido",   to:"guaman",  label:"El Ejido → Guamaní" },
  { from:"pomasq",  to:"estadio", label:"Pomasqui → Estadio" },
  { from:"carap",   to:"marin",   label:"Carapungo → Marín" },
  { from:"recreo",  to:"carol",   label:"El Recreo → La Carolina" },
];

// Sectores populares para chips rápidos
const POPULAR_SECTORS = [
  "carc","marin","carol","quitum","uce","ejido","chillo","carap","guaman","estadio"
];

// Tips por zona
const ROUTE_TIPS = {
  norte: [
    "🚌 En hora pico (7–9 AM y 5–7 PM) las rutas del norte suelen estar llenas. Considera salir un poco antes.",
    "💡 La terminal de Carcelén es un excelente punto de conexión hacia todo el norte.",
    "🔀 Puedes combinar la línea 113 o 62 con cualquier ruta del centro.",
  ],
  centro: [
    "🚌 El tramo Marín–UCE tiene varias líneas. Si una está llena, la siguiente pasa en minutos.",
    "💡 Desde Marín puedes tomar rutas hacia cualquier zona de la ciudad.",
    "🔀 El Ejido es un punto de transbordo ideal entre norte y sur.",
  ],
  sur: [
    "🚌 Quitumbe es el terminal sur principal. Muchas rutas confluyen ahí.",
    "💡 Las líneas 121 y 48 son las más frecuentes hacia el sur.",
    "🔀 San Roque conecta fácilmente el centro con el sur de la ciudad.",
  ],
};
