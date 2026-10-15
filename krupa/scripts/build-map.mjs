#!/usr/bin/env node
/**
 * Builds src/data/mumbaiMap.ts — the coverage map's outlines.
 *
 *   node scripts/build-map.mjs [--offline]
 *
 * The map is one flat pixel space shared by every shape and by the pins the
 * component drops with `projectToMap`. Two things feed it:
 *
 *  - scripts/greater-mumbai.frozen.json — the Greater Mumbai coastline and the
 *    24 BMC ward outlines, already projected by the original generator (which
 *    was never committed). They are copied through verbatim, so re-running this
 *    build cannot nudge a ward that is already on the page. The build refuses
 *    to run if PROJECTION below stops matching the one they were made with.
 *
 *  - The OpenStreetMap API, live, for the regions in REGIONS — today Thane and
 *    Navi Mumbai, where partners collect outside the BMC boundary. `--offline`
 *    reuses the cached responses in scripts/.osm-cache instead of refetching.
 *
 * To put a neighbourhood on the map, add its id to AREA_IDS_BY_REGION below and
 * re-run; editing the generated file directly will be overwritten.
 *
 * Boundary data © OpenStreetMap contributors, ODbL.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, "scripts", ".osm-cache");
const FROZEN = join(ROOT, "scripts", "greater-mumbai.frozen.json");
const OUT = join(ROOT, "src", "data", "mumbaiMap.ts");

/**
 * The window onto the coast. `minLng` and `maxLat` are the projection's origin
 * and so are load-bearing: every frozen path was measured from them, and moving
 * either would silently shift all 24 wards. `maxLng` and `minLat` only decide
 * where the canvas is cropped, so they are safe to extend — `maxLng` was pushed
 * east of the BMC boundary to make room for Thane and Navi Mumbai.
 */
const PROJECTION = {
  minLat: 18.8921596,
  maxLat: 19.2694771,
  minLng: 72.7732289,
  maxLng: 73.03,
  lngSqueeze: 0.945058,
  scale: 2029.8057,
};

/** Regions fetched from OSM, drawn beside the BMC wards. */
const REGIONS = [
  { name: "Thane", osmRelation: 7120000, areaIds: ["thane"] },
  { name: "Navi Mumbai", osmRelation: 13180880, areaIds: ["airoli", "vashi"] },
];

/** Ids from src/data/areas.ts that fall inside each BMC ward. */
const AREA_IDS_BY_WARD = {
  "A Ward": ["colaba", "fort"],
  "B Ward": [],
  "C Ward": [],
  "D Ward": ["tardeo"],
  "E Ward": [],
  "F/N Ward": ["dadar", "matunga", "sion"],
  "F/S Ward": [],
  "G/N Ward": ["prabhadevi", "mahim"],
  "G/S Ward": ["lower-parel", "worli"],
  "H/E Ward": ["bandra-east"],
  "H/W Ward": ["bandra-west", "khar-west", "santacruz-west"],
  "K/E Ward": ["andheri-east"],
  "K/W Ward": ["juhu", "andheri-west", "versova"],
  "L Ward": ["kurla"],
  "M/E Ward": [],
  "M/W Ward": ["chembur"],
  "N Ward": ["ghatkopar"],
  "P/N Ward": ["malad-west"],
  "P/S Ward": ["goregaon-west"],
  "R/C Ward": ["borivali-west", "gorai"],
  "R/N Ward": [],
  "R/S Ward": ["kandivali-west"],
  "S Ward": ["powai", "vikhroli"],
  "T Ward": ["mulund"],
};

/**
 * How hard the fetched rings are thinned, in pixels. Picked so the new regions
 * land at the same vertex density as the frozen wards (roughly 50–130 points
 * each) rather than dragging a few thousand survey points into the bundle.
 */
const SIMPLIFY_TOLERANCE = 0.45;

// ── OpenStreetMap ───────────────────────────────────────────────────────────

/** The relation plus every way and node it needs, from the main OSM API. */
async function fetchRelation(id, offline) {
  const cached = join(CACHE_DIR, `relation-${id}.json`);
  if (offline) return JSON.parse(await readFile(cached, "utf8"));

  const url = `https://api.openstreetmap.org/api/0.6/relation/${id}/full.json`;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    try {
      const response = await fetch(url, { headers: { "User-Agent": "krupa-map-builder/1.0" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cached, body);
      return JSON.parse(body);
    } catch (error) {
      lastError = error;
      console.warn(`  relation ${id}: ${error.message}, retrying`);
    }
  }
  throw new Error(`relation ${id} could not be fetched: ${lastError.message}`);
}

/**
 * OSM stores a boundary as unordered way fragments, so the outer ways have to
 * be walked end-to-end to recover the ring. Returns [lat, lng] pairs.
 */
function assembleOuterRing(payload, label) {
  const nodes = new Map();
  const ways = new Map();
  let relation;
  for (const element of payload.elements) {
    if (element.type === "node") nodes.set(element.id, [element.lat, element.lon]);
    else if (element.type === "way") ways.set(element.id, element.nodes);
    else if (element.type === "relation") relation = element;
  }

  const pending = relation.members
    .filter((m) => m.type === "way" && (m.role === "outer" || m.role === ""))
    .map((m) => [...ways.get(m.ref)]);

  const rings = [];
  while (pending.length > 0) {
    let ring = pending.shift();
    for (let joined = true; joined && ring[0] !== ring.at(-1); ) {
      joined = false;
      for (let i = 0; i < pending.length; i++) {
        const next = pending[i];
        if (next[0] === ring.at(-1)) ring = ring.concat(next.slice(1));
        else if (next.at(-1) === ring.at(-1)) ring = ring.concat(next.slice(0, -1).reverse());
        else if (next.at(-1) === ring[0]) ring = next.slice(0, -1).concat(ring);
        else if (next[0] === ring[0]) ring = next.slice(1).reverse().concat(ring);
        else continue;
        pending.splice(i, 1);
        joined = true;
        break;
      }
    }
    if (ring[0] !== ring.at(-1)) throw new Error(`${label}: outer ways do not close into a ring`);
    rings.push(ring);
  }

  // A municipal corporation is one body; anything else means the data moved.
  if (rings.length !== 1) throw new Error(`${label}: expected 1 outer ring, got ${rings.length}`);
  return rings[0].slice(0, -1).map((id) => nodes.get(id));
}

// ── Geometry ────────────────────────────────────────────────────────────────

/**
 * Sutherland–Hodgman against the map window. The projection is affine and
 * axis-aligned, so cropping in lat/lng is the same as cropping in pixels — and
 * every region here runs past at least one edge of the canvas.
 */
function clipToBounds(ring, { minLat, maxLat, minLng, maxLng }) {
  const edges = [
    [(p) => p[1] >= minLng, (a, b) => lerpByLng(a, b, minLng)],
    [(p) => p[1] <= maxLng, (a, b) => lerpByLng(a, b, maxLng)],
    [(p) => p[0] >= minLat, (a, b) => lerpByLat(a, b, minLat)],
    [(p) => p[0] <= maxLat, (a, b) => lerpByLat(a, b, maxLat)],
  ];
  let output = ring;
  for (const [inside, intersect] of edges) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      const currentIn = inside(current);
      if (currentIn !== inside(previous)) output.push(intersect(previous, current));
      if (currentIn) output.push(current);
    }
    if (output.length === 0) return [];
  }
  return output;
}

function lerpByLng(a, b, lng) {
  const t = (lng - a[1]) / (b[1] - a[1]);
  return [a[0] + (b[0] - a[0]) * t, lng];
}

function lerpByLat(a, b, lat) {
  const t = (lat - a[0]) / (b[0] - a[0]);
  return [lat, a[1] + (b[1] - a[1]) * t];
}

function project([lat, lng], { minLng, maxLat, lngSqueeze, scale }) {
  return [(lng - minLng) * lngSqueeze * scale, (maxLat - lat) * scale];
}

/** Perpendicular distance from `p` to the segment a→b. */
function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker over an open polyline. */
function simplifyLine(points, tolerance) {
  if (points.length < 3) return points;
  let farthest = 0;
  let maxDistance = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToSegment(points[i], points[0], points.at(-1));
    if (distance > maxDistance) {
      maxDistance = distance;
      farthest = i;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points.at(-1)];
  return [
    ...simplifyLine(points.slice(0, farthest + 1), tolerance),
    ...simplifyLine(points.slice(farthest), tolerance).slice(1),
  ];
}

/**
 * Douglas–Peucker over a closed ring. A ring has no ends to anchor on, so it is
 * cut at its two most distant points and each half is thinned as a polyline.
 */
function simplifyRing(ring, tolerance) {
  if (ring.length < 4) return ring;
  let opposite = 0;
  let maxDistance = 0;
  for (let i = 1; i < ring.length; i++) {
    const distance = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      opposite = i;
    }
  }
  const front = simplifyLine(ring.slice(0, opposite + 1), tolerance);
  const back = simplifyLine([...ring.slice(opposite), ring[0]], tolerance);
  return [...front.slice(0, -1), ...back.slice(0, -1)];
}

const round = (n) => Number(n.toFixed(1));

/** An SVG path, rounded to the same 0.1px grid the frozen paths sit on. */
function toPathData(ring) {
  const points = [];
  for (const [x, y] of ring) {
    const point = [round(x), round(y)];
    const last = points.at(-1);
    if (!last || last[0] !== point[0] || last[1] !== point[1]) points.push(point);
  }
  if (points.length > 1) {
    const [first, last] = [points[0], points.at(-1)];
    if (first[0] === last[0] && first[1] === last[1]) points.pop();
  }
  return `M${points.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}

// ── Emit ────────────────────────────────────────────────────────────────────

function renderFile({ landmass, wards, bounds, width, height }) {
  const quote = (ids) => `[${ids.map((id) => `"${id}"`).join(",")}]`;
  return `// GENERATED by scripts/build-map.mjs — do not edit by hand.
// Run \`node scripts/build-map.mjs\` to rebuild; to put a neighbourhood on the
// map, add its id to that script's AREA_IDS_BY_WARD or REGIONS and re-run.
// Boundary data © OpenStreetMap contributors, ODbL. Simplified for display and
// cropped to the bounding box below.

/** Bounding box the paths below were projected from. */
export const MAP_BOUNDS = {
  minLat: ${bounds.minLat},
  maxLat: ${bounds.maxLat},
  minLng: ${bounds.minLng},
  maxLng: ${bounds.maxLng},
} as const;

export const MAP_WIDTH = ${width};
export const MAP_HEIGHT = ${height};

const LNG_SQUEEZE = ${PROJECTION.lngSqueeze};
const SCALE = ${PROJECTION.scale};

/**
 * Same projection the outline was built with, so a pin placed from lat/lng
 * lands where it should on the coastline.
 */
export function projectToMap(lat: number, lng: number): { x: number; y: number } {
  return {
    x: (lng - MAP_BOUNDS.minLng) * LNG_SQUEEZE * SCALE,
    y: (MAP_BOUNDS.maxLat - lat) * SCALE,
  };
}

/** Greater Mumbai, Thane and Navi Mumbai: every shore the wards are drawn on. */
export const MUMBAI_LANDMASS: readonly string[] = [
${landmass.map((d) => `  "${d}",`).join("\n")}
];

/** A district on the map, with the service areas that fall inside it. */
export interface MumbaiWard {
  name: string;
  /** Filled path in the same projected space as the landmass. */
  d: string;
  /** Ids from src/data/areas.ts whose coordinates sit inside this district. */
  areaIds: readonly string[];
}

/** Greater Mumbai's 24 municipal wards, plus the neighbouring cities we reach. */
export const MUMBAI_WARDS: readonly MumbaiWard[] = [
${wards.map((w) => `  { name: "${w.name}", areaIds: ${quote(w.areaIds)}, d: "${w.d}" },`).join("\n")}
];
`;
}

// ── Build ───────────────────────────────────────────────────────────────────

async function main() {
  const offline = process.argv.includes("--offline");
  const frozen = JSON.parse(await readFile(FROZEN, "utf8"));

  // The frozen paths were measured from minLng/maxLat and cannot be redrawn.
  // Changing either here would move all 24 wards without any visible edit.
  for (const key of ["minLat", "maxLat", "minLng", "lngSqueeze", "scale"]) {
    if (frozen.projection[key] !== PROJECTION[key]) {
      throw new Error(
        `PROJECTION.${key} is ${PROJECTION[key]} but the frozen Greater Mumbai paths ` +
          `were built with ${frozen.projection[key]}. Reprojecting them needs the ` +
          `original OSM ward data, so this build refuses to shift them.`,
      );
    }
  }

  const known = new Set(frozen.wards.map((w) => w.name));
  for (const name of Object.keys(AREA_IDS_BY_WARD)) {
    if (!known.has(name)) throw new Error(`AREA_IDS_BY_WARD has an unknown ward: ${name}`);
  }

  const landmass = [...frozen.landmass];
  const wards = frozen.wards.map((w) => ({ name: w.name, areaIds: AREA_IDS_BY_WARD[w.name] ?? [], d: w.d }));

  for (const region of REGIONS) {
    console.log(`${region.name}: relation ${region.osmRelation}`);
    const payload = await fetchRelation(region.osmRelation, offline);
    const ring = assembleOuterRing(payload, region.name);
    const clipped = clipToBounds(ring, PROJECTION);
    if (clipped.length === 0) throw new Error(`${region.name}: falls entirely outside MAP_BOUNDS`);
    const projected = clipped.map((p) => project(p, PROJECTION));
    const simplified = simplifyRing(projected, SIMPLIFY_TOLERANCE);
    const d = toPathData(simplified);
    console.log(`  ${ring.length} points → ${clipped.length} inside bounds → ${(d.match(/[ML]/g) ?? []).length} drawn`);
    landmass.push(d);
    wards.push({ name: region.name, areaIds: region.areaIds, d });
  }

  const width = round((PROJECTION.maxLng - PROJECTION.minLng) * PROJECTION.lngSqueeze * PROJECTION.scale);
  const height = round((PROJECTION.maxLat - PROJECTION.minLat) * PROJECTION.scale);
  const bounds = {
    minLat: PROJECTION.minLat,
    maxLat: PROJECTION.maxLat,
    minLng: PROJECTION.minLng,
    maxLng: PROJECTION.maxLng,
  };

  await writeFile(OUT, renderFile({ landmass, wards, bounds, width, height }));
  console.log(`\nwrote ${OUT} — ${width} × ${height}, ${wards.length} districts`);
}

await main();
