#!/usr/bin/env bash
# =============================================================================
#  site/build.sh — bundle the "Gerador de Carimbos" static site into site/dist/
# -----------------------------------------------------------------------------
#  The engine (../src) is dependency-free TypeScript, so the whole generator
#  runs in the browser — dist/ is fully static (no backend). Deployed to
#  GitHub Pages by .github/workflows/pages.yml on every push to main; serve it
#  locally with any static file server.
#
#  1. test-exemplos.ts: every example in the site gallery must render clean;
#  2. bundle app.ts (engine included) for the browser;
#  3. copy index.html + the fonts (SIL OFL — licenses travel with them).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"
command -v bun >/dev/null || { echo "ERRO: bun não encontrado (https://bun.sh)"; exit 1; }

echo "· testando os exemplos da galeria…"
bun run test-exemplos.ts

echo "· empacotando app.js…"
bun build app.ts --outfile dist/app.js --minify --target browser >/dev/null

echo "· copiando página e fontes…"
cp index.html dist/
mkdir -p dist/fonts
cp fonts/* dist/fonts/

echo "ok: $(pwd)/dist"
