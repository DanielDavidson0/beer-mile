/* Beer Mile Line — standalone site. Data lives in this browser's localStorage. */
"use strict";

/* ============================ helpers ============================ */
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fs = s => (s == null || s === "" || isNaN(+s)) ? "–" : (+s).toFixed(1);
const clone = o => JSON.parse(JSON.stringify(o));
const rid = p => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {weekday:"short", day:"numeric", month:"short", year:"numeric"}); } catch (e) { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SMALL = new Set(["a","an","and","as","at","but","by","for","in","of","on","or","the","to","with","from","nor"]);
function titleCase(s) {
  return s.split(/(\s+)/).map((w, i, arr) => {
    if (!w || /^\s+$/.test(w)) return w;
    if (/[A-Z]/.test(w.slice(1)) || /\d/.test(w)) return w;
    const lw = w.toLowerCase();
    if (i !== 0 && i !== arr.length - 1 && SMALL.has(lw)) return lw;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join("");
}
function makeInitials(nm, roster) {
  const w = nm.split(" ").map(x => x.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
  const f = (w[0] || "P")[0].toUpperCase(), last = w.length > 1 ? w[w.length - 1] : "";
  const c = [f + (last[0] || "").toUpperCase()];
  if (last.length > 1) c.push(f + last.slice(0, 2).toUpperCase());
  if (w[0] && w[0].length > 1) c.push(w[0].slice(0, 2).toUpperCase() + (last[0] || "").toUpperCase());
  for (const x of c) if (!roster[x]) return x;
  let i = 2; while (roster[c[0] + i]) i++; return c[0] + i;
}
// distance in metres
function dist(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/* ============================ storage ============================ */
const LS = {data: "bml-data-v1", pref: "bml-pref-v1", geo: "bml-geo-v1"};
const load = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
let storageOK = true;
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { storageOK = false; toast("Couldn't save on this device (storage full or blocked)."); } }

let D = load(LS.data) || clone(SEED);
D.roster = D.roster || {}; D.trips = D.trips || []; D.variants = D.variants || [];
const save = () => store(LS.data, D);
if (!load(LS.data)) save();

let pref = Object.assign({mapId: "bermondsey", rev: false, prio: true, view: "line"}, load(LS.pref) || {});
const savePref = () => store(LS.pref, pref);
let GEO = load(LS.geo) || {stops: {}, tried: {}};
const saveGeo = () => store(LS.geo, GEO);

/* ============================ maps ============================ */
const allMaps = () => [...BASE_MAPS, ...D.variants];
const getMap = id => allMaps().find(m => m.id === id) || null;
const curMap = () => getMap(pref.mapId) || BASE_MAPS[0];
const isBase = m => BASE_MAPS.includes(m);
function stopIndex() {
  const ix = {};
  allMaps().forEach(m => m.stops.forEach(s => { if (!ix[s.id]) ix[s.id] = s; }));
  return ix;
}
function stopName(id, visit) { const s = stopIndex()[id]; return s ? s.n : (visit && visit.n) || id; }
function coordOf(s) {
  if (s.lat != null && s.lng != null) return [s.lat, s.lng];
  const g = GEO.stops[s.id]; return g ? [g.lat, g.lng] : null;
}
function visitCount(id) {
  let n = 0, tried = 0;
  D.trips.forEach(t => (t.visits || []).forEach(v => { if (v.v === id) v.status === "noentry" ? tried++ : n++; }));
  return {n, tried};
}
const sideLabel = (m, s) => s.off ? (m.offLabel || "Off the main route") : (m.sides && m.sides[s.side] ? m.sides[s.side].name : "");
const termName = (m, k) => (m.termini && m.termini[k]) ? m.termini[k].name : null;
function startOptions(m) {
  const a = termName(m, "a") || ("From " + (m.stops[0] ? m.stops[0].n : "start"));
  const b = termName(m, "b") || ("From " + (m.stops.length ? m.stops[m.stops.length - 1].n : "end"));
  return {a, b};
}
const stopsInOrder = (m, start) => start === "b" ? [...m.stops].reverse() : m.stops;

/* ============================ state ============================ */
let tab = "map", tripView = null, edit = null, builder = null, lmap = null, bmap = null;
const activeTrip = () => [...D.trips].sort((a, b) => (b.date || "").localeCompare(a.date || "")).find(t => t.status === "active") || null;
const sortedTrips = () => [...D.trips].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

/* ============================ OpenStreetMap ============================ */
const OVERPASS = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
async function overpass(q) {
  let lastErr;
  for (const u of OVERPASS) {
    try {
      const r = await fetch(u, {method: "POST", body: "data=" + encodeURIComponent(q), headers: {"Content-Type": "application/x-www-form-urlencoded"}});
      if (r.ok) return (await r.json()).elements || [];
      lastErr = new Error("OpenStreetMap is busy (" + r.status + ")");
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Couldn't reach OpenStreetMap");
}
const DRINK_FILTERS = ['["amenity"~"^(pub|bar|biergarten)$"]', '["craft"~"^(brewery|cider|winery|distillery)$"]', '["microbrewery"="yes"]', '["industrial"="brewery"]["name"]'];
function placeFromEl(e) {
  const t = e.tags || {}, lat = e.lat ?? (e.center && e.center.lat), lng = e.lon ?? (e.center && e.center.lon);
  if (!t.name || lat == null) return null;
  const addr = [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:postcode"]].filter(Boolean).join(", ");
  return {osm: e.type + "/" + e.id, n: t.name, lat, lng, a: addr, kind: t.amenity || t.craft || t.industrial || "bar"};
}
async function placesInBox(b) {
  const box = `(${b[0]},${b[1]},${b[2]},${b[3]})`;
  const q = `[out:json][timeout:25];(${DRINK_FILTERS.map(f => `nwr${f}${box};`).join("")}nwr["amenity"~"^(restaurant|cafe|nightclub)$"]["name"]${box};nwr["shop"~"^(alcohol|beverages)$"]${box};);out center tags;`;
  return (await overpass(q)).map(placeFromEl).filter(Boolean);
}
async function barsAlong(path, width) {
  const line = path.map(p => p[0].toFixed(6) + "," + p[1].toFixed(6)).join(",");
  const q = `[out:json][timeout:25];(${DRINK_FILTERS.map(f => `nwr${f}(around:${width},${line});`).join("")});out center tags;`;
  const seen = new Set();
  return (await overpass(q)).map(placeFromEl).filter(p => p && !seen.has(p.osm) && seen.add(p.osm));
}
const STOPW = new Set(["the","brewery","brewing","brew","co","company","taproom","tap","room","bar","and","social","london","ltd","beer","house","brewhouse","pub","manchester"]);
const toks = s => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w && !STOPW.has(w));
function nameScore(stop, name) {
  const nt = toks(name); let best = 0;
  for (const c of [stop.n, ...(stop.k || [])]) {
    const ct = toks(c); if (!ct.length || !nt.length) continue;
    const inter = ct.filter(t => nt.includes(t)).length;
    best = Math.max(best, inter / Math.min(ct.length, nt.length));
  }
  return best;
}
async function nominatim(q, bbox) {
  let u = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=" + encodeURIComponent(q);
  if (bbox) u += `&viewbox=${bbox[1]},${bbox[2]},${bbox[3]},${bbox[0]}&bounded=1`;
  const r = await fetch(u, {headers: {"Accept": "application/json"}});
  if (!r.ok) return null;
  const j = await r.json(); return j && j[0] ? [+j[0].lat, +j[0].lon] : null;
}
let geoBusy = false;
async function locateStops(m, force) {
  if (geoBusy) return; geoBusy = true;
  const missing = m.stops.filter(s => !coordOf(s));
  if (!missing.length) { geoBusy = false; return; }
  setGeoNote("Finding stops on OpenStreetMap…");
  try {
    const bbox = m.bbox || boundsOf(m.stops.map(coordOf).filter(Boolean), 0.004);
    let places = [];
    if (bbox) { try { places = await placesInBox(bbox); } catch (e) { /* fall through to address search */ } }
    for (const s of missing) {
      let best = null, bs = 0;
      places.forEach(p => { const sc = nameScore(s, p.n); if (sc > bs) { bs = sc; best = p; } });
      if (best && bs >= 0.67) { GEO.stops[s.id] = {lat: best.lat, lng: best.lng, src: "osm"}; continue; }
    }
    saveGeo(); paintMaps();
    for (const s of m.stops.filter(s => !coordOf(s))) {
      setGeoNote("Looking up " + s.n + "…");
      let c = null;
      try { c = await nominatim(s.n + ", " + s.a, bbox); await sleep(1100); if (!c && s.a) { c = await nominatim(s.a, bbox); await sleep(1100); } } catch (e) {}
      if (c) GEO.stops[s.id] = {lat: c[0], lng: c[1], src: "address"};
    }
    GEO.tried[m.id] = Date.now(); saveGeo();
    const still = m.stops.filter(s => !coordOf(s)).length;
    setGeoNote(still ? `${still} stop${still > 1 ? "s" : ""} couldn't be found. Edit the map to place ${still > 1 ? "them" : "it"} by hand.` : "");
  } catch (e) { setGeoNote("Couldn't reach OpenStreetMap. Check your connection and try again."); }
  geoBusy = false; paintMaps();
}
function setGeoNote(t) { const el = $("#geonote"); if (el) { el.textContent = t; el.classList.toggle("hide", !t); } }
function boundsOf(pts, pad) {
  if (!pts.length) return null;
  const la = pts.map(p => p[0]), ln = pts.map(p => p[1]);
  return [Math.min(...la) - pad, Math.min(...ln) - pad, Math.max(...la) + pad, Math.max(...ln) + pad];
}

/* geometry for routes: project points onto a path */
function projectOnPath(path, p) {
  const k = Math.cos(p[0] * Math.PI / 180);
  const xy = q => [q[1] * k * 111320, q[0] * 110540];
  const P = xy(p); let best = {d: Infinity, along: 0, side: "L"}, acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const A = xy(path[i]), B = xy(path[i + 1]);
    const vx = B[0] - A[0], vy = B[1] - A[1], L2 = vx * vx + vy * vy || 1e-9;
    let t = ((P[0] - A[0]) * vx + (P[1] - A[1]) * vy) / L2; t = Math.max(0, Math.min(1, t));
    const cx = A[0] + t * vx, cy = A[1] + t * vy, d = Math.hypot(P[0] - cx, P[1] - cy), len = Math.sqrt(L2);
    if (d < best.d) best = {d, along: acc + t * len, side: (vx * (P[1] - A[1]) - vy * (P[0] - A[0])) >= 0 ? "L" : "R"};
    acc += len;
  }
  return best;
}
// cheapest place to insert a new stop into an ordered list
function insertIndex(stops, c) {
  const pts = stops.map(coordOf);
  if (!c || pts.filter(Boolean).length < 1) return stops.length;
  let bi = stops.length, bc = Infinity;
  for (let i = 0; i <= stops.length; i++) {
    const a = pts[i - 1], b = pts[i];
    let cost;
    if (a && b) cost = dist(a, c) + dist(c, b) - dist(a, b);
    else if (a) cost = dist(a, c); else if (b) cost = dist(c, b); else continue;
    if (cost < bc) { bc = cost; bi = i; }
  }
  return bi;
}

/* ============================ render: line ============================ */
function renderLine(m) {
  let h = `<div class="map">`;
  let nodes = [];
  if (m.termini && m.termini.a) nodes.push({rail: m.termini.a});
  m.stops.forEach(s => nodes.push({s}));
  if (m.termini && m.termini.b) nodes.push({rail: m.termini.b});
  if (pref.rev) nodes.reverse();
  const pos = nodes.map(nd => (!nd.s || nd.s.off || !m.sides) ? null : (nd.s.side === "R" ? "R" : "L"));
  for (let i = 1; i < pos.length; i++) if (!pos[i]) pos[i] = pos[i - 1];
  const first = pos.find(Boolean) || "L";
  for (let i = 0; i < pos.length && !pos[i]; i++) pos[i] = first;
  const items = []; let hdr = null;
  nodes.forEach((nd, i) => {
    if (i > 0 && pos[i] !== pos[i - 1]) items.push({cross: true, from: pos[i - 1], to: pos[i]});
    if (m.sides && nd.s && !nd.s.off && hdr !== pos[i]) { items.push({hdr: pos[i], pos: pos[i]}); hdr = pos[i]; }
    items.push({nd, pos: pos[i]});
  });
  const row = (p, cls, mark, lab, attr = "", tag = "div") => `<${tag} class="row p${p} ${cls}" ${attr}>${p === "L" ? `<div class="mid">${mark}</div><div class="lab">${lab}</div>` : `<div class="lab">${lab}</div><div class="mid">${mark}</div>`}</${tag}>`;
  items.forEach((it, i) => {
    const cls = [i === 0 ? "first" : "", i === items.length - 1 ? "last" : ""].join(" ");
    if (it.cross) { h += `<div class="cross" data-from="${it.from}" data-to="${it.to}"><svg aria-hidden="true"></svg><span class="xt">⇆ <b>${esc(m.crossLabel || "Cross over")}</b></span></div>`; return; }
    if (it.hdr) { const sd = m.sides[it.hdr] || {}; h += row(it.pos, "sec " + cls, "", `<div class="secnm">${esc(sd.name || "")}</div><div class="secsub">${esc(sd.sub || "")}</div>`); return; }
    const nd = it.nd;
    if (nd.rail) { h += row(it.pos, cls, `<span class="rail"></span>`, `<div class="railnm">${esc(nd.rail.name)}</div>${nd.rail.sub ? `<div class="railsub">${esc(nd.rail.sub)}</div>` : ""}`); return; }
    const s = nd.s, tk = it.pos === "L" ? "R" : "L", {n, tried} = visitCount(s.id);
    let mark, stat;
    if (n > 0) { mark = `<span class="ring">${n > 1 ? `<i>${n}</i>` : ""}</span>`; stat = `<span class="st v">Visited <b>${n === 1 ? "1 time" : n + " times"}</b></span>`; }
    else if (tried) { mark = `<span class="tick ${tk} w"></span>`; stat = `<span class="st w">No entry</span>`; }
    else { mark = `<span class="tick ${tk}"></span>`; stat = `<span class="st">Unvisited</span>`; }
    const star = (pref.prio && s.prio && n === 0) ? `<div><span class="star">★ Priority</span></div>` : "";
    const offl = s.off ? `<div class="st off">${esc(m.offLabel || "Off the main route")}</div>` : "";
    h += row(it.pos, cls + (s.off ? " offarch" : ""), mark, `<div class="nm">${esc(s.n)}<span class="vb"></span>${stat}</div>${offl}${star}`, `data-venue="${esc(s.id)}"`, "button");
  });
  h += `</div>
  <div class="legend">
    <div><span class="lg"><span class="tick"></span></span>Unvisited</div>
    <div><span class="lg"><span class="ring"></span></span>Visited (number = times)</div>
    <div><span class="lg"><span class="rail"></span></span>Station / end point</div>
    <div><span class="lg dot"></span>Off the main route</div>
  </div>`;
  return h;
}

/* ============================ render: map tab ============================ */
function renderMapTab() {
  if (builder) return renderBuilder();
  if (edit) return renderEditor();
  const m = curMap(), at = activeTrip();
  let h = `<div class="ctrl">
    <button class="chip pick" data-act="pickmap"><span class="dot"></span>${esc(m.name)}<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></button>
    <span class="seg3"><button class="${pref.view === "line" ? "on" : ""}" data-act="view" data-v="line">Line</button><button class="${pref.view === "geo" ? "on" : ""}" data-act="view" data-v="geo">Map</button></span>
    <button class="chip" data-act="rev"><svg width="11" height="11" viewBox="0 0 14 14"><path d="M4 1v11M1 9l3 3 3-3M10 13V2M7 5l3-3 3 3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(pref.rev ? startOptions(m).b : startOptions(m).a)}</button>
    <button class="chip ${pref.prio ? "on" : ""}" data-act="prio">★ Priorities</button>
    <button class="chip" data-act="edit">✎ Edit</button>
  </div>`;
  if (at) h += `<button class="banner" data-trip="${esc(at.id)}"><span>🍺</span><span><b>Trip in progress</b> · ${esc(fmtDate(at.date))} · ${esc(at.mapName || "")}</span><span class="go">Open →</span></button>`;
  if (!isBase(m)) h += `<div class="msg">${m.baseId ? `Your version of ${esc((getMap(m.baseId) || {}).name || "a map")}` : "Your route"} · ${m.stops.length} stops</div>`;
  if (pref.view === "geo") {
    h += `<div id="geonote" class="msg hide"></div><div class="geowrap"><div id="lmap"></div></div>
      <footer>Map data and tiles © OpenStreetMap contributors. Stop locations come from OpenStreetMap and may be approximate.</footer>`;
  } else {
    h += renderLine(m) + `<footer>Tap any stop for details, past drinks and directions. Opening times change, so check before going.</footer>`;
  }
  return h;
}

/* Leaflet map of the current map's stops */
function paintMaps() {
  if (tab === "map" && pref.view === "geo" && !edit && !builder) drawGeo();
  if (builder) drawBuilder();
}
function leafletOK() { return typeof L !== "undefined" && L.map; }
function baseTiles(map) {
  // Simple dark-grey base map (roads and water only) with a light street-name layer on top.
  // If those tiles fail to load, fall back to standard OpenStreetMap tiles, darkened with CSS.
  const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  const attr = 'Tiles © Esri — Esri, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const base = L.tileLayer(esri + "World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {maxZoom: 16, maxNativeZoom: 16, attribution: attr}).addTo(map);
  const labels = L.tileLayer(esri + "World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {maxZoom: 16, maxNativeZoom: 16, opacity: .75}).addTo(map);
  map.setMaxZoom(18);
  let fails = 0, swapped = false;
  base.on("tileerror", () => {
    if (swapped || ++fails < 4) return; swapped = true;
    map.removeLayer(base); map.removeLayer(labels);
    map.getContainer().classList.add("osmfallback");
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  });
}
function drawGeo() {
  const el = $("#lmap"); if (!el) return;
  if (!leafletOK()) { el.innerHTML = `<div class="empty pad">The map needs an internet connection. The Line view works offline.</div>`; return; }
  if (lmap) { lmap.remove(); lmap = null; }
  const m = curMap();
  lmap = L.map(el, {zoomControl: false, attributionControl: true});
  baseTiles(lmap);
  const pts = [];
  m.stops.forEach(s => { const c = coordOf(s); if (c) pts.push({s, c}); });
  if (m.path && m.path.length > 1) L.polyline(m.path, {color: "#ffffff", weight: 2, opacity: .35, dashArray: "4 6"}).addTo(lmap);
  if (pts.length > 1) L.polyline(pts.map(p => p.c), {color: "#e8a33d", weight: 6, opacity: .9, lineJoin: "round"}).addTo(lmap);
  pts.forEach((p, i) => {
    const {n, tried} = visitCount(p.s.id);
    const mk = n > 0 ? L.circleMarker(p.c, {radius: 9, color: "#fff", weight: 4, fillColor: "#0e1116", fillOpacity: 1})
      : L.circleMarker(p.c, {radius: 7, color: "#0e1116", weight: 2, fillColor: tried ? "#ff7a59" : "#e8a33d", fillOpacity: 1});
    mk.bindTooltip(esc(p.s.n), {direction: "top", offset: [0, -8]}).on("click", () => venueSheet(p.s.id)).addTo(lmap);
  });
  if (pts.length) lmap.fitBounds(L.latLngBounds(pts.map(p => p.c)).pad(0.15), {maxZoom: 17});
  else if (m.bbox) lmap.fitBounds([[m.bbox[0], m.bbox[1]], [m.bbox[2], m.bbox[3]]]);
  else lmap.setView([51.5, -0.1], 12);
  L.control.zoom({position: "bottomright"}).addTo(lmap);
  const missing = m.stops.length - pts.length;
  if (missing) {
    const recent = GEO.tried[m.id] && Date.now() - GEO.tried[m.id] < 864e5;
    if (!recent) locateStops(m); else setGeoNote(`${missing} stop${missing > 1 ? "s aren't" : " isn't"} on the map yet. Edit the map to place ${missing > 1 ? "them" : "it"} by hand.`);
  }
}

/* ============================ map picker ============================ */
function pickerSheet() {
  const cur = pref.mapId;
  const rowFor = (m, sub) => `<button class="mrow ${sub ? "sub" : ""} ${m.id === cur ? "on" : ""}" data-pick="${esc(m.id)}">
      <span class="mn">${sub ? "↳ " : ""}${esc(m.name)}</span><span class="ms">${esc(m.city || "")}${m.city ? " · " : ""}${m.stops.length} stops</span>${m.id === cur ? `<span class="tickm">✓</span>` : ""}</button>`;
  let h = `<h2>Choose a map</h2><div class="mlist">`;
  BASE_MAPS.forEach(b => { h += rowFor(b); D.variants.filter(v => v.baseId === b.id).forEach(v => h += rowFor(v, true)); });
  const mine = D.variants.filter(v => !v.baseId);
  if (mine.length) { h += `<h3>Your routes</h3>`; mine.forEach(v => h += rowFor(v)); }
  h += `</div><div class="acts"><button class="btn pri" data-act="builder">+ Build a route on the map</button></div>`;
  openSheet(h);
}

/* ============================ editor ============================ */
function startEdit() {
  const m = curMap();
  edit = {src: m.id, isBase: isBase(m), name: isBase(m) ? "My " + m.name : m.name, stops: clone(m.stops), sides: m.sides ? clone(m.sides) : null,
    termini: m.termini ? clone(m.termini) : null, offLabel: m.offLabel, crossLabel: m.crossLabel, bbox: m.bbox || null, path: m.path || null, baseId: isBase(m) ? m.id : (m.baseId || null), near: null, nearBusy: false, err: ""};
  // bake known coordinates into the draft so moves/insertions use them
  edit.stops.forEach(s => { const c = coordOf(s); if (c && s.lat == null) { s.lat = c[0]; s.lng = c[1]; } });
  render(); toTop();
}
function renderEditor() {
  const e = edit;
  let h = `<div class="pad">
    <div class="edh"><button class="back" data-act="edcancel">← Cancel</button><span class="c">${e.isBase ? "Saved as a new version; the original stays as it is" : "Editing your version"}</span></div>
    <label class="f">Name<input id="edname" value="${esc(e.name)}"></label>
    <h3>${e.stops.length} stops · in order${e.termini && e.termini.a ? " from " + esc(e.termini.a.name) : ""}</h3>
    <div class="edlist">`;
  e.stops.forEach((s, i) => {
    const c = s.lat != null;
    h += `<div class="edrow" data-i="${i}">
      <span class="edn">${i + 1}</span>
      <div class="edt"><div class="edname">${esc(s.n)}</div><div class="c">${esc(s.a || "")}${c ? "" : ` · <b class="warnt">not on map</b>`}</div>
        ${e.sides && !s.off ? `<div class="sidepick">${["L", "R"].map(k => `<button data-act="edside" data-s="${k}" class="${s.side === k ? "on" : ""}">${esc(e.sides[k].name)}</button>`).join("")}</div>` : ""}
      </div>
      <div class="edb"><button class="ib" data-act="edup" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button class="ib" data-act="eddown" ${i === e.stops.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button><button class="ib dng" data-act="edrm" aria-label="Remove">✕</button></div>
    </div>`;
  });
  h += `</div>
    <h3>Add stops</h3>
    <button class="btn block" data-act="ednear" ${e.nearBusy ? "disabled" : ""}>${e.nearBusy ? "Searching OpenStreetMap…" : "Find bars near this route"}</button>`;
  if (e.near) {
    if (!e.near.length) h += `<div class="empty">No other bars found nearby.</div>`;
    else h += `<div class="nearlist">${e.near.map((p, j) => `<div class="nrow"><div class="edt"><div class="edname">${esc(p.n)}</div><div class="c">${esc(p.a || p.kind)} · ${p.d < 1000 ? Math.round(p.d) + " m" : (p.d / 1000).toFixed(1) + " km"} from route</div></div><button class="ib add" data-act="edadd" data-j="${j}" aria-label="Add">+</button></div>`).join("")}</div>`;
  }
  h += `<div class="drow"><input id="edcn" placeholder="Or add a bar by name" style="margin-top:0"><input id="edca" placeholder="Address or postcode (helps find it on the map)">
      <button class="btn block" style="margin-top:8px" data-act="edcustom">+ Add this bar</button></div>`;
  if (e.err) h += `<div class="err">${esc(e.err)}</div>`;
  h += `<div class="edsave"><button class="btn pri" data-act="edsave">${e.isBase ? "Save as new version" : "Save changes"}</button>${!e.isBase ? `<button class="btn" data-act="edsaveas">Save as copy</button>` : ""}</div>`;
  if (!e.isBase) h += `<div style="margin-top:22px"><button class="btn dng block" data-act="eddel">Delete this ${e.baseId ? "version" : "route"}</button></div>`;
  return h + `</div>`;
}
async function findNear() {
  const e = edit; e.nearBusy = true; e.err = ""; render();
  try {
    let pts = e.stops.filter(s => s.lat != null).map(s => [s.lat, s.lng]);
    let places;
    if (pts.length >= 1) places = await barsAlong(pts.length === 1 ? [pts[0], pts[0]] : pts, 250);
    else if (e.bbox) places = await placesInBox(e.bbox);
    else throw new Error("Add at least one stop with a location first.");
    const have = e.stops;
    places = places.filter(p => !have.some(s => s.osm === p.osm || nameScore(s, p.n) >= 0.67 || (s.lat != null && dist([s.lat, s.lng], [p.lat, p.lng]) < 12 && nameScore(s, p.n) > 0)));
    places.forEach(p => { p.d = pts.length > 1 ? projectOnPath(pts, [p.lat, p.lng]).d : pts.length ? dist(pts[0], [p.lat, p.lng]) : 0; });
    places.sort((a, b) => a.d - b.d);
    e.near = places.slice(0, 40);
  } catch (err) { e.err = err.message || "Couldn't search OpenStreetMap."; e.near = e.near || null; }
  e.nearBusy = false; if (edit === e) render();
}
function addToDraft(s) {
  const e = edit, c = s.lat != null ? [s.lat, s.lng] : null;
  const i = insertIndex(e.stops, c);
  if (e.sides && !s.side) { // take the side of the nearest neighbour
    const nb = e.stops[i - 1] || e.stops[i]; s.side = nb && nb.side ? nb.side : "L";
  }
  e.stops.splice(i, 0, s);
}
function saveEdit(asCopy) {
  const e = edit; e.name = ($("#edname") || {}).value?.trim() || e.name;
  if (!e.stops.length) { e.err = "A map needs at least one stop."; render(); return; }
  const obj = {id: (e.isBase || asCopy) ? rid(e.baseId ? "v" : "r") : e.src, baseId: e.baseId, name: e.name, city: (getMap(e.baseId) || {}).city || "",
    sides: e.sides, termini: e.termini, offLabel: e.offLabel, crossLabel: e.crossLabel, bbox: e.bbox, path: e.path, stops: e.stops, created: Date.now()};
  const ix = D.variants.findIndex(v => v.id === obj.id);
  if (ix >= 0) D.variants[ix] = obj; else D.variants.push(obj);
  save(); pref.mapId = obj.id; savePref(); edit = null; render(); toTop(); toast("Saved “" + obj.name + "”");
}

/* ============================ route builder ============================ */
function startBuilder() {
  const m = curMap();
  builder = {pts: [], width: 100, found: null, sel: {}, busy: false, err: "", name: "", split: false,
    center: m.bbox ? [(m.bbox[0] + m.bbox[2]) / 2, (m.bbox[1] + m.bbox[3]) / 2] : [51.505, -0.09]};
  closeSheet(); tab = "map"; render(); toTop();
}
function renderBuilder() {
  const b = builder;
  let h = `<div class="pad bpad">
    <div class="edh"><button class="back" data-act="bcancel">← Cancel</button><span class="c">Build a route</span></div>
    <p class="hint">${b.pts.length === 0 ? "Tap the map to set your <b>start</b>." : b.pts.length === 1 ? "Now tap your <b>end</b> point." : "Tap again to add more points along the way. The <b>last</b> point is the end."}</p>
  </div>
  <div class="geowrap tall"><div id="bmap"></div><button class="locbtn" data-act="locate" aria-label="Find me">◎</button></div>
  <div class="pad">
    <div class="bctl">
      <span class="seg3">${[60, 100, 150].map(w => `<button class="${b.width === w ? "on" : ""}" data-act="bwidth" data-w="${w}">${w} m</button>`).join("")}</span>
      <button class="chip" data-act="bundo" ${b.pts.length ? "" : "disabled"}>Undo</button>
      <button class="chip" data-act="bclear" ${b.pts.length ? "" : "disabled"}>Clear</button>
    </div>
    <div class="c" style="margin-top:6px">Width = how far either side of your path to look for bars.</div>
    <button class="btn pri block" style="margin-top:12px" data-act="bfind" ${b.pts.length < 2 || b.busy ? "disabled" : ""}>${b.busy ? "Searching OpenStreetMap…" : "Find bars along this route"}</button>`;
  if (b.err) h += `<div class="err">${esc(b.err)}</div>`;
  if (b.found) {
    const n = b.found.filter(p => b.sel[p.osm]).length;
    if (!b.found.length) h += `<div class="empty">No bars found along that path. Try a wider search or a different path.</div>`;
    else {
      h += `<h3>${b.found.length} found · ${n} selected · in walking order</h3><div class="nearlist">${b.found.map(p => `<label class="nrow"><input type="checkbox" data-osm="${esc(p.osm)}" ${b.sel[p.osm] ? "checked" : ""}><div class="edt"><div class="edname">${esc(p.n)}</div><div class="c">${esc(p.a || p.kind)}</div></div></label>`).join("")}</div>
      <label class="f">Route name<input id="bname" placeholder="e.g. Shoreditch crawl" value="${esc(b.name)}"></label>
      <label class="chk"><input type="checkbox" id="bsplit" ${b.split ? "checked" : ""}> Put bars on each side of the line (left or right of your path)</label>
      <button class="btn pri block" style="margin-top:12px" data-act="bsave" ${n ? "" : "disabled"}>Save route (${n} stops)</button>`;
    }
  }
  return h + `</div>`;
}
let bLayers = [];
function drawBuilder() {
  const el = $("#bmap"); if (!el) return;
  if (!leafletOK()) { el.innerHTML = `<div class="empty pad">The map needs an internet connection.</div>`; return; }
  const b = builder;
  if (!bmap || bmap.getContainer() !== el) {
    if (bmap) { bmap.remove(); bmap = null; }
    bmap = L.map(el, {zoomControl: false}); baseTiles(bmap);
    L.control.zoom({position: "bottomright"}).addTo(bmap);
    bmap.setView(b.view || b.center, b.zoom || 15);
    bmap.on("click", ev => { builder.pts.push([ev.latlng.lat, ev.latlng.lng]); builder.found = null; refreshBuilder(); });
    bmap.on("moveend", () => { if (builder) { builder.view = [bmap.getCenter().lat, bmap.getCenter().lng]; builder.zoom = bmap.getZoom(); } });
  }
  bLayers.forEach(l => l.remove()); bLayers = [];
  if (b.pts.length > 1) bLayers.push(L.polyline(b.pts, {color: "#ffffff", weight: 3, opacity: .8, dashArray: "6 6"}).addTo(bmap));
  b.pts.forEach((p, i) => {
    const lab = i === 0 ? "Start" : (i === b.pts.length - 1 && b.pts.length > 1 ? "End" : String(i));
    bLayers.push(L.circleMarker(p, {radius: 8, color: "#0e1116", weight: 2, fillColor: "#ffffff", fillOpacity: 1}).bindTooltip(lab, {permanent: true, direction: "right", className: "ptlab"}).addTo(bmap));
  });
  if (b.found) {
    const sel = b.found.filter(p => b.sel[p.osm]);
    if (sel.length > 1) bLayers.push(L.polyline(sel.map(p => [p.lat, p.lng]), {color: "#e8a33d", weight: 5, opacity: .85}).addTo(bmap));
    b.found.forEach(p => bLayers.push(L.circleMarker([p.lat, p.lng], {radius: 6, color: "#0e1116", weight: 2, fillColor: b.sel[p.osm] ? "#e8a33d" : "#5d6672", fillOpacity: 1}).bindTooltip(esc(p.n)).on("click", () => { builder.sel[p.osm] = !builder.sel[p.osm]; refreshBuilder(); }).addTo(bmap)));
  }
}
function refreshBuilder() {
  // re-render the controls without rebuilding the Leaflet map
  const keepName = $("#bname") ? $("#bname").value : builder.name; builder.name = keepName;
  const mapEl = $("#bmap"); const holder = mapEl ? mapEl.parentElement : null;
  if (holder) holder.remove();
  $("#app").innerHTML = renderBuilder();
  const slot = $(".geowrap.tall"); if (holder && slot) slot.replaceWith(holder);
  drawBuilder(); if (bmap) bmap.invalidateSize();
}
async function builderFind() {
  const b = builder; b.busy = true; b.err = ""; refreshBuilder();
  try {
    const found = await barsAlong(b.pts, b.width);
    found.forEach(p => { const pr = projectOnPath(b.pts, [p.lat, p.lng]); p.along = pr.along; p.side = pr.side; });
    found.sort((x, y) => x.along - y.along);
    b.found = found; b.sel = {}; found.forEach(p => b.sel[p.osm] = true);
  } catch (e) { b.err = e.message || "Couldn't search OpenStreetMap."; }
  b.busy = false; if (builder === b) refreshBuilder();
}
function builderSave() {
  const b = builder; const name = ($("#bname") || {}).value?.trim() || "My route";
  const split = $("#bsplit") ? $("#bsplit").checked : false;
  const sel = b.found.filter(p => b.sel[p.osm]);
  const stops = sel.map(p => ({id: "osm-" + p.osm.replace("/", "-"), osm: p.osm, n: p.n, a: p.a || "", lat: p.lat, lng: p.lng, side: split ? p.side : undefined, note: ""}));
  const route = {id: rid("r"), baseId: null, name, city: "", stops, path: b.pts, created: Date.now(),
    sides: split ? {L: {name: "Left of route", sub: "On your left as you walk"}, R: {name: "Right of route", sub: "On your right as you walk"}} : null,
    termini: {a: {name: "Start", sub: ""}, b: {name: "End", sub: ""}},
    bbox: boundsOf(b.pts, 0.004)};
  D.variants.push(route); save();
  pref.mapId = route.id; pref.rev = false; pref.view = "line"; savePref();
  builder = null; if (bmap) { bmap.remove(); bmap = null; } render(); toTop(); toast("Saved “" + name + "”");
}

/* ============================ trips ============================ */
function renderTrips() {
  if (tripView) { const t = D.trips.find(x => x.id === tripView); if (t) return renderTrip(t); tripView = null; }
  let h = `<div class="pad"><button class="btn pri block" data-act="newtrip">+ New trip</button>`;
  if (!D.trips.length) h += `<div class="empty">No trips logged yet.</div>`;
  sortedTrips().forEach(t => {
    const vis = (t.visits || []).filter(v => v.status !== "noentry").length;
    const m = getMap(t.mapId); const total = m ? m.stops.length : null;
    h += `<button class="tcard" data-trip="${esc(t.id)}">
      <div class="d">${esc(fmtDate(t.date))}${t.status === "active" ? `<span class="tag live">In progress</span>` : ""}</div>
      <div class="s">${esc(t.mapName || (m && m.name) || "")}${t.name ? " · " + esc(t.name) : ""}</div>
      <div class="s">${vis}${total ? " of " + total : ""} stops</div>
      <div class="who">${(t.players || []).map(p => `<span class="pp"><b>${esc(p)}</b>${esc(D.roster[p] || p)}</span>`).join("")}</div>
    </button>`;
  });
  return h + `</div>`;
}
function drinksTable(drinks) {
  if (!drinks || !drinks.length) return "";
  const groups = [];
  drinks.forEach(d => { const k = (d.by || []).join(" + "); const g = groups[groups.length - 1]; if (g && g.k === k) g.d.push(d); else groups.push({k, d: [d]}); });
  let rows = "";
  groups.forEach((g, gi) => g.d.forEach((d, i) => {
    const tasters = d.tasters ? Object.entries(d.tasters).map(([k, s]) => `${esc(k)} ${fs(s)}`).join(" · ") : "";
    const inner = i < g.d.length - 1 ? ' class="in"' : "";
    rows += `<tr>${i === 0 ? `<td class="w${gi === groups.length - 1 ? " end" : ""}" rowspan="${g.d.length}">${esc(g.k)}</td>` : ""}<td${inner}>${esc(d.name)}${(d.by || []).length > 1 ? `<div class="c">shared</div>` : ""}${tasters ? `<div class="c">Also tasted: ${tasters}</div>` : ""}${d.note ? `<div class="nt">“${esc(d.note)}”</div>` : ""}</td><td class="sc${i < g.d.length - 1 ? " in" : ""}">${fs(d.score)}</td></tr>`;
  }));
  return `<table>${rows}</table>`;
}
const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M10.5 2.5l3 3L5.5 13.5H2.5v-3z"/><path d="M9 4l3 3"/></svg>`;
const ICON_NOTE = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/><path d="M5.5 8h5M5.5 10.5h5M5.5 13h3"/></svg>`;
const hasNotes = v => !!(v.note || (v.drinks || []).some(d => d.note));
function visitBlock(v, opts = {}) {
  const sc = (v.drinks || []).filter(d => d.score != null && !isNaN(+d.score)).map(d => +d.score);
  const avg = sc.length ? `<span class="avg">${(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1)}</span>` : "";
  const icons = (hasNotes(v) ? `<button class="ib nb" data-act="notes" aria-label="Show notes">${ICON_NOTE}</button>` : "")
    + (opts.edit ? `<button class="ib" data-act="editvisit" data-v="${esc(v.v)}" data-t="${esc(opts.tid)}" aria-label="Edit stop">${ICON_EDIT}</button>` : "");
  const title = opts.title ? opts.title(avg) : `<span class="tube">${esc(stopName(v.v, v))}${avg}</span>`;
  let h = `<div class="vis"><div class="vh"><div class="tt">${title}</div>${icons}</div>`;
  if (v.note) h += `<div class="vnote">${esc(v.note)}</div>`;
  if (v.status === "noentry") h += `<div class="noentry" style="padding-bottom:8px">Tried, no entry</div>`;
  return h + drinksTable(v.drinks) + `</div>`;
}
function tripStats(t) {
  const pick = (arr, better) => { let b = null, l = []; arr.forEach(x => { if (b == null || better(x.s, b)) { b = x.s; l = []; } if (x.s === b && !l.some(y => y.key === x.key)) l.push(x); }); return {s: b, l}; };
  const players = (t.players || []).map(p => {
    const mine = [];
    (t.visits || []).forEach(v => (v.drinks || []).forEach(d => { if ((d.by || []).includes(p) && d.score != null && !isNaN(+d.score)) mine.push({s: +d.score, name: d.name, v: v.v, key: d.name + "|" + v.v}); }));
    if (!mine.length) return null;
    return {p, avg: mine.reduce((a, x) => a + x.s, 0) / mine.length, best: pick(mine, (a, b) => a > b), worst: pick(mine, (a, b) => a < b), n: mine.length};
  }).filter(Boolean);
  const stops = (t.visits || []).map(v => { const sc = (v.drinks || []).filter(d => d.score != null && !isNaN(+d.score)).map(d => +d.score);
    return sc.length ? {s: Math.round(sc.reduce((a, b) => a + b, 0) / sc.length * 10) / 10, name: stopName(v.v, v), key: v.v} : null; }).filter(Boolean);
  return {players, best: stops.length ? pick(stops, (a, b) => a > b) : null, worst: stops.length > 1 ? pick(stops, (a, b) => a < b) : null};
}
function renderTrip(t) {
  const m = getMap(t.mapId);
  let h = `<div class="pad"><button class="back" data-act="trips">← All trips</button>
    <h2>${esc(fmtDate(t.date))}${t.status === "active" ? `<span class="tag live">In progress</span>` : ""}</h2>
    <div class="c" style="font-size:14px;margin-top:4px">${esc(t.mapName || (m && m.name) || "")}${t.name ? " · " + esc(t.name) : ""}${m ? " · from " + esc(startOptions(m)[t.start || "a"]) : ""}</div>
    <div class="who">${(t.players || []).map(p => `<span class="pp"><b>${esc(p)}</b>${esc(D.roster[p] || p)}</span>`).join("")}</div>
    <div class="acts"><button class="btn pri" data-act="addstop" data-t="${esc(t.id)}">+ Log a stop</button>
      <button class="btn" data-act="togglestatus" data-t="${esc(t.id)}">${t.status === "active" ? "Finish trip" : "Reopen"}</button></div>`;
  const st = tripStats(t);
  if (st.players.length) {
    const dl = (x, cls) => `<div class="bw"><span class="ar ${cls}">${cls === "up" ? "▲" : "▼"}</span><div class="tn">${x.l.map(d => `${esc(d.name)}<span class="tv"> · ${esc(stopName(d.v))}</span>`).join("<br>")}</div><div class="ts ${cls}">${fs(x.s)}</div></div>`;
    h += `<h3>Trip summary</h3>`;
    if (st.best) h += `<div class="stopt"><div class="stt"><div class="lbl">▲ Best stop</div><div class="nmv">${st.best.l.map(x => esc(x.name)).join(" / ")}</div><div class="av">${fs(st.best.s)} avg</div></div>${st.worst ? `<div class="stt"><div class="lbl">▼ Worst stop</div><div class="nmv">${st.worst.l.map(x => esc(x.name)).join(" / ")}</div><div class="av">${fs(st.worst.s)} avg</div></div>` : ""}</div>`;
    h += `<div class="tops">${st.players.map(x => `<div class="top1"><div class="plh"><span class="pp ini"><b>${esc(x.p)}</b></span><span class="pav">Avg <b>${fs(x.avg)}</b></span></div>
      <div class="rows">${dl(x.best, "up")}${x.n > 1 ? dl(x.worst, "dn") : ""}</div></div>`).join("")}</div>`;
  }
  const total = m ? m.stops.length : null;
  h += `<h3>${(t.visits || []).filter(v => v.status !== "noentry").length}${total ? " of " + total : ""} stops · in order</h3>`;
  if (!(t.visits || []).length) h += `<div class="empty">Nothing logged yet. Tap a stop on the map, or use “Log a stop”.</div>`;
  (t.visits || []).forEach(v => h += visitBlock(v, {edit: true, tid: t.id}));
  h += `<div style="margin-top:28px"><button class="btn dng block" data-act="deltrip" data-t="${esc(t.id)}">Delete this trip</button></div>`;
  return h + `</div>`;
}

/* ============================ main render ============================ */
function render() {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  if (lmap && !(tab === "map" && pref.view === "geo" && !edit && !builder)) { lmap.remove(); lmap = null; }
  if (bmap && !builder) { bmap.remove(); bmap = null; }
  if (builder && tab === "map") { // keep the Leaflet map alive between renders
    refreshBuilder(); return;
  }
  $("#app").innerHTML = tab === "map" ? renderMapTab() : renderTrips();
  drawCrosses(); setHH();
  if (tab === "map" && pref.view === "geo" && !edit) drawGeo();
}
function toTop() { const ap = $("#app"); if (ap) ap.scrollTop = 0; try { window.scrollTo(0, 0); } catch (e) {} }
function setHH() { const hd = $("#hdr"); if (hd) document.documentElement.style.setProperty("--hh", hd.offsetHeight + "px"); }
function drawCrosses() {
  document.querySelectorAll(".cross").forEach(c => {
    const w = c.clientWidth, hh = c.clientHeight, sv = c.querySelector("svg"); if (!w || !sv) return;
    const xl = 23, xr = w - 23, x1 = c.dataset.from === "L" ? xl : xr, x2 = c.dataset.from === "L" ? xr : xl, bend = 18;
    sv.setAttribute("viewBox", `0 0 ${w} ${hh}`);
    sv.innerHTML = `<path d="M${x1} 0 V${bend} L${x2} ${hh - bend} V${hh}" fill="none" stroke="var(--line)" stroke-width="8" stroke-linejoin="round"/>`;
  });
}
window.addEventListener("resize", () => { setHH(); if (tab === "map") drawCrosses(); });

/* ============================ sheets ============================ */
function openSheet(html) { $("#sheet").innerHTML = `<div class="grab"></div><button class="sx" data-close aria-label="Close">×</button>` + html; $("#sheetWrap").classList.add("open"); $("#sheet").scrollTop = 0; }
function closeSheet() { $("#sheetWrap").classList.remove("open"); }
let toastT;
function toast(t) { const el = $("#toast"); if (!el) return; el.textContent = t; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600); }

function venueSheet(id) {
  const m = curMap(), v = m.stops.find(s => s.id === id) || stopIndex()[id]; if (!v) return;
  const {n, tried} = visitCount(id), at = activeTrip();
  const dir = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(v.n + " " + (v.a || ""));
  let h = `<h2>${esc(v.n)}</h2><div class="meta">
    ${v.a ? `<div>📍 <b>${esc(v.a)}</b>${sideLabel(m, v) ? " · " + esc(sideLabel(m, v)) : ""}</div>` : ""}
    <div>${n ? `✅ <b>Visited ${n === 1 ? "1 time" : n + " times"}</b>` : tried ? `⚠️ <b>Tried, no entry</b>` : "Not visited yet"}</div></div>`;
  if (v.note) h += `<div class="pnote">${pref.prio && v.prio && n === 0 ? "<b>★ Priority.</b> " : ""}${esc(v.note)}</div>`;
  h += `<div class="acts"><a class="btn pri" href="${dir}" target="_blank" rel="noopener">Directions</a>`;
  if (at) { const logged = (at.visits || []).some(x => x.v === id); h += `<button class="btn" data-act="logvenue" data-v="${esc(id)}" data-t="${esc(at.id)}">${logged ? "Edit today's log" : "Log this stop"}</button>`; }
  h += `</div>`;
  const past = sortedTrips().map(t => ({t, v: (t.visits || []).find(x => x.v === id)})).filter(x => x.v);
  if (past.length) {
    h += `<h3>Previous visits</h3>`;
    past.forEach(({t, v}) => { h += visitBlock(v, {title: avg => `<span class="tube">${esc(fmtDate(t.date))}${avg}</span><span class="side">${(t.players || []).map(esc).join(" · ")}</span>`}); });
  }
  openSheet(h);
}

/* ----- log a stop ----- */
let form = null;
function scoreOpts(cur) {
  const c = (cur === "" || cur == null || isNaN(+cur)) ? "" : (+cur).toFixed(1);
  let o = `<option value="" ${c === "" ? "selected" : ""}>Score</option>`;
  for (let i = 100; i >= 0; i -= 5) { const s = (i / 10).toFixed(1); o += `<option value="${s}" ${c === s ? "selected" : ""}>${s}</option>`; }
  return o;
}
function tripStops(t) {
  const m = getMap(t.mapId);
  let list = m ? stopsInOrder(m, t.start) : [];
  (t.visits || []).forEach(v => { if (!list.some(s => s.id === v.v)) list = [...list, {id: v.v, n: stopName(v.v, v)}]; });
  return list;
}
function startForm(tid, vid) {
  const t = D.trips.find(x => x.id === tid); if (!t) return;
  const ex = vid ? (t.visits || []).find(x => x.v === vid) : null;
  form = {tid, v: vid || "", status: ex?.status || "visited", note: ex?.note || "", isEdit: !!ex,
    drinks: ex ? clone(ex.drinks || []) : (t.players || []).map(p => ({by: [p], name: "", score: ""}))};
  renderForm();
}
function renderForm(err) {
  const t = D.trips.find(x => x.id === form.tid);
  const logged = new Set((t.visits || []).map(x => x.v));
  const opts = tripStops(t).map(s => `<option value="${esc(s.id)}" ${form.v === s.id ? "selected" : ""} ${logged.has(s.id) && s.id !== form.v ? "disabled" : ""}>${esc(s.n)}${logged.has(s.id) && s.id !== form.v ? " (logged)" : ""}</option>`).join("");
  let h = `<h2>${form.isEdit ? "Edit stop" : "Log a stop"}</h2><div class="c" style="font-size:13px;margin-top:4px">${esc(fmtDate(t.date))} · ${esc(t.mapName || "")}</div>
    <label class="f">Stop<select id="fv"><option value="">Choose…</option>${opts}</select></label>
    <label class="f">Outcome</label><div class="seg2">
      <button data-fst="visited" class="${form.status === "visited" ? "on" : ""}">Visited</button>
      <button data-fst="noentry" class="${form.status === "noentry" ? "on" : ""}">No entry</button></div>`;
  if (form.status === "visited") {
    h += `<label class="f">Drinks</label>`;
    form.drinks.forEach((d, i) => {
      h += `<div class="drow" data-i="${i}"><div class="pick">${(t.players || []).map(p => `<button data-by="${esc(p)}" class="${(d.by || []).includes(p) ? "on" : ""}">${esc(p)}</button>`).join("")}</div>
        <div class="r2"><input data-k="name" placeholder="Drink" value="${esc(d.name)}"><select data-k="score">${scoreOpts(d.score)}</select></div>
        <input data-k="note" placeholder="Note (optional)" value="${esc(d.note || "")}">
        <button class="rm" data-act="rmdrink">Remove drink</button></div>`;
    });
    h += `<button class="btn block" style="margin-top:10px" data-act="adddrink">+ Add a drink</button>`;
  }
  h += `<label class="f">Notes for this stop (optional)<textarea id="fn">${esc(form.note)}</textarea></label>`;
  if (err) h += `<div class="err">${esc(err)}</div>`;
  h += `<div class="acts"><button class="btn pri" data-act="savevisit">Save</button>${form.isEdit ? `<button class="btn dng" data-act="delvisit">Remove</button>` : ""}</div>`;
  openSheet(h);
}
function readForm() {
  form.v = $("#fv").value; form.note = $("#fn").value.trim();
  document.querySelectorAll(".drow[data-i]").forEach(r => { const d = form.drinks[+r.dataset.i]; r.querySelectorAll("input,select").forEach(inp => { d[inp.dataset.k] = inp.value; }); });
}

/* ----- new trip ----- */
function nextSaturday() { const d = new Date(); const add = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add); return d.toISOString().slice(0, 10); }
let ntf = null;
function newTripSheet(err) {
  if (!ntf) ntf = {date: nextSaturday(), name: "", players: Object.keys(D.roster), mapId: curMap().id, start: pref.rev ? "b" : "a"};
  const m = getMap(ntf.mapId) || curMap(), so = startOptions(m);
  const mapOpts = allMaps().map(x => `<option value="${esc(x.id)}" ${x.id === m.id ? "selected" : ""}>${esc((x.baseId ? "↳ " : "") + x.name)}</option>`).join("");
  let h = `<h2>New trip</h2>
    <label class="f">Date<input type="date" id="nd" class="dt" value="${esc(ntf.date)}"></label>
    <label class="f">Name (optional)<input id="nn" placeholder="e.g. Round two" value="${esc(ntf.name)}"></label>
    <label class="f">Map<select id="nm">${mapOpts}</select></label>
    <label class="f">Starting from</label><div class="seg2">${["a", "b"].map(k => `<button data-ns="${k}" class="${ntf.start === k ? "on" : ""}">${esc(so[k])}</button>`).join("")}</div>
    <label class="f">Players</label><div class="pick" style="margin-top:6px">${Object.keys(D.roster).map(p => `<button data-np="${esc(p)}" class="${ntf.players.includes(p) ? "on" : ""}">${esc(p)} · ${esc(D.roster[p])}</button>`).join("")}</div>
    <div class="drow"><input id="npn" placeholder="New player's full name" style="margin-top:0">
      <button class="btn block" style="margin-top:8px" data-act="addplayer">+ Add player</button></div>`;
  if (err) h += `<div class="err">${esc(err)}</div>`;
  h += `<div class="acts"><button class="btn pri" data-act="createtrip">Start trip</button></div>`;
  openSheet(h);
}
const readNtf = () => { ntf.date = $("#nd").value; ntf.name = $("#nn").value; ntf.mapId = $("#nm").value; };

/* ----- settings: export / import ----- */
function settingsSheet(msg) {
  let h = `<h2>Your data</h2>
    <p class="hint">Trips and maps are saved in this browser on this phone only. Export a backup now and then, or to move your data to another device. To combine trips with a friend, they export and you import.</p>
    <div class="acts"><button class="btn pri" data-act="export">Export backup</button><button class="btn" data-act="copyexport">Copy as text</button></div>
    <label class="f">Import a backup<input type="file" id="impfile" accept=".json,application/json"></label>
    <p class="c" style="margin-top:6px">Importing adds trips, players and maps from the file. Anything with the same ID is replaced by the file's copy.</p>`;
  if (msg) h += `<div class="msg" style="margin:12px 0 0">${esc(msg)}</div>`;
  h += `<h3>About</h3><p class="c">Bar locations and searches use OpenStreetMap (© OpenStreetMap contributors).</p>`;
  openSheet(h);
}
function exportJSON() { return JSON.stringify({app: "beer-mile-line", exported: new Date().toISOString(), data: D, geo: GEO.stops}, null, 1); }
function importJSON(txt) {
  const j = JSON.parse(txt); const d = j.data || j;
  if (!d || !Array.isArray(d.trips)) throw new Error("That file isn't a Beer Mile backup.");
  Object.assign(D.roster, d.roster || {});
  (d.trips || []).forEach(t => { const i = D.trips.findIndex(x => x.id === t.id); if (i >= 0) D.trips[i] = t; else D.trips.push(t); });
  (d.variants || []).forEach(v => { const i = D.variants.findIndex(x => x.id === v.id); if (i >= 0) D.variants[i] = v; else D.variants.push(v); });
  if (j.geo) { Object.assign(GEO.stops, j.geo); saveGeo(); }
  save(); return (d.trips || []).length;
}

/* ============================ events ============================ */
document.addEventListener("change", e => {
  if (e.target.id === "nm") { readNtf(); newTripSheet(); return; }
  if (e.target.id === "impfile") {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const n = importJSON(r.result); render(); settingsSheet(`Imported ${n} trip${n === 1 ? "" : "s"}.`); } catch (err) { settingsSheet(err.message || "Couldn't read that file."); } };
    r.readAsText(f); return;
  }
  if (builder && e.target.dataset.osm) { builder.sel[e.target.dataset.osm] = e.target.checked; builder.name = $("#bname") ? $("#bname").value : builder.name; builder.split = $("#bsplit") ? $("#bsplit").checked : builder.split; refreshBuilder(); }
});
document.addEventListener("click", async e => {
  const el = e.target.closest("[data-tab],[data-act],[data-venue],[data-trip],[data-close],[data-fst],[data-by],[data-np],[data-ns],[data-pick]");
  if (!el || el.disabled) return;
  if (el.hasAttribute("data-close")) { closeSheet(); return; }
  if (el.dataset.tab) { if (builder && el.dataset.tab !== "map") { builder = null; } tab = el.dataset.tab; tripView = null; render(); toTop(); return; }
  if (el.dataset.venue) { venueSheet(el.dataset.venue); return; }
  if (el.dataset.trip) { tab = "trips"; tripView = el.dataset.trip; edit = null; builder = null; render(); toTop(); return; }
  if (el.dataset.pick) { pref.mapId = el.dataset.pick; pref.rev = false; savePref(); closeSheet(); render(); toTop(); prefetchGeo(); return; }
  if (el.dataset.fst) { readForm(); form.status = el.dataset.fst; renderForm(); return; }
  if (el.dataset.by) { readForm(); const d = form.drinks[+el.closest(".drow").dataset.i]; const p = el.dataset.by; d.by = d.by || []; d.by = d.by.includes(p) ? d.by.filter(x => x !== p) : [...d.by, p]; renderForm(); return; }
  if (el.dataset.ns) { readNtf(); ntf.start = el.dataset.ns; newTripSheet(); return; }
  if (el.dataset.np) { readNtf(); const p = el.dataset.np; ntf.players = ntf.players.includes(p) ? ntf.players.filter(x => x !== p) : [...ntf.players, p]; newTripSheet(); return; }
  const a = el.dataset.act;
  switch (a) {
    case "settings": settingsSheet(); return;
    case "export": {
      const blob = new Blob([exportJSON()], {type: "application/json"});
      const name = "beer-mile-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      try {
        const file = new File([blob], name, {type: "application/json"});
        if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: "Beer Mile backup"}); return; }
      } catch (err) { if (err && err.name === "AbortError") return; }
      const u = URL.createObjectURL(blob), lnk = document.createElement("a"); lnk.href = u; lnk.download = name; document.body.appendChild(lnk); lnk.click(); lnk.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return;
    }
    case "copyexport": try { await navigator.clipboard.writeText(exportJSON()); toast("Backup copied"); } catch (err) { toast("Couldn't copy on this browser"); } return;
    case "pickmap": pickerSheet(); return;
    case "view": pref.view = el.dataset.v; savePref(); render(); return;
    case "rev": pref.rev = !pref.rev; savePref(); render(); return;
    case "prio": pref.prio = !pref.prio; savePref(); render(); return;
    case "edit": startEdit(); return;
    case "builder": startBuilder(); return;
    case "trips": tripView = null; render(); toTop(); return;
    case "notes": { const b = el.closest(".vis"); b.classList.toggle("shownotes"); return; }
    /* editor */
    case "edcancel": edit = null; render(); toTop(); return;
    case "edup": case "eddown": case "edrm": case "edside": {
      edit.name = $("#edname").value; const i = +el.closest(".edrow").dataset.i, s = edit.stops;
      if (a === "edup" && i > 0) [s[i - 1], s[i]] = [s[i], s[i - 1]];
      if (a === "eddown" && i < s.length - 1) [s[i + 1], s[i]] = [s[i], s[i + 1]];
      if (a === "edrm") s.splice(i, 1);
      if (a === "edside") s[i].side = el.dataset.s;
      const y = $("#app").scrollTop; render(); $("#app").scrollTop = y; return;
    }
    case "ednear": edit.name = $("#edname").value; findNear(); return;
    case "edadd": {
      edit.name = $("#edname").value; const p = edit.near[+el.dataset.j]; edit.near.splice(+el.dataset.j, 1);
      addToDraft({id: "osm-" + p.osm.replace("/", "-"), osm: p.osm, n: p.n, a: p.a || "", lat: p.lat, lng: p.lng, note: ""});
      const y = $("#app").scrollTop; render(); $("#app").scrollTop = y; toast("Added " + p.n); return;
    }
    case "edcustom": {
      edit.name = $("#edname").value; const n = $("#edcn").value.trim(), ad = $("#edca").value.trim();
      if (!n) { edit.err = "Type the bar's name first."; render(); return; }
      edit.err = ""; const s = {id: rid("c"), n: titleCase(n), a: ad, note: ""};
      try { const c = await nominatim(n + (ad ? ", " + ad : ""), null) || (ad ? await nominatim(ad, null) : null); if (c) { s.lat = c[0]; s.lng = c[1]; } } catch (err) {}
      addToDraft(s); render(); toast(s.lat != null ? "Added " + s.n : "Added " + s.n + " (not found on the map)"); return;
    }
    case "edsave": saveEdit(false); return;
    case "edsaveas": saveEdit(true); return;
    case "eddel": {
      if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.textContent = "Tap again to delete"; return; }
      D.variants = D.variants.filter(v => v.id !== edit.src); save();
      pref.mapId = edit.baseId || "bermondsey"; savePref(); edit = null; render(); toTop(); return;
    }
    /* builder */
    case "bcancel": builder = null; render(); toTop(); return;
    case "bwidth": builder.width = +el.dataset.w; builder.found = null; refreshBuilder(); return;
    case "bundo": builder.pts.pop(); builder.found = null; refreshBuilder(); return;
    case "bclear": builder.pts = []; builder.found = null; refreshBuilder(); return;
    case "bfind": builderFind(); return;
    case "bsave": builderSave(); return;
    case "locate":
      if (!navigator.geolocation) { toast("Location isn't available"); return; }
      navigator.geolocation.getCurrentPosition(p => { if (bmap) bmap.setView([p.coords.latitude, p.coords.longitude], 16); }, () => toast("Couldn't get your location"), {enableHighAccuracy: true, timeout: 8000});
      return;
    /* trips */
    case "newtrip": ntf = null; newTripSheet(); return;
    case "addplayer": {
      readNtf(); const nm = $("#npn").value.trim().replace(/\s+/g, " ");
      if (!nm) { newTripSheet("Add the player's name."); return; }
      if (Object.values(D.roster).some(x => x.toLowerCase() === nm.toLowerCase())) { newTripSheet(`${nm} is already a player.`); return; }
      const ini = makeInitials(nm, D.roster); D.roster[ini] = nm; save(); ntf.players.push(ini); newTripSheet(); return;
    }
    case "createtrip": {
      readNtf(); ntf.name = ntf.name.trim();
      if (!ntf.date) { newTripSheet("Pick a date."); return; }
      if (!ntf.players.length) { newTripSheet("Pick at least one player."); return; }
      const m = getMap(ntf.mapId) || curMap(), id = ntf.date + "-" + Math.random().toString(36).slice(2, 6);
      D.trips.push({id, date: ntf.date, name: ntf.name, players: ntf.players, status: "active", mapId: m.id, mapName: m.name, start: ntf.start, visits: [], created: Date.now()});
      save(); pref.mapId = m.id; pref.rev = ntf.start === "b"; savePref();
      closeSheet(); tab = "trips"; tripView = id; render(); toTop(); return;
    }
    case "addstop": startForm(el.dataset.t, null); return;
    case "logvenue": case "editvisit": startForm(el.dataset.t, el.dataset.v); return;
    case "adddrink": readForm(); form.drinks.push({by: [], name: "", score: ""}); renderForm(); return;
    case "rmdrink": readForm(); form.drinks.splice(+el.closest(".drow").dataset.i, 1); renderForm(); return;
    case "savevisit": {
      readForm();
      if (!form.v) { renderForm("Choose a stop."); return; }
      const drinks = [];
      if (form.status === "visited") {
        for (const d of form.drinks) {
          if (!d.name.trim() && String(d.score).trim() === "") continue;
          if (!d.name.trim()) return renderForm("Every drink needs a name.");
          if (!d.by || !d.by.length) return renderForm(`Pick who had “${d.name}”.`);
          const sc = String(d.score).trim() === "" ? null : +d.score;
          const o = {by: d.by, name: titleCase(d.name.trim()), score: sc}; if (d.note && d.note.trim()) o.note = d.note.trim(); if (d.tasters) o.tasters = d.tasters; drinks.push(o);
        }
      }
      const t = D.trips.find(x => x.id === form.tid);
      const visit = {v: form.v, n: stopName(form.v), status: form.status, drinks}; if (form.note) visit.note = form.note;
      const idx = t.visits.findIndex(x => x.v === form.v);
      if (idx >= 0) t.visits[idx] = visit; else t.visits.push(visit);
      save(); closeSheet(); render(); return;
    }
    case "delvisit": {
      if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.textContent = "Tap again to remove"; return; }
      const t = D.trips.find(x => x.id === form.tid); t.visits = t.visits.filter(x => x.v !== form.v); save(); closeSheet(); render(); return;
    }
    case "togglestatus": { const t = D.trips.find(x => x.id === el.dataset.t); t.status = t.status === "active" ? "done" : "active"; save(); render(); return; }
    case "deltrip": {
      if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.textContent = "Tap again to delete for good"; return; }
      D.trips = D.trips.filter(x => x.id !== el.dataset.t); save(); tripView = null; render(); return;
    }
  }
});

/* tap feedback */
(function () {
  const SEL = "[data-venue],[data-trip],[data-act],[data-tab],[data-close].sx,[data-fst],[data-by],[data-np],[data-ns],[data-pick],a.btn";
  let cur = null, t0 = 0;
  const clear = () => { if (!cur) return; const el = cur; cur = null; setTimeout(() => el.classList.remove("tap"), Math.max(0, 180 - (Date.now() - t0))); };
  document.addEventListener("pointerdown", e => { const el = e.target.closest(SEL); if (!el) return; cur = el; t0 = Date.now(); el.classList.add("tap"); }, {passive: true});
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => document.addEventListener(ev, clear, {passive: true}));
  document.addEventListener("scroll", () => { if (cur) { cur.classList.remove("tap"); cur = null; } }, {capture: true, passive: true});
})();

/* boot */
/* find stop locations in the background so the Map view is ready when opened */
function prefetchGeo() {
  const m = curMap();
  if (!navigator.onLine || !m.stops.some(s => !coordOf(s))) return;
  if (GEO.tried[m.id] && Date.now() - GEO.tried[m.id] < 864e5) return;
  setTimeout(() => locateStops(m), 800);
}
render();
prefetchGeo();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
