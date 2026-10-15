#!/usr/bin/env node
/**
 * Checks the live database has every column the three sites read.
 *
 *   node scripts/check-db-schema.mjs [path/to/.env.local]
 *
 * Why this exists: commit 0b1f219 shipped queries for `vendor_code`,
 * `contact_email` and `coverage_area_names` together with the migration that
 * creates them — but the migration was never run against Supabase. Every
 * vendor query started failing with "column does not exist", which the sites
 * reported to visitors as "we couldn't reach our servers". The customer site
 * showed no partners and could not take a booking, and the admin vendor list
 * was empty, for days, because nothing compared the schema to the code.
 *
 * Run it after deploying anything that adds a migration. Exits non-zero on
 * drift, so it works as a deploy gate.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The columns the three sites actually select, by table. This is a hand-kept
 * list rather than a parse of the queries: it is short, it rarely changes, and
 * a wrong entry fails loudly here instead of silently in production.
 */
const REQUIRED = {
  vendors: [
    // Added by 0008 — the three that were missing.
    "vendor_code", "contact_email", "coverage_area_names",
    "id", "name", "contact_phone", "coverage_areas", "offered_service_ids",
    "turnaround_estimate", "rating", "is_active", "price_multiplier",
    "pickup_fee", "latitude", "longitude", "accepts_same_day", "created_at",
  ],
  orders: [
    "id", "order_code", "customer_id", "vendor_id", "vendor_name", "items",
    "subtotal", "pickup_fee", "discount", "total", "pickup_date", "pickup_slot",
    "address", "status", "contact_email", "instructions",
    "estimated_delivery_from", "estimated_delivery_to", "status_history",
    "created_at", "updated_at",
  ],
  customers: ["id", "phone", "name", "email", "password_hash", "email_verified_at", "google_id", "created_at"],
  addresses: ["id", "customer_id", "label", "line1", "line2", "landmark", "area_id", "area_name", "pincode", "city"],
  vendor_users: [
    "id", "vendor_id", "name", "phone", "email", "password_hash",
    "invite_token_hash", "invite_expires_at", "reset_token_hash",
    "reset_expires_at", "is_active", "last_login_at",
  ],
  vendor_reviews: ["id", "order_id", "vendor_id", "customer_id", "rating", "comment", "is_published", "created_at"],
  activity_log: ["id", "created_at", "actor_type", "actor_id", "actor_label", "action", "entity_type", "entity_id", "summary", "details"],
  otp_codes: ["id", "phone", "code_hash", "expires_at", "attempts", "audience", "created_at"],
};

function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const envPath = process.argv[2] ?? join(ROOT, ".env.local");
const env = { ...readEnv(envPath), ...process.env };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(`Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (looked in ${envPath} and the environment).`);
  process.exit(2);
}

// PostgREST publishes the live schema it will accept queries against, which is
// exactly what the sites talk to — closer to the truth than reading the migrations.
const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
if (!response.ok) {
  console.error(`Could not read the schema: HTTP ${response.status}`);
  process.exit(2);
}
const live = Object.fromEntries(
  Object.entries((await response.json()).definitions ?? {}).map(([table, def]) => [table, new Set(Object.keys(def.properties))]),
);

let drifted = 0;
for (const [table, columns] of Object.entries(REQUIRED)) {
  if (!live[table]) {
    console.error(`✗ ${table} — table is missing`);
    drifted++;
    continue;
  }
  const missing = columns.filter((column) => !live[table].has(column));
  if (missing.length === 0) continue;
  console.error(`✗ ${table} — missing ${missing.join(", ")}`);
  drifted++;
}

console.log(`\n${new URL(url).host}: checked ${Object.keys(REQUIRED).length} tables, ${drifted} with drift.`);
if (drifted > 0) {
  console.error("The database is behind the code. Apply the unapplied files in supabase/migrations.");
  process.exit(1);
}
console.log("Schema matches what the sites query.");
