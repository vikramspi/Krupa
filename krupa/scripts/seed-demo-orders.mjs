#!/usr/bin/env node
/**
 * Fills the database with believable demo orders, so the admin dashboard and the
 * partner portal have something to show before real traffic arrives.
 *
 *   node scripts/seed-demo-orders.mjs --dry-run      # print what it would write
 *   node scripts/seed-demo-orders.mjs                # write it
 *   node scripts/seed-demo-orders.mjs --undo         # remove every row it wrote
 *
 * Everything it creates hangs off demo customers whose email ends in
 * DEMO_DOMAIN, a reserved .test domain that can never receive mail and can
 * never collide with a real sign-up. `--undo` deletes the orders belonging to
 * those customers and then the customers, which is why orders are never
 * attributed to a real one: nothing it writes is entangled with real data.
 *
 * Prices, discounts, pickup fees and delivery windows are computed with the
 * same rules as src/lib/pricing.ts and src/lib/schedule.ts, so the totals add
 * up when someone opens an order rather than merely looking plausible in a list.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Reserved TLD: never resolves, never deliverable, unmistakably not a real customer. */
const DEMO_DOMAIN = "@demo.krupa.test";
/** The business's first order. Everything is spread evenly from here to today. */
const HISTORY_START = new Date("2024-07-01T00:00:00Z");
/**
 * What the admin's "Revenue · all time" card should land near. Order volume is
 * scaled to hit it rather than fixed, because the figure is what's being asked
 * for — the count is just how you get there.
 */
const TARGET_REVENUE = 800_000;
/**
 * Orders deliberately left mid-flight per partner, on top of the history, so
 * "Awaiting partner" and "In progress" have something to show. None are
 * delivered, so they do not move the all-time revenue figure.
 */
const LIVE_PER_VENDOR = 6;
const LIVE_WEIGHTS = [
  ["placed", 20],
  ["vendor_assigned", 12],
  ["pickup_scheduled", 16],
  ["picked_up", 14],
  ["processing", 20],
  ["ready_for_delivery", 10],
  ["out_for_delivery", 8],
];

/** <1 bunches orders towards today; 1 would spread them evenly. */
const GROWTH_SKEW = 0.5;
/** Opening guess at orders per partner; a second pass scales it to the target. */
const PER_VENDOR_MIN = 100;
const PER_VENDOR_MAX = 150;
const CUSTOMER_COUNT = 24;

// Mirrors src/lib/pricing.ts.
const FREE_PICKUP_THRESHOLD = 499;
const DISCOUNT_THRESHOLD = 999;
const DISCOUNT_RATE = 0.1;
const DISCOUNT_CAP = 150;

const SLOTS = [
  { id: "slot-0900", label: "9:00 – 11:00 AM", endHour: 11 },
  { id: "slot-1100", label: "11:00 AM – 1:00 PM", endHour: 13 },
  { id: "slot-1400", label: "2:00 – 4:00 PM", endHour: 16 },
  { id: "slot-1700", label: "5:00 – 7:00 PM", endHour: 19 },
];

/**
 * Where an order ends up.
 *
 * Anything older than a month is finished, one way or the other — laundry does
 * not sit "out for delivery" since last autumn. Only recent orders are still
 * moving, which is both truthful and what makes the live boards readable.
 */
// Turnaround is 24–48 hours, so an order more than a few days old has landed
// one way or another. Only the last few days are genuinely still in motion.
const SETTLED_AFTER_DAYS = 4;
const SETTLED_WEIGHTS = [
  ["delivered", 94],
  ["cancelled", 6],
];
const RECENT_WEIGHTS = [
  ["delivered", 62],
  ["cancelled", 5],
  ["out_for_delivery", 6],
  ["ready_for_delivery", 6],
  ["processing", 8],
  ["picked_up", 5],
  ["pickup_scheduled", 4],
  ["vendor_assigned", 2],
  ["placed", 2],
];

const FIRST_NAMES = "Aarav Aditi Ananya Arjun Diya Ishaan Kavya Meera Neha Nikhil Priya Rahul Riya Rohan Sanya Siddharth Tanvi Varun Vedika Yash Aisha Dev Kiran Pooja".split(" ");
const LAST_NAMES = "Sharma Patel Iyer Nair Desai Joshi Kulkarni Mehta Reddy Shah Rao Bhat Gupta Verma Menon Pillai".split(" ");
const STREETS = ["Hill Road", "Linking Road", "SV Road", "LBS Marg", "Turner Road", "Carter Road", "Station Road", "Market Lane", "Gokhale Road", "Church Avenue"];
const LANDMARKS = ["near the metro station", "opposite the bank", "above the chemist", "next to the bakery", "behind the temple", null, null];
const NOTES = ["Please ring the bell twice.", "Leave with the watchman if I'm out.", "Handle the silk carefully.", "Call before arriving.", null, null, null, null];

// ── Deterministic randomness ────────────────────────────────────────────────
// Seeded so a dry run and the real run produce the same orders, and so a repeat
// run is recognisably the same shape rather than a fresh pile of noise.
let seed = 20261016;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (list) => list[Math.floor(rnd() * list.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));

function weighted(pairs) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let roll = rnd() * total;
  for (const [value, w] of pairs) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

// ── Project data ────────────────────────────────────────────────────────────

/** Reads the catalogue straight from the TS source, so prices never drift. */
function readCatalog() {
  const src = readFileSync(join(ROOT, "src/data/catalog.ts"), "utf8");
  const block = src.slice(src.indexOf("export const catalogItems"));
  const items = [];
  for (const m of block.matchAll(
    /\{ id: "([a-z0-9-]+)", name: "([^"]+)", category: "([a-z]+)", offeringId: "([a-z-]+)", basePrice: (\d+)/g,
  )) {
    items.push({ id: m[1], name: m[2], category: m[3], offeringId: m[4], basePrice: Number(m[5]) });
  }
  if (items.length === 0) throw new Error("no catalog items parsed from src/data/catalog.ts");
  return items;
}

function readAreas() {
  const src = readFileSync(join(ROOT, "src/data/areas.ts"), "utf8");
  const areas = new Map();
  for (const m of src.matchAll(/\{ id: "([a-z0-9-]+)", name: "([^"]+)",[^}]*?pincodes: \[([^\]]*)\]/g)) {
    const pincodes = [...m[3].matchAll(/"(\d{6})"/g)].map((p) => p[1]);
    areas.set(m[1], { id: m[1], name: m[2], pincodes });
  }
  return areas;
}

function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

// ── Supabase ────────────────────────────────────────────────────────────────

const env = { ...readEnv(join(ROOT, ".env.local")), ...process.env };
const URL_BASE = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(path, init = {}) {
  const response = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...HEADERS, ...init.headers } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// ── Order construction ──────────────────────────────────────────────────────

const priceForVendor = (item, multiplier) => Math.max(5, Math.round((item.basePrice * multiplier) / 5) * 5);

function priceOrder(lines, pickupFee) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const fee = subtotal >= FREE_PICKUP_THRESHOLD ? 0 : itemCount > 0 ? pickupFee : 0;
  const discount = subtotal >= DISCOUNT_THRESHOLD ? Math.min(DISCOUNT_CAP, Math.round(subtotal * DISCOUNT_RATE)) : 0;
  return { subtotal, pickupFee: fee, discount, total: subtotal + fee - discount };
}

/** The timeline up to `status`, so the tracking page renders a coherent story. */
function buildHistory(status, placedAt, vendorName, slotLabel) {
  const SEQUENCE = ["placed", "vendor_assigned", "pickup_scheduled", "picked_up", "processing", "ready_for_delivery", "out_for_delivery", "delivered"];
  const notes = {
    placed: `Sent to ${vendorName} for confirmation`,
    vendor_assigned: `${vendorName} accepted your order`,
    pickup_scheduled: slotLabel,
    picked_up: "Collected and on the way to the facility",
    processing: "Being cleaned and finished",
    ready_for_delivery: "Cleaned, checked and packed",
    out_for_delivery: "On the way back to you",
    delivered: "Delivered",
  };
  const history = [];
  let at = placedAt.getTime();
  if (status === "cancelled") {
    history.push({ status: "placed", at: new Date(at).toISOString(), note: notes.placed });
    at += between(20, 300) * 60_000;
    history.push({ status: "cancelled", at: new Date(at).toISOString(), note: `${vendorName} couldn't take this order` });
    return history;
  }
  for (const step of SEQUENCE) {
    history.push({ status: step, at: new Date(at).toISOString(), note: notes[step] });
    if (step === status) break;
    at += between(30, 600) * 60_000;
  }
  return history;
}

function buildOrders({ vendors, customers, catalog, areas }, scale = 1) {
  const now = Date.now();
  const orders = [];

  for (const vendor of vendors) {
    const multiplier = Number(vendor.price_multiplier) || 1;
    const offered = new Set(vendor.offered_service_ids ?? []);
    const sellable = catalog.filter((c) => offered.has(c.offeringId));
    const vendorAreas = (vendor.coverage_areas ?? []).map((id) => areas.get(id)).filter(Boolean);
    if (sellable.length === 0 || vendorAreas.length === 0) {
      console.warn(`  ${vendor.name}: no sellable items or no mapped areas — skipped`);
      continue;
    }

    const count = Math.max(1, Math.round(between(PER_VENDOR_MIN, PER_VENDOR_MAX) * scale));
    // One order per partner is anchored to the opening date, so the history
    // visibly starts where it is meant to instead of wherever chance allowed.
    let firstOrder = true;
    const makeOrder = (opts = {}) => {
      const customer = pick(customers);
      const area = pick(vendorAreas);
      const slot = pick(SLOTS);

      const lineCount = between(1, 5);
      const chosen = new Map();
      for (let n = 0; n < lineCount; n++) {
        const item = pick(sellable);
        chosen.set(item.id, (chosen.get(item.id) ?? 0) + between(1, 4));
      }
      const lines = [...chosen].map(([id, quantity]) => {
        const item = catalog.find((c) => c.id === id);
        return { itemId: item.id, name: item.name, category: item.category, unitPrice: priceForVendor(item, multiplier), quantity };
      });
      const pricing = priceOrder(lines, vendor.pickup_fee);

      // Skewed towards now rather than spread flat: a business that grew over
      // these two years, which is both likelier and what keeps the live boards
      // worth looking at — a flat spread puts ~3% of orders in the last month
      // and leaves "Awaiting partner" and "In progress" all but empty.
      // `live` orders are placed inside the settle window on purpose; the rest
      // are skewed towards now rather than spread flat, as a business that grew
      // over these two years.
      const placedAt = opts.live
        ? new Date(now - rnd() * SETTLED_AFTER_DAYS * 86_400_000)
        : new Date(HISTORY_START.getTime() + (firstOrder ? 0 : rnd() ** GROWTH_SKEW) * (now - HISTORY_START.getTime()));
      firstOrder = false;
      const pickupAt = new Date(placedAt.getTime() + between(12, 48) * 3_600_000);
      const ageDays = (now - placedAt.getTime()) / 86_400_000;
      const status = opts.live
        ? weighted(LIVE_WEIGHTS)
        : weighted(ageDays > SETTLED_AFTER_DAYS ? SETTLED_WEIGHTS : RECENT_WEIGHTS);
      const history = buildHistory(status, placedAt, vendor.name, slot.label);
      const turnaround = vendor.turnaround_estimate ?? {};
      const deliveryFrom = new Date(pickupAt.getTime() + (turnaround.min_hours ?? 24) * 3_600_000);
      const deliveryTo = new Date(pickupAt.getTime() + (turnaround.max_hours ?? 48) * 3_600_000);

      return {
        customer_id: customer.id,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        items: lines,
        subtotal: pricing.subtotal,
        pickup_fee: pricing.pickupFee,
        discount: pricing.discount,
        total: pricing.total,
        pickup_date: pickupAt.toISOString().slice(0, 10),
        pickup_slot: slot.id,
        address: {
          line1: `${between(1, 60)}${pick(["", "A", "B"])}, ${pick(["Shanti", "Sunrise", "Green Acres", "Sea View", "Palm", "Rose"])} ${pick(["Apartments", "Heights", "Residency", "Towers"])}`,
          line2: pick(STREETS),
          landmark: pick(LANDMARKS) ?? undefined,
          areaId: area.id,
          areaName: area.name,
          pincode: area.pincodes[0] ?? "400001",
          city: "Mumbai",
        },
        status,
        contact_email: customer.email,
        // Explicitly null rather than omitted: PostgREST rejects a bulk insert
        // whose objects don't all carry the same keys ("All object keys must
        // match"), and JSON.stringify drops an undefined one.
        instructions: pick(NOTES),
        estimated_delivery_from: deliveryFrom.toISOString(),
        estimated_delivery_to: deliveryTo.toISOString(),
        status_history: history,
        created_at: placedAt.toISOString(),
        updated_at: history[history.length - 1].at,
      };
    };

    for (let i = 0; i < count; i++) orders.push(makeOrder());
    // Delivered revenue is what the all-time figure sums, so these cost it
    // nothing: without them the live boards sit near-empty, because ~₹8L spread
    // over two years is about one order a day and only a few are ever in motion.
    for (let i = 0; i < LIVE_PER_VENDOR; i++) orders.push(makeOrder({ live: true }));
  }
  return orders;
}

// ── Commands ────────────────────────────────────────────────────────────────

async function demoCustomers() {
  return rest(`customers?select=id,email,phone&email=like.*${encodeURIComponent(DEMO_DOMAIN)}`);
}

async function undo() {
  const existing = await demoCustomers();
  if (existing.length === 0) {
    console.log("Nothing to undo — no demo customers found.");
    return;
  }
  const ids = existing.map((c) => c.id);
  const before = await rest(`orders?select=id&customer_id=in.(${ids.join(",")})`);
  console.log(`Removing ${before.length} demo orders and ${ids.length} demo customers…`);
  // Orders first: customer_id is ON DELETE SET NULL, so dropping customers
  // first would strand the orders with nothing left to identify them by.
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    await rest(`orders?customer_id=in.(${batch.join(",")})`, { method: "DELETE" });
  }
  await rest(`customers?id=in.(${ids.join(",")})`, { method: "DELETE" });
  const leftover = await rest(`orders?select=id&customer_id=in.(${ids.join(",")})`);
  console.log(`Done. ${leftover.length} demo orders remain.`);
}

async function ensureCustomers(dryRun) {
  const existing = await demoCustomers();
  if (existing.length >= CUSTOMER_COUNT) {
    console.log(`Reusing ${existing.length} demo customers.`);
    return existing;
  }
  const rows = [];
  for (let i = existing.length; i < CUSTOMER_COUNT; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    rows.push({
      name,
      // 90000xxxxx is outside the ranges Indian carriers issue, so these can
      // never collide with a real customer's number on the unique index.
      phone: `90000${String(10000 + i).slice(-5)}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${i}${DEMO_DOMAIN}`,
    });
  }
  if (dryRun) {
    console.log(`Would create ${rows.length} demo customers (e.g. ${rows[0].name} <${rows[0].email}>).`);
    return [...existing, ...rows.map((r, i) => ({ ...r, id: `dry-${i}` }))];
  }
  const created = await rest("customers?select=id,email,phone", { method: "POST", body: JSON.stringify(rows), headers: { Prefer: "return=representation" } });
  console.log(`Created ${created.length} demo customers.`);
  return [...existing, ...created];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (process.argv.includes("--undo")) return undo();

  const vendors = await rest("vendors?select=id,name,price_multiplier,pickup_fee,offered_service_ids,coverage_areas,turnaround_estimate&order=name");
  if (vendors.length === 0) throw new Error("no vendors in the database");

  const catalog = readCatalog();
  const areas = readAreas();
  console.log(`${new URL(URL_BASE).host}: ${vendors.length} vendors, ${catalog.length} catalogue items, ${areas.size} areas\n`);

  const customers = await ensureCustomers(dryRun);

  // Delivered revenue is what the admin's all-time card sums, so aim at that
  // directly: build once to learn the average order, then rebuild scaled to the
  // target. Two passes, not a loop — one correction lands within a few percent
  // and a loop would only chase its own rounding.
  const deliveredValue = (list) => list.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);
  const firstPass = buildOrders({ vendors, customers, catalog, areas });
  const firstRevenue = deliveredValue(firstPass);
  const scale = firstRevenue > 0 ? TARGET_REVENUE / firstRevenue : 1;
  seed = 20261016; // rewind, so the scaled pass is a clean rebuild not a continuation
  const orders = scale === 1 ? firstPass : buildOrders({ vendors, customers, catalog, areas }, scale);
  console.log(`Targeting ₹${TARGET_REVENUE.toLocaleString("en-IN")} delivered revenue (scaled ×${scale.toFixed(2)}).\n`);

  const byVendor = new Map();
  const byStatus = new Map();
  let revenue = 0;
  for (const o of orders) {
    byVendor.set(o.vendor_name, (byVendor.get(o.vendor_name) ?? 0) + 1);
    byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
    if (o.status !== "cancelled") revenue += o.total;
  }
  console.log("Orders per partner:");
  for (const [name, n] of [...byVendor].sort()) console.log(`  ${String(n).padStart(4)}  ${name}`);
  console.log("\nStatus spread:");
  for (const [s, n] of [...byStatus].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${s}`);
  const delivered = deliveredValue(orders);
  const dates = orders.map((o) => o.created_at).sort();
  console.log(`\nTotal: ${orders.length} orders, ₹${revenue.toLocaleString("en-IN")} of non-cancelled value.`);
  console.log(`Admin "Revenue · all time": ₹${delivered.toLocaleString("en-IN")} across ${orders.filter((o) => o.status === "delivered").length} delivered orders.`);
  console.log(`Dates: ${dates[0].slice(0, 10)} → ${dates[dates.length - 1].slice(0, 10)}.`);

  if (dryRun) {
    console.log("\n--dry-run: nothing was written.");
    return;
  }

  for (let i = 0; i < orders.length; i += 200) {
    const batch = orders.slice(i, i + 200);
    await rest("orders", { method: "POST", body: JSON.stringify(batch), headers: { Prefer: "return=minimal" } });
    process.stdout.write(`\r  inserted ${Math.min(i + batch.length, orders.length)}/${orders.length}`);
  }
  console.log(`\n\nDone. Undo any time with:  node scripts/seed-demo-orders.mjs --undo`);
}

await main();
