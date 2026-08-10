import { startOfDay, addDays, endOfMonth, startOfMonth, isoWeek, todayKey } from './date.js';

export function totalsBy(entries, keyFn) {
  const map = new Map();
  for (const e of entries) {
    const k = keyFn(e);
    if (!k && k !== 0) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

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
  const byCategory = topN(totalsBy(yearEntries, (e) => e.category || 'Sin categoría'), 5);
  const byActress = topN(totalsBy(yearEntries, (e) => e.actressId || e.actressName || '—'), 5);
  const bySite = topN(totalsBy(yearEntries, (e) => e.site || '—'), 5);

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

export { formatBigNumber } from './date.js';
