#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "Building..."
npm run build
echo "Running runtime QA..."
npm run qa
echo "Deploying to gh-pages branch..."
TMP=$(mktemp -d)
cp -r dist/* "$TMP/"
cd "$TMP"
git init -q
git checkout -b gh-pages
git add -A
git -c user.name="NutTracker" -c user.email="dev@nuttracker.local" commit -q -m "Deploy $(date +%Y-%m-%dT%H:%M:%S)" || true
git remote add origin https://github.com/TecladoOscuro/another-app.git 2>/dev/null || true
git push -f origin gh-pages
cd /
rm -rf "$TMP"
echo "Deployed. Live at https://tecladooscuro.github.io/another-app/"
