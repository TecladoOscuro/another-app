// Enriquece el dataset PH con datos del CSV público de Jamesthesailor
// y de la API JSON-LD de FreeOnes para tags (las top 100 restantes que no estén en el CSV).

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'public', 'ph-stars.json');
const CSV_URL = 'https://raw.githubusercontent.com/Jamesthesailor/pornStarsDatabase/master/psDatabase.csv';
const TMP = '/tmp/psdb.csv';
const OUT = path.join(__dirname, '..', 'public', 'ph-stars-enriched.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function parseMeasurements(m) {
  // Formato: "34A-26-34" o "34A-26-34-?" o "?-26-34" etc.
  if (!m) return null;
  const cleaned = m.replace(/[?-]/g, '').trim();
  if (!cleaned) return null;
  // Quitar la copa (letra(s)) del primer número
  const parts = m.split('-').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const bust = parts[0] ? parts[0].replace(/[A-Z]+/gi, '').trim() : null;
  const waist = parts[1] || null;
  const hip = parts[2] || null;
  const cup = parts[0] ? (parts[0].match(/[A-Z]+/i)?.[0] || null) : null;
  return {
    bust: bust && /^\d+$/.test(bust) ? bust : null,
    waist: waist && /^\d+$/.test(waist) ? `${waist} cm` : null,
    hip: hip && /^\d+$/.test(hip) ? `${hip} cm` : null,
    cup,
  };
}

function parseHeight(h) {
  if (!h) return null;
  // "5-8" → "173 cm"
  if (/^\d+-\d+$/.test(h.trim())) {
    const [ft, inch] = h.split('-').map(Number);
    const cm = Math.round(ft * 30.48 + inch * 2.54);
    return `${cm} cm`;
  }
  const m = h.match(/(\d+)\s*cm/i);
  if (m) return `${m[1]} cm`;
  return null;
}

function parseWeight(w) {
  if (!w) return null;
  const m = String(w).match(/(\d+)\s*kg/i);
  if (m) return `${m[1]} kg`;
  const n = parseInt(w, 10);
  if (n > 30 && n < 200) return `${n} kg`;
  return null;
}

(async () => {
  console.log('Descargando CSV público...');
  let csvText;
  try {
    csvText = await fetch(CSV_URL);
    fs.writeFileSync(TMP, csvText);
  } catch (e) {
    console.log('No se pudo descargar, usando cache local');
    csvText = fs.readFileSync(TMP, 'utf8');
  }
  console.log('CSV size:', csvText.length);

  // Parse CSV
  const lines = csvText.split('\n').filter((l) => l.trim());
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((l) => {
    const cols = l.split(',');
    const row = {};
    header.forEach((h, i) => (row[h.trim()] = (cols[i] || '').trim()));
    return row;
  });
  console.log('CSV rows:', rows.length);

  const csvIndex = new Map();
  for (const r of rows) {
    if (!r.Name) continue;
    csvIndex.set(r.Name.toLowerCase(), r);
  }

  // Cargar PH stars
  const stars = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  console.log('PH stars:', stars.length);

  const enriched = [];
  let fromCsv = 0;
  for (const s of stars) {
    const csv = csvIndex.get(s.n.toLowerCase());
    if (!csv) continue;
    const m = parseMeasurements(csv['Measurements']);
    const h = parseHeight(csv['Height']);
    const w = parseWeight(csv['Weight']);
    if (!m && !h && !w && !csv['Hair color']) continue;
    fromCsv++;
    enriched.push({
      n: s.n,
      r: s.r,
      b: csv['Date of Birth'] || s.b,
      hair: csv['Hair color'] || null,
      bust: m?.bust || null,
      cup: m?.cup || null,
      waist: m?.waist || null,
      hip: m?.hip || null,
      height: h,
      weight: w,
    });
  }
  console.log('Enriched from CSV:', fromCsv);
  fs.writeFileSync(OUT, JSON.stringify(enriched));
  const stat = fs.statSync(OUT);
  console.log('Wrote', OUT, stat.size, 'bytes');
})();
