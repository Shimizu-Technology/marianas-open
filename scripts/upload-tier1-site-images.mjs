#!/usr/bin/env node
/**
 * Upload Tier-1 downloaded assets via Admin Site Images API and update remap CSV.
 *
 * Usage:
 *   node scripts/upload-tier1-site-images.mjs \
 *     --base http://127.0.0.1:3100 \
 *     --token <CLERK_BEARER_TOKEN> \
 *     --csv /path/to/marianas-open-tier1-url-remap-sheet-2026-03-11.csv \
 *     --assets /path/to/core-download-2026-03-11 \
 *     [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, def = '') => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : def;
};
const dryRun = args.includes('--dry-run');
const base = getArg('base', process.env.API_BASE_URL || 'http://127.0.0.1:3100');
const token = getArg('token', process.env.ADMIN_BEARER_TOKEN || '');
const csvPath = getArg('csv', '');
const assetsDir = getArg('assets', '');

if (!csvPath || !assetsDir) {
  console.error('Missing --csv or --assets');
  process.exit(1);
}
if (!dryRun && !token) {
  console.error('Missing --token (or ADMIN_BEARER_TOKEN) for non-dry-run');
  process.exit(1);
}

function parseCsv(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const headers = head.split(',');
  return rows.map((line) => {
    const vals = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') q = !q;
      else if (c === ',' && !q) { vals.push(cur); cur = ''; }
      else cur += c;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (vals[i] || '').replace(/^"|"$/g, '')));
    return obj;
  });
}

function toCsv(rows) {
  const headers = ['source_url','local_file','section','target_field','new_s3_url','status','notes'];
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h] ?? '')).join(','))].join('\n') + '\n';
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
  return { ok: res.ok, status: res.status, data };
}

async function uploadOne(filePath, row) {
  const create = await jsonFetch(`${base}/api/v1/admin/site-images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: path.basename(filePath),
      alt_text: row.target_field,
      placement: row.section === 'organization' ? 'sponsor_default' : row.section === 'events' ? 'gallery' : 'hero',
      sort_order: 0,
      active: true,
      caption: `Imported from ${row.source_url}`,
    }),
  });
  if (!create.ok || !create.data?.site_image?.id) {
    throw new Error(`create failed (${create.status}): ${JSON.stringify(create.data)}`);
  }
  const id = create.data.site_image.id;

  const form = new FormData();
  form.append('image', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  const up = await fetch(`${base}/api/v1/admin/site-images/${id}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  const txt = await up.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
  if (!up.ok) throw new Error(`upload failed (${up.status}): ${JSON.stringify(data)}`);
  return data?.site_image?.image_url || '';
}

(async () => {
  const csvRaw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvRaw);
  let done = 0;
  for (const row of rows) {
    if (row.status === 'applied' || row.status === 'uploaded') continue;
    const filePath = path.join(assetsDir, row.local_file);
    if (!fs.existsSync(filePath)) {
      row.status = 'missing-local';
      row.notes = 'local file missing';
      continue;
    }
    if (dryRun) {
      row.status = 'ready-upload';
      done++;
      continue;
    }
    try {
      const url = await uploadOne(filePath, row);
      row.new_s3_url = url;
      row.status = 'uploaded';
      row.notes = 'uploaded via admin site-images API';
      done++;
      console.log(`uploaded: ${row.local_file}`);
    } catch (e) {
      row.status = 'upload-error';
      row.notes = String(e.message || e);
      console.error(`failed: ${row.local_file} -> ${row.notes}`);
    }
  }

  fs.writeFileSync(csvPath, toCsv(rows));
  console.log(`done: ${done} rows processed`);
})();
