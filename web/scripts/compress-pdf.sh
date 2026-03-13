#!/usr/bin/env bash
# compress-pdf.sh — Reduce the SJJIF rulebook PDF size before S3 upload.
#
# Usage:
#   bash web/scripts/compress-pdf.sh
#
# Output:
#   web/public/files/2018-sjjif-rulebook-compressed.pdf
#
# Requirements (pick one):
#   • Ghostscript  →  brew install ghostscript   (macOS)
#                     apt install ghostscript     (Debian/Ubuntu)
#   • qpdf         →  brew install qpdf
#
# After running this script, upload the compressed file to S3 and update
# VITE_RULEBOOK_PDF_URL in your production environment.  See .env.example.

set -euo pipefail

SRC="web/public/files/2018-sjjif-rulebook.pdf"
OUT="web/public/files/2018-sjjif-rulebook-compressed.pdf"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: Source PDF not found at $SRC"
  echo "Run this script from the repository root."
  exit 1
fi

echo "Input:  $SRC  ($(du -sh "$SRC" | cut -f1))"

if command -v gs &>/dev/null; then
  echo "Using Ghostscript…"
  gs -q -dNOPAUSE -dBATCH -dSAFER \
     -sDEVICE=pdfwrite \
     -dCompatibilityLevel=1.5 \
     -dPDFSETTINGS=/ebook \
     -dEmbedAllFonts=true \
     -dSubsetFonts=true \
     -dColorImageDownsampleType=/Bicubic \
     -dColorImageResolution=150 \
     -dGrayImageDownsampleType=/Bicubic \
     -dGrayImageResolution=150 \
     -dMonoImageDownsampleType=/Bicubic \
     -dMonoImageResolution=150 \
     -sOutputFile="$OUT" \
     "$SRC"
elif command -v qpdf &>/dev/null; then
  echo "Using qpdf (structural optimisation only — no image resampling)…"
  qpdf --linearize --compress-streams=y "$SRC" "$OUT"
else
  echo "ERROR: Neither Ghostscript (gs) nor qpdf is installed."
  echo "  macOS:  brew install ghostscript"
  echo "  Linux:  sudo apt install ghostscript"
  exit 1
fi

echo "Output: $OUT  ($(du -sh "$OUT" | cut -f1))"
echo "Done. Upload $OUT to S3 and set VITE_RULEBOOK_PDF_URL."
