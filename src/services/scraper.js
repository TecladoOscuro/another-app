import { getActressByName, upsertActress } from '../db.js';

const PROXY = 'https://corsproxy.io/?';
const BASE = 'https://www.pornhub.com';
const HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
};

const cache = new Map();
const inflight = new Map();

function buildUrl(target) {
  return `${PROXY}${encodeURIComponent(target)}`;
}

function decodeHtml(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s) {
  return decodeHtml(s).replace(/<[^>]+>/g, '').trim();
}

function parseCount(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\dKkMm.]/g, '');
  const match = cleaned.match(/([\d.]+)\s*([KkMm]?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const mult = match[2].toLowerCase();
  if (mult === 'k') return Math.round(num * 1000);
  if (mult === 'm') return Math.round(num * 1_000_000);
  return Math.round(num);
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export { slugify };

function extractFromHtml(html, name) {
  const out = {
    name,
    id: `slug:${slugify(name)}`,
    source: 'pornhub',
    url: `${BASE}/pornstar/${slugify(name)}`,
    fetchedAt: Date.now(),
  };

  const rankMatch = html.match(/Pornstar\s*Rank[^<]*<[^>]*>\s*#?\s*(\d[\d,]*)/i);
  if (rankMatch) out.rank = rankMatch[1];

  const videosMatch = html.match(/(\d[\d,]*)\s*<[^>]*>\s*Videos/i);
  if (videosMatch) out.videosCount = parseCount(videosMatch[1]);

  const subsMatch = html.match(/(\d+(?:\.\d+)?[KkMm]?)\s*<[^>]*>\s*Subscribers/i);
  if (subsMatch) out.subscribers = parseCount(subsMatch[1]);

  const viewsMatch = html.match(/(\d+(?:\.\d+)?[KkMm]?)\s*<[^>]*>\s*Views/i);
  if (viewsMatch) out.videoViews = parseCount(viewsMatch[1]);

  const relationMatch = html.match(/Relation(?:ship)?\s*Status[^<]*<[^>]*>([^<]+)/i);
  if (relationMatch) out.relation = stripTags(relationMatch[1]);

  const genderMatch = html.match(/Gender[^<]*<[^>]*>([^<]+)/i);
  if (genderMatch) out.gender = stripTags(genderMatch[1]);

  const bhMatch = html.match(/Height[^<]*<[^>]*>([^<]+)/i);
  if (bhMatch) out.height = stripTags(bhMatch[1]);

  const bwMatch = html.match(/Weight[^<]*<[^>]*>([^<]+)/i);
  if (bwMatch) out.weight = stripTags(bwMatch[1]);

  const bornMatch = html.match(/Born[^<]*<[^>]*>([^<]+)/i);
  if (bornMatch) out.born = stripTags(bornMatch[1]);

  const avatarMatch = html.match(/<img[^>]*class="[^"]*avatar[^"]*"[^>]*src="([^"]+)"/i);
  if (avatarMatch) out.avatar = avatarMatch[1];

  if (!out.avatar) {
    const metaMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (metaMatch) out.avatar = metaMatch[1];
  }

  return out;
}

async function fetchOnce(target) {
  const res = await fetch(buildUrl(target), { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function fetchActress(name, { force = false } = {}) {
  const slug = slugify(name);
  const cached = cache.get(slug);
  if (!force && cached && Date.now() - cached.fetchedAt < 1000 * 60 * 60 * 24 * 7) {
    return cached;
  }

  const stored = await getActressByName(name);
  if (!force && stored && Date.now() - (stored.fetchedAt || 0) < 1000 * 60 * 60 * 24 * 7) {
    cache.set(slug, stored);
    return stored;
  }

  if (inflight.has(slug)) return inflight.get(slug);

  const promise = (async () => {
    const target = `${BASE}/pornstar/${slug}`;
    try {
      const html = await fetchOnce(target);
      const data = extractFromHtml(html, name);
      await upsertActress(data);
      cache.set(slug, data);
      return data;
    } catch (err) {
      const fallback = stored
        ? { ...stored, error: err.message, fetchedAt: 0 }
        : {
            name,
            id: `slug:${slug}`,
            source: 'pornhub',
            url: target,
            fetchedAt: 0,
            error: err.message,
          };
      cache.set(slug, fallback);
      return fallback;
    } finally {
      inflight.delete(slug);
    }
  })();

  inflight.set(slug, promise);
  return promise;
}

export function clearActressCache() {
  cache.clear();
}

export function _extractFromHtml(html, name) {
  return extractFromHtml(html, name);
}
