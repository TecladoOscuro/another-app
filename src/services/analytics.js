import { startOfDay, addDays, isoWeek, startOfMonth, endOfMonth } from './date.js';

export function totalsBy(entries, keyFn) {
  const map = new Map();
  for (const e of entries) {
    const k = keyFn(e);
    if (!k && k !== 0) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

export function totalsByCategories(entries) {
  const map = new Map();
  for (const e of entries) {
    const cats = e.categories?.length ? e.categories : e.category ? [e.category] : [];
    for (const c of cats) {
      if (!c) continue;
      map.set(c, (map.get(c) || 0) + 1);
    }
  }
  return map;
}

export { formatBigNumber } from './date.js';

export function topN(map, n = 10) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function totals(entries) {
  return {
    count: entries.length,
    totalSeconds: entries.reduce((acc, e) => acc + (e.duration || 0), 0),
  };
}

export function dailySeries(entries, fromTs, toTs) {
  const map = new Map();
  for (let t = startOfDay(fromTs); t < toTs; t = addDays(t, 1)) {
    map.set(t, 0);
  }
  for (const e of entries) {
    const day = startOfDay(e.at);
    if (map.has(day)) map.set(day, map.get(day) + 1);
  }
  return map;
}

export function heatmapByDay(entries, days = 180) {
  const today = startOfDay(Date.now());
  const start = addDays(today, -(days - 1));
  const map = new Map();
  for (let t = start; t <= today; t = addDays(t, 1)) {
    map.set(t, 0);
  }
  for (const e of entries) {
    const day = startOfDay(e.at);
    if (map.has(day)) map.set(day, map.get(day) + 1);
  }
  return map;
}

export function monthlySeries(entries, year) {
  const map = new Array(12).fill(0);
  for (const e of entries) {
    const d = new Date(e.at);
    if (d.getFullYear() === year) map[d.getMonth()] += 1;
  }
  return map;
}

export function hourlyDistribution(entries) {
  const arr = new Array(24).fill(0);
  for (const e of entries) {
    const h = new Date(e.at).getHours();
    arr[h] += 1;
  }
  return arr;
}

export function weekdayDistribution(entries) {
  const arr = new Array(7).fill(0);
  for (const e of entries) {
    const d = new Date(e.at);
    const idx = (d.getDay() + 6) % 7;
    arr[idx] += 1;
  }
  return arr;
}

export function streakDays(entries) {
  if (!entries.length) return { current: 0, longest: 0 };
  const days = new Set(entries.map((e) => startOfDay(e.at)));
  const sorted = [...days].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDays(sorted[i - 1], 1)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = startOfDay(Date.now());
  let current = 0;
  let cursor = today;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

export function yearReport(entries, year) {
  const yearEntries = entries.filter(
    (e) => new Date(e.at).getFullYear() === year,
  );
  if (!yearEntries.length) {
    return null;
  }

  const summary = totals(yearEntries);
  const byCategory = topN(totalsByCategories(yearEntries), 5);
  const byActress = topN(totalsBy(yearEntries, (e) => e.actressId || e.actressName || null), 5).filter(([k]) => k);
  const bySite = topN(totalsBy(yearEntries, (e) => e.site || null), 5).filter(([k]) => k);

  const months = monthlySeries(yearEntries, year);
  const peakMonth = months.indexOf(Math.max(...months));

  const weekdays = weekdayDistribution(yearEntries);
  const peakWeekday = weekdays.indexOf(Math.max(...weekdays));

  const hours = hourlyDistribution(yearEntries);
  const peakHour = hours.indexOf(Math.max(...hours));

  const best = byActress[0];
  const streaks = streakDays(yearEntries);

  return {
    year,
    summary,
    byCategory,
    byActress,
    bySite,
    months,
    peakMonth,
    peakWeekday,
    peakHour,
    best,
    streaks,
  };
}

export function comparePastDays(entries, days) {
  const today = startOfDay(Date.now());
  const from = addDays(today, -(days - 1));
  return dailySeries(entries, from, addDays(today, 1));
}

export function entriesThisMonth(entries) {
  const now = new Date();
  const start = startOfMonth(now.getFullYear(), now.getMonth());
  const end = endOfMonth(now.getFullYear(), now.getMonth());
  return entries.filter((e) => e.at >= start && e.at < end);
}

export function entriesToday(entries) {
  const now = new Date();
  const todayStr = now.toDateString();
  return entries.filter((e) => new Date(e.at).toDateString() === todayStr);
}

export function uniqueActresses(entries) {
  const set = new Set();
  for (const e of entries) {
    if (e.actressId) set.add(e.actressId);
    else if (e.actressName) set.add(e.actressName);
  }
  return set.size;
}

export function avgDuration(entries) {
  const withDur = entries.filter((e) => e.duration);
  if (!withDur.length) return 0;
  return Math.round(withDur.reduce((a, e) => a + e.duration, 0) / withDur.length);
}

function birthYear(a) {
  if (!a || !a.born) return null;
  const m = a.born.match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

export function ageBucket(actress) {
  const y = birthYear(actress);
  if (!y) return null;
  const age = new Date().getFullYear() - y;
  if (age < 20) return '<20';
  if (age < 25) return '20-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  if (age < 50) return '40-49';
  return '50+';
}

export function decadeBucket(actress) {
  const y = birthYear(actress);
  if (!y) return null;
  return `${Math.floor(y / 10) * 0}s`;
}

export function ethnicityBucket(actress) {
  if (!actress?.ethnicity) {
    // Heurística por nombre
    if (!actress?.name) return null;
    const n = actress.name.toLowerCase();
    const asianPatterns = ['mei ', 'ling', 'xia', 'yuki', ' ai ', 'sakura', 'kim ', 'lee ', 'park', 'chan', ' ji ', 'aoi ', 'rina', ' mio ', 'hina', ' yui ', 'emi ', ' rio '];
    const latinPatterns = ['lopez', 'garcia', 'rodriguez', 'martinez', 'hernandez', 'gonzalez', ' luna', 'isabella', 'valentina', 'camila', 'sofia', ' andrea'];
    if (asianPatterns.some((p) => n.includes(p.trim()))) return 'Asian';
    if (latinPatterns.some((p) => n.includes(p))) return 'Latina';
    return null;
  }
  const e = actress.ethnicity.toLowerCase();
  if (e.includes('latin') || e.includes('hispanic')) return 'Latina';
  if (e.includes('asian')) return 'Asian';
  if (e.includes('ebony') || e.includes('black')) return 'Black';
  if (e.includes('caucasian') || e.includes('white')) return 'Caucasian';
  if (e.includes('middle eastern') || e.includes('arab')) return 'Arab';
  if (e.includes('mixed')) return 'Mixed';
  return actress.ethnicity;
}

export function rankBucket(actress) {
  if (!actress?.rank) return null;
  const n = parseInt(String(actress.rank).replace(/[^\d]/g, ''), 10);
  if (!n) return null;
  if (n <= 100) return 'Top 100';
  if (n <= 500) return 'Top 500';
  if (n <= 2000) return 'Top 2k';
  if (n <= 10000) return 'Top 10k';
  return 'Top 10k+';
}

export function sourceBucket(actress) {
  if (!actress) return null;
  if (actress.notFound) return null;
  if (actress.source === 'manual') return 'Manual';
  if (actress.source === 'ph-dataset') return 'Dataset PH';
  return 'PH (extra)';
}

export function distribution(entries, actresses, compute) {
  const map = new Map();
  const aMap = new Map(actresses.map((a) => [a.id, a]));
  const aByName = new Map(actresses.filter((a) => a.name).map((a) => [a.name.toLowerCase(), a]));
  for (const e of entries) {
    let key = e.actressId || e.actressName || null;
    if (!key) continue;
    let a = aMap.get(key);
    if (!a && e.actressName) a = aByName.get(e.actressName.toLowerCase());
    if (!a && e.actressId) a = aByName.get(e.actressId.replace(/^slug:/, '').toLowerCase());
    const v = compute(a);
    if (!v) continue;
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

export function topActressesByScore(entries, actresses, limit = 5) {
  const counts = new Map();
  for (const e of entries) {
    const key = e.actressId || e.actressName;
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => {
      const lowerId = id.toLowerCase();
      const a = actresses.find(
        (x) =>
          (x.id && x.id === id) ||
          (x.name && x.name.toLowerCase() === lowerId) ||
          (x.id && x.id.replace(/^slug:/, '').toLowerCase() === lowerId.replace(/^slug:/, '')) ||
          (x.name && x.name.toLowerCase().includes(lowerId.replace(/^slug:/, ''))),
      );
      // Fallback: si no se encuentra pero el id es slug:foo, mostrar "foo" humanizado
      let displayName = a?.name;
      if (!displayName) {
        if (id.startsWith('slug:')) {
          displayName = id.replace(/^slug:/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        } else {
          displayName = id;
        }
      }
      return {
        actress: a,
        displayName,
        count,
      };
    });
}

export function isoWeekKey(ts) {
  const year = new Date(ts).getFullYear();
  const week = isoWeek(ts);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function weeklySeries(entries, weeks = 12, anchorTs = Date.now()) {
  const map = new Map();
  const today = startOfDay(anchorTs);
  for (let i = weeks - 1; i >= 0; i--) {
    const t = addDays(today, -i * 7);
    map.set(isoWeekKey(t), 0);
  }
  for (const e of entries) {
    const k = isoWeekKey(e.at);
    if (map.has(k)) map.set(k, map.get(k) + 1);
  }
  return map;
}
