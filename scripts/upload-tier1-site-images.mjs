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
 *     [--dry-run] \
 *     [--activate] \
 *     [--timeout-ms 45000]
 */

import fs from 'node:fs';
import path from 'node:path';

const [major] = process.versions.node.split('.').map(Number);
if ((major || 0) < 18) {
  console.error(`Node.js 18+ is required (detected ${process.version}). Native fetch/FormData are used by this script.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name, def = '') => {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0) return def;
  const val = args[idx + 1];
  if (val === undefined || String(val).startsWith('--')) return def;
  return val;
};
const dryRun = args.includes('--dry-run');
const baseRaw = getArg('base', process.env.API_BASE_URL || 'http://127.0.0.1:3100');
const base = String(baseRaw).replace(/\/+$/, '');
const token = getArg('token', process.env.ADMIN_BEARER_TOKEN || '');
const csvPath = getArg('csv', '');
const assetsDir = getArg('assets', '');
const timeoutMs = Number(getArg('timeout-ms', process.env.UPLOADER_TIMEOUT_MS || '45000')) || 45000;
const activate = args.includes('--activate');

if (!csvPath || !assetsDir) {
  console.error('Missing --csv or --assets');
  process.exit(1);
}
if (!fs.existsSync(csvPath) || !fs.lstatSync(csvPath).isFile()) {
  console.error(`CSV not found or not a file: ${csvPath}`);
  process.exit(1);
}
if (!fs.existsSync(assetsDir) || !fs.lstatSync(assetsDir).isDirectory()) {
  console.error(`Assets directory not found or not a directory: ${assetsDir}`);
  process.exit(1);
}
if (!dryRun && !token) {
  console.error('Missing --token (or ADMIN_BEARER_TOKEN) for non-dry-run');
  process.exit(1);
}

function splitCsvLine(line) {
  const vals = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (c === ',' && !q) {
      vals.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  vals.push(cur);
  return vals;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const vals = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] || '';
    });
    rows.push(obj);
  }
  return rows;
}

function toCsv(rows) {
  const fixedHeaders = ['source_url', 'local_file', 'section', 'target_field', 'new_s3_url', 'status', 'notes'];
  const extraHeaders = [...new Set(rows.flatMap((r) => Object.keys(r || {})))].filter((h) => !fixedHeaders.includes(h));
  const headers = [...fixedHeaders, ...extraHeaders];
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h] ?? '')).join(','))].join('\n') + '\n';
}

async function fetchWithTimeout(url, opts = {}, ms = timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function jsonFetch(url, opts = {}) {
  const res = await fetchWithTimeout(url, opts, timeoutMs);
  const txt = await res.text();
  let data = null;
  try {
    data = JSON.parse(txt);
  } catch {
    data = { raw: txt };
  }
  return { ok: res.ok, status: res.status, data };
}

function inferMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    }[ext] || 'application/octet-stream'
  );
}

function placementForSection(section, sourceUrl) {
  const map = {
    organization: 'sponsor_default',
    events: 'gallery',
    hero: 'hero',
  };
  const placement = map[String(section || '').trim()];
  if (!placement) {
    throw new Error(`unknown section ${JSON.stringify(section)} for row ${sourceUrl || '(unknown source)'}`);
  }
  return placement;
}

async function cleanupCreatedSiteImage(id) {
  try {
    const res = await fetchWithTimeout(`${base}/api/v1/admin/site-images/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, timeoutMs);
    if (!res.ok) {
      const txt = await res.text();
      console.error(`cleanup DELETE failed for id=${id}: status=${res.status} body=${txt.slice(0, 300)}`);
    }
  } catch (cleanupErr) {
    console.error(`cleanup DELETE failed for id=${id}: ${cleanupErr?.message || cleanupErr}`);
  }
}

async function uploadOne(filePath, row) {
  const placement = placementForSection(row.section, row.source_url);
  const create = await jsonFetch(`${base}/api/v1/admin/site-images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: path.basename(filePath),
      alt_text: row.target_field,
      placement,
      sort_order: 0,
      active: activate,
      caption: `Imported from ${row.source_url}`,
    }),
  });

  if (!create.ok || !create.data?.site_image?.id) {
    throw new Error(`create failed (${create.status}): ${JSON.stringify(create.data)}`);
  }
  const id = create.data.site_image.id;

  const form = new FormData();
  const mime = inferMime(filePath);
  form.append('image', new Blob([fs.readFileSync(filePath)], { type: mime }), path.basename(filePath));

  const up = await fetchWithTimeout(`${base}/api/v1/admin/site-images/${id}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }, timeoutMs);

  const txt = await up.text();
  let data = null;
  try {
    data = JSON.parse(txt);
  } catch {
    data = { raw: txt };
  }

  if (!up.ok) {
    await cleanupCreatedSiteImage(id);
    throw new Error(`upload failed (${up.status}): ${JSON.stringify(data)}`);
  }

  const imageUrl = data?.site_image?.image_url;
  if (!imageUrl) {
    await cleanupCreatedSiteImage(id);
    throw new Error(`upload succeeded but image_url missing in response: ${JSON.stringify(data)}`);
  }

  return imageUrl;
}

(async () => {
  const csvRaw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(csvRaw);
  let attempted = 0;
  let uploaded = 0;
  let readyUpload = 0;
  let missingLocal = 0;
  let uploadError = 0;

  for (const row of rows) {
    if (row.status === 'applied' || row.status === 'uploaded') continue;
    attempted++;

    const localFile = String(row.local_file || '').trim();
    if (!localFile) {
      row.status = 'missing-local';
      row.notes = 'local_file column is empty';
      missingLocal++;
      continue;
    }

    const assetsRoot = path.resolve(assetsDir);
    const filePath = path.resolve(assetsRoot, localFile);
    const safeRoot = assetsRoot.endsWith(path.sep) ? assetsRoot : `${assetsRoot}${path.sep}`;
    if (!filePath.startsWith(safeRoot)) {
      row.status = 'missing-local';
      row.notes = 'local_file path escapes assets root';
      missingLocal++;
      continue;
    }

    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
      row.status = 'missing-local';
      row.notes = 'local file missing';
      missingLocal++;
      continue;
    }

    if (dryRun) {
      row.status = 'ready-upload';
      readyUpload++;
      continue;
    }

    try {
      const url = await uploadOne(filePath, row);
      row.new_s3_url = url;
      row.status = 'uploaded';
      row.notes = 'uploaded via admin site-images API';
      uploaded++;
      console.log(`uploaded: ${row.local_file}`);
    } catch (e) {
      row.status = 'upload-error';
      row.notes = String(e.message || e);
      uploadError++;
      console.error(`failed: ${row.local_file} -> ${row.notes}`);
    }
  }

  fs.writeFileSync(csvPath, toCsv(rows));
  console.log(`[summary] attempted=${attempted} uploaded=${uploaded} ready_upload=${readyUpload} missing_local=${missingLocal} upload_error=${uploadError}`);
})();
