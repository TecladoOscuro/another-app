// Servicio de búsqueda de actrices que combina:
// 1. Lista local de actrices guardadas (IndexedDB)
// 2. Dataset estático de Pornhub (8864 actrices con rank + birthDate)
// 3. Scraping vía CORS proxy (cuando funciona)

import { getActressByName, listActresses, upsertActress } from '../db.js';
import { fetchActress } from './scraper.js';

let starsIndex = null;
let starsList = null;
let loadPromise = null;

export function loadStarsDataset() {
  if (loadPromise) return loadPromise;
  loadPromise = fetch('./ph-stars.json')
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => {
      starsList = data;
      starsIndex = new Map(data.map((s) => [s.n.toLowerCase(), s]));
      return data;
    })
    .catch((err) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('No se pudo cargar el dataset de actrices PH:', err.message);
      }
      starsList = [];
      starsIndex = new Map();
      return [];
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
  return starsIndex.get(name.toLowerCase()) || null;
}

export async function findOrCreateActress(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  // 1. Local
  const local = await getActressByName(trimmed);
  if (local && hasRealData(local)) return local;

  // 2. Dataset estático
  const star = getStar(trimmed);
  if (star) {
    const slug = `slug:${slugify(trimmed)}`;
    const enriched = {
      id: slug,
      name: star.n,
      source: 'ph-dataset',
      rank: star.r || null,
      born: star.b || null,
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

  // 3. Live scraping
  if (local && local.notFound) return local;
  const scraped = await fetchActress(trimmed);
  return scraped;
}

function hasRealData(a) {
  if (!a) return false;
  return a.rank || a.videosCount || a.subscribers || a.born || a.height || a.weight || a.relation || a.ethnicity || a.measurements || a.avatar;
}

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
