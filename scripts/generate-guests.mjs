// Generates per-guest invitation links from data/guests-source.txt.
//
//   1. Reads names from data/guests-source.txt (one per line, blanks/`#` skipped).
//   2. Preserves slugs already present in data/guests.json so previously-sent
//      links never break when the list grows.
//   3. Mints a fresh 6-char hex slug for any new name.
//   4. Writes data/guests.json (source of truth, committed) and
//      guests-links.csv (UTF-8 with BOM so Excel renders Cyrillic).
//
// Run: npm run guests
// Configure base URL via NEXT_PUBLIC_SITE_URL env var.

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE_FILE = resolve(ROOT, "data/guests-source.txt");
const GUESTS_FILE = resolve(ROOT, "data/guests.json");
const CSV_FILE = resolve(ROOT, "guests-links.csv");

// Minimal .env loader — Next reads .env.local automatically, but raw `node`
// doesn't, so pull NEXT_PUBLIC_SITE_URL from .env.local / .env when present.
for (const file of [".env.local", ".env"]) {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^["'](.*)["']$/, "$1");
    process.env[key] = value;
  }
}

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://your-domain.vercel.app").replace(/\/+$/, "");

if (!existsSync(SOURCE_FILE)) {
  console.error(`ERROR: ${SOURCE_FILE} not found.`);
  process.exit(1);
}

// Each non-blank, non-comment line is `Name` or `Name | Date`. Date is
// shown verbatim on the page — any human-readable string works.
const entries = readFileSync(SOURCE_FILE, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("#"))
  .map((line) => {
    const [rawName, ...rest] = line.split("|");
    const name = rawName.trim();
    const date = rest.join("|").trim();
    return { name, date: date.length > 0 ? date : undefined };
  })
  .filter((e) => e.name.length > 0);

if (entries.length === 0) {
  console.error("ERROR: No names found in data/guests-source.txt.");
  process.exit(1);
}

// Existing slugs by name — keeps already-sent links stable.
const existingByName = new Map();
if (existsSync(GUESTS_FILE)) {
  try {
    const prev = JSON.parse(readFileSync(GUESTS_FILE, "utf8"));
    if (Array.isArray(prev)) {
      for (const g of prev) {
        if (g && typeof g.name === "string" && typeof g.slug === "string") {
          existingByName.set(g.name, g.slug);
        }
      }
    }
  } catch {
    // ignore — treat as empty cache
  }
}

const usedSlugs = new Set();
const guests = entries.map(({ name, date }) => {
  let slug = existingByName.get(name);
  if (!slug || usedSlugs.has(slug)) {
    do {
      slug = randomBytes(3).toString("hex");
    } while (usedSlugs.has(slug));
  }
  usedSlugs.add(slug);
  return date ? { slug, name, date } : { slug, name };
});

writeFileSync(GUESTS_FILE, JSON.stringify(guests, null, 2) + "\n", "utf8");

const csvRows = ["Name,Date,Link"];
for (const g of guests) {
  const safeName = `"${g.name.replace(/"/g, '""')}"`;
  const safeDate = g.date ? `"${g.date.replace(/"/g, '""')}"` : "";
  csvRows.push(`${safeName},${safeDate},${BASE_URL}/i/${g.slug}`);
}
// BOM so Excel decodes UTF-8 (Cyrillic) on Windows.
writeFileSync(CSV_FILE, "﻿" + csvRows.join("\r\n") + "\r\n", "utf8");

const reused = guests.filter((g) => existingByName.get(g.name) === g.slug).length;
const fresh = guests.length - reused;

console.log(`Generated ${guests.length} guests (${reused} reused, ${fresh} new).`);
console.log(`  -> ${GUESTS_FILE}`);
console.log(`  -> ${CSV_FILE}`);
if (BASE_URL.includes("your-domain")) {
  console.log("\nWARNING: Using placeholder domain. Set NEXT_PUBLIC_SITE_URL before running.");
  console.log("  e.g.   NEXT_PUBLIC_SITE_URL=https://unitel20.vercel.app npm run guests");
}
