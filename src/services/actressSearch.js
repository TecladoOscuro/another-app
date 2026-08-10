// Servicio de búsqueda de actrices que combina:
// 1. Dataset estático completo PH (8864 actrices con rank + birthDate)
// 2. Dataset enriquecido con datos de FreeOnes (top 150 con ethnicity, hair, height, weight, etc.)
// 3. Lista local de actrices guardadas (IndexedDB)
// 4. Scraping vía CORS proxy (cuando funciona)

import { getActressByName, listActresses, upsertActress } from '../db.js';
import { fetchActress } from './scraper.js';

let starsIndex = null;
let starsList = null;
let enrichedIndex = null;
let loadPromise = null;

export function loadStarsDataset() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    fetch('./ph-stars.json').then((r) => r.ok ? r.json() : []),
    fetch('./ph-stars-enriched.json').then((r) => r.ok ? r.json() : []).catch(() => []),
  ])
    .then(([base, enriched]) => {
      starsList = base;
      starsIndex = new Map(base.map((s) => [s.n.toLowerCase(), s]));
      enrichedIndex = new Map(enriched.map((s) => [s.n.toLowerCase(), s]));
      return { base, enriched };
    })
    .catch((err) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('No se pudo cargar el dataset de actrices PH:', err.message);
      }
      starsList = [];
      starsIndex = new Map();
      enrichedIndex = new Map();
      return { base: [], enriched: [] };
    });
  return loadPromise;
}

export function isStarsLoaded() {
  return starsList !== null;
}

export function getStarsCount() {
  return starsList ? starsList.length : 0;
}

export function searchStars(query, limit = 30) {
  if (!starsList) return [];
  const q = query.toLowerCase().trim();
  if (!q) {
    return starsList.slice(0, limit);
  }
  const results = [];
  for (const s of starsList) {
    const name = s.n.toLowerCase();
    if (name === q) {
      results.unshift(s);
      if (results.length >= limit) break;
    } else if (name.startsWith(q)) {
      results.push(s);
      if (results.length >= limit) break;
    } else if (name.includes(q)) {
      results.push(s);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function getStar(name) {
  if (!starsIndex) return null;
  const base = starsIndex.get(name.toLowerCase());
  if (!base) return null;
  const enriched = enrichedIndex?.get(name.toLowerCase());
  if (!enriched) return base;
  // Merge enriched on top of base, preserving identity fields
  return { ...base, ...enriched, n: base.n, r: base.r || enriched.r, b: base.b || enriched.b, slug: base.slug || enriched.slug };
}

export async function findOrCreateActress(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  const local = await getActressByName(trimmed);
  if (local && hasRealData(local)) return local;

  const star = getStar(trimmed);
  if (star) {
    const slug = `slug:${slugify(trimmed)}`;
    const enriched = {
      id: slug,
      name: star.n,
      source: 'ph-dataset',
      rank: star.r || null,
      born: star.b || null,
      ethnicity: star.ethnicity || null,
      hair: star.hair || null,
      eyes: star.eyes || null,
      cup: star.cup || null,
      bust: star.bust || null,
      waist: star.waist || null,
      hip: star.hip || null,
      height: parseHeightCm(star.height) || null,
      weight: parseWeightKg(star.weight) || null,
      tags: star.tags || [],
      url: `https://www.pornhub.com/pornstar/${slugify(trimmed)}`,
      fetchedAt: Date.now(),
    };
    if (!local) {
      await upsertActress(enriched);
    } else if (!hasRealData(local)) {
      await upsertActress({ ...local, ...enriched });
    }
    return enriched;
  }

  if (local && local.notFound) return local;
  const scraped = await fetchActress(trimmed);
  return scraped;
}

function parseHeightCm(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)\s*cm/i);
  if (m) return `${m[1]} cm`;
  const n = parseInt(s, 10);
  if (n > 50 && n < 250) return `${n} cm`;
  return null;
}

function parseWeightKg(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)\s*kg/i);
  if (m) return `${m[1]} kg`;
  const n = parseInt(s, 10);
  if (n > 30 && n < 200) return `${n} kg`;
  return null;
}

function hasRealData(a) {
  if (!a) return false;
  return a.rank || a.videosCount || a.subscribers || a.born || a.height || a.weight || a.relation || a.ethnicity || a.measurements || a.avatar || a.tags?.length;
}

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
