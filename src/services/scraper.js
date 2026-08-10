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
  const cleaned = String(text).replace(/[^\dKkMm.]/g, '');
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

function looksLikeNotFound(html) {
  return (
    /page not found/i.test(html) ||
    /<title>[^<]*not found/i.test(html) ||
    /removed\s*all\s*of\s*her\s*content/i.test(html)
  );
}

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

  const profileInfo = html.match(/<div[^>]+class="[^"]*infoPiece[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class="[^"]*infoPiece[^"]*"/gi) || [];
  profileInfo.forEach((block) => {
    const text = stripTags(block);
    const lower = text.toLowerCase();
    if (lower.includes('gender') && !out.gender) {
      out.gender = text.replace(/gender:?/i, '').trim();
    } else if (lower.includes('height') && !out.height) {
      out.height = text.replace(/height:?/i, '').trim();
    } else if (lower.includes('weight') && !out.weight) {
      out.weight = text.replace(/weight:?/i, '').trim();
    } else if (lower.includes('born') && !out.born) {
      out.born = text.replace(/born:?/i, '').trim();
    } else if (lower.includes('relationship') && !out.relation) {
      out.relation = text.replace(/relationship\s*status:?/i, '').trim();
    } else if (lower.includes('ethnicity') && !out.ethnicity) {
      out.ethnicity = text.replace(/ethnicity:?/i, '').trim();
    } else if (lower.includes('hair') && !out.hair) {
      out.hair = text.replace(/hair\s*color:?/i, '').trim();
    } else if (lower.includes('eye') && !out.eyes) {
      out.eyes = text.replace(/eye\s*color:?/i, '').trim();
    } else if (lower.includes('measurements') && !out.measurements) {
      out.measurements = text.replace(/measurements:?/i, '').trim();
    } else if (lower.includes('cup') && !out.cup) {
      out.cup = text.replace(/cup\s*size:?/i, '').trim();
    } else if (lower.includes('city') && !out.city) {
      out.city = text.replace(/city\s*and\s*country:?/i, '').trim();
    } else if (lower.includes('started') && !out.startedYear) {
      const m = text.match(/(\d{4})/);
      if (m) out.startedYear = m[1];
    }
  });

  const tagsSection = html.match(/<ul[^>]+class="[^"]*tagList[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  if (tagsSection) {
    const tagMatches = [...tagsSection[1].matchAll(/<a[^>]+>([^<]+)<\/a>/g)];
    out.tags = tagMatches.map((m) => stripTags(m[1])).filter(Boolean).slice(0, 20);
  }

  const avatarMatch = html.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+data-src="([^"]+)"/i) ||
    html.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/i);
  if (avatarMatch) out.avatar = avatarMatch[1];

  if (!out.avatar) {
    const metaMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (metaMatch) out.avatar = metaMatch[1];
  }

  const bioMatch = html.match(/<div[^>]+class="[^"]*aboutSection[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (bioMatch) {
    out.bio = stripTags(bioMatch[1]).slice(0, 500);
  }

  return out;
}

async function fetchOnce(target) {
  const res = await fetch(buildUrl(target), { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function hasRealData(a) {
  if (!a) return false;
  return a.rank || a.videosCount || a.subscribers || a.born || a.height || a.weight;
}

export async function fetchActress(name, { force = false } = {}) {
  const trimmed = String(name || '').trim();
  const slug = slugify(trimmed);
  if (!slug) {
    return { name: trimmed, id: '', source: 'manual', fetchedAt: 0, error: 'Vacío' };
  }

  const stored = await getActressByName(trimmed);
  const cached = cache.get(slug);

  if (!force && cached && cached.fetchedAt && Date.now() - cached.fetchedAt < 1000 * 60 * 60 * 24 * 7) {
    return cached;
  }
  if (!force && stored && stored.fetchedAt && Date.now() - stored.fetchedAt < 1000 * 60 * 60 * 24 * 7) {
    cache.set(slug, stored);
    return stored;
  }

  if (inflight.has(slug)) return inflight.get(slug);

  const target = `${BASE}/pornstar/${slug}`;

  const promise = (async () => {
    try {
      const html = await fetchOnce(target);
      if (looksLikeNotFound(html)) {
        const data = stored ? { ...stored, notFound: true, fetchedAt: Date.now() } : {
          id: `slug:${slug}`,
          name: trimmed,
          source: 'pornhub',
          url: target,
          fetchedAt: Date.now(),
          notFound: true,
        };
        await upsertActress(data);
        cache.set(slug, data);
        return data;
      }
      const data = extractFromHtml(html, trimmed);
      const isEmpty = !hasRealData(data);
      if (isEmpty) {
        data.notFound = true;
        if (stored) Object.assign(data, { id: stored.id, url: stored.url });
      }
      await upsertActress(data);
      cache.set(slug, data);
      return data;
    } catch (err) {
      if (stored && hasRealData(stored)) {
        cache.set(slug, stored);
        return stored;
      }
      const data = stored
        ? { ...stored, error: err.message, fetchedAt: 0 }
        : {
            id: `slug:${slug}`,
            name: trimmed,
            source: 'pornhub',
            url: target,
            fetchedAt: 0,
            error: err.message,
            notFound: true,
          };
      cache.set(slug, data);
      return data;
    } finally {
      inflight.delete(slug);
    }
  })();

  inflight.set(slug, promise);
  return promise;
}

export async function refreshActress(slug) {
  const cached = cache.get(slug);
  if (cached && cached.name) {
    cache.delete(slug);
    return fetchActress(cached.name, { force: true });
  }
  return null;
}

export function clearActressCache() {
  cache.clear();
}

export function _extractFromHtml(html, name) {
  return extractFromHtml(html, name);
}
