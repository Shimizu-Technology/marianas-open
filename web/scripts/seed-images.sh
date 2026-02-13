#!/bin/bash
# Seed script: optimize JPG images to WebP format
# Requires: npm install sharp (already a dev dependency)
# Usage: bash scripts/seed-images.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Converting JPG images to WebP..."
node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dir = 'public/images';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
if (files.length === 0) { console.log('No JPG files to convert.'); process.exit(0); }
Promise.all(files.map(async f => {
  const inp = path.join(dir, f);
  const out = path.join(dir, f.replace('.jpg', '.webp'));
  await sharp(inp).resize(1200, null, {withoutEnlargement: true}).webp({quality: 75}).toFile(out);
  const stat = fs.statSync(out);
  console.log(f + ' -> ' + Math.round(stat.size/1024) + 'KB');
  fs.unlinkSync(inp);
}));
"
echo "Done!"
