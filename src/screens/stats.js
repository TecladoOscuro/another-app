import { getAllEntries, listActresses } from '../db.js';
import {
  totals,
  topN,
  totalsBy,
  totalsByCategories,
  monthlySeries,
  hourlyDistribution,
  weekdayDistribution,
  heatmapByDay,
  streakDays,
  yearReport,
  uniqueActresses,
  weeklySeries,
  ageBucket,
  decadeBucket,
  ethnicityBucket,
  rankBucket,
  sourceBucket,
  distribution,
  topActressesByScore,
} from '../services/analytics.js';
import { MONTHS_SHORT, MONTHS_ES, WEEKDAYS_ES, addDays, startOfDay, pad2 } from '../services/date.js';
import { escapeHtml } from '../services/html.js';
import { openActressDetailModal } from '../ui/actressDetail.js';
import { openModal } from '../ui/modal.js';

const FILTERS = {
  all: { label: 'Todo' },
  today: { label: 'Hoy', from: () => startOfDay(Date.now()), to: () => addDays(startOfDay(Date.now()), 1) },
  '7d': { label: '7d', from: () => addDays(startOfDay(Date.now()), -6), to: () => addDays(startOfDay(Date.now()), 1) },
  '30d': { label: '30d', from: () => addDays(startOfDay(Date.now()), -29), to: () => addDays(startOfDay(Date.now()), 1) },
  '3m': { label: '3m', from: () => addDays(startOfDay(Date.now()), -89), to: () => addDays(startOfDay(Date.now()), 1) },
  '6m': { label: '6m', from: () => addDays(startOfDay(Date.now()), -179), to: () => addDays(startOfDay(Date.now()), 1) },
  '1y': { label: '1 año', from: () => addDays(startOfDay(Date.now()), -364), to: () => addDays(startOfDay(Date.now()), 1) },
};

let currentFilter = 'all';
let currentYear = null;
let currentMonth = null;
let currentDevice = '';
let currentSourceType = '';
let currentHeatmapRange = 90;
let currentWrappedYear = null;
let lastMain = null;

function activeFilterCount() {
  let n = 0;
  if (currentFilter !== 'all') n++;
  if (currentYear) n++;
  if (currentMonth !== null) n++;
  if (currentDevice) n++;
  if (currentSourceType) n++;
  return n;
}

function filterSummary() {
  const parts = [];
  if (currentFilter !== 'all') parts.push(FILTERS[currentFilter].label);
  if (currentYear) parts.push(String(currentYear));
  if (currentMonth !== null) parts.push(MONTHS_SHORT[currentMonth]);
  if (currentDevice) parts.push(currentDevice);
  if (currentSourceType) parts.push(currentSourceType);
  return parts.join(' · ');
}

export async function renderStats(main) {
  lastMain = main;
  const allEntries = await getAllEntries();
  const actresses = await listActresses();

  const years = [...new Set(allEntries.map((e) => new Date(e.at).getFullYear()))].sort((a, b) => b - a);
  const devices = [...new Set(allEntries.map((e) => e.device).filter(Boolean))].sort();
  const sourceTypes = [...new Set(allEntries.map((e) => e.sourceType).filter(Boolean))].sort();

  const filters = computeFilters(allEntries);
  const entries = applyFilter(allEntries, filters);

  const t = totals(entries);
  const streaks = streakDays(entries);
  const today = new Date();
  const globalYear = today.getFullYear();

  if (currentWrappedYear === null) currentWrappedYear = globalYear;
  const wrappedYear = currentWrappedYear;
  const wrappedEntries = allEntries.filter((e) => new Date(e.at).getFullYear() === wrappedYear);
  const wrappedTotals = totals(wrappedEntries);
  const wrappedStreaks = streakDays(wrappedEntries);
  const wrappedReport = yearReport(wrappedEntries, wrappedYear);
  const wrappedPrevReport = yearReport(allEntries, wrappedYear - 1);
  const wrappedByCategory = topN(totalsByCategories(wrappedEntries), 20);
  const wrappedCatCount = wrappedByCategory.length;

  const heatmap = heatmapByDay(entries, currentHeatmapRange);
  const months = monthlySeries(entries, wrappedYear);
  const hours = hourlyDistribution(entries);
  const weekdays = weekdayDistribution(entries);

  const byCategory = topN(totalsByCategories(entries), 20);
  const topActresses = topActressesByScore(entries, actresses, 10);
  const bySite = topN(totalsBy(entries, (e) => e.site || null), 6).filter(([k]) => k);
  const byDevice = topN(totalsBy(entries, (e) => e.device || null), 6).filter(([k]) => k);
  const bySource = topN(totalsBy(entries, (e) => e.sourceType || null), 6).filter(([k]) => k);
  const byLubricant = topN(totalsBy(entries, (e) => e.lubricant || null), 6).filter(([k]) => k);

  const byAge = distribution(entries, actresses, ageBucket);
  const byEthnicity = distribution(entries, actresses, ethnicityBucket);
  const byRank = distribution(entries, actresses, rankBucket);

  const heatVals = [...heatmap.values()];
  const heatMax = Math.max(1, ...heatVals);
  const heatColors = ['var(--bg-elevated)'];
  for (let i = 1; i <= 4; i++) {
    heatColors.push(`color-mix(in srgb, var(--accent) ${i * 22}%, var(--bg-elevated))`);
  }

  const avgPerDay = computeAvgPerDay(entries);
  const avgGap = computeAvgGap(entries);
  const activeDaysPerWeek = computeActiveDaysPerWeek(entries);
  const totalMin = Math.round(t.totalSeconds / 60);

  main.innerHTML = `
    <div class="screen stats-screen">
      <div class="stats-header">
        <h2>Estadísticas</h2>
        <button class="btn-icon" id="openFilters" aria-label="Filtros">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/></svg>
          ${activeFilterCount() > 0 ? `<span class="btn-icon__count">${activeFilterCount()}</span>` : ''}
        </button>
      </div>

      ${filterSummary() ? `<button class="filter-active" id="clearFilters">
        <span class="filter-active__dot"></span>
        <span class="filter-active__text">Filtrando: <b>${escapeHtml(filterSummary())}</b></span>
        <span class="filter-active__clear">Limpiar</span>
      </button>` : ''}

      ${renderWrappedHero(wrappedYear, wrappedTotals, wrappedStreaks, wrappedCatCount, wrappedPrevReport, wrappedReport, allEntries)}

      <div class="stat-grid">
        ${summaryCard('Total', t.count, 'en este periodo', 'pink')}
        ${summaryCard('Media/día', avgPerDay, 'últimos 30d', 'blue')}
        ${summaryCard('Activas', uniqueActresses(entries), 'actrices únicas', 'green')}
        ${summaryCard('Tiempo', totalMin + 'm', 'en sesiones', 'purple')}
      </div>

      ${collapsibleSection('habits', 'Tus hábitos', habitsCard(entries, avgGap, activeDaysPerWeek, hours, weekdays), t.count > 0)}

      ${collapsibleSection('heatmap', 'Heatmap', renderHeatmapHtml(heatmap, currentHeatmapRange), t.count > 0)}

      ${collapsibleSection('hours', 'Horas del día', hoursBarsHtml(hours), t.count > 0)}

      ${collapsibleSection('weekdays', 'Días de la semana', weekdayBarsHtml(weekdays), t.count > 0)}

      ${collapsibleSection('months', `Mes a mes · ${wrappedYear}`, monthBarsHtml(months), t.count > 0)}

      ${collapsibleSection('actresses', 'Top actrices', actressesGridHtml(topActresses), t.count > 0)}

      ${collapsibleSection('categories', 'Top categorías', categoryGridHtml(topN(byCategory, 12)), t.count > 0)}

      ${collapsibleSection('taste-all', 'Tus gustos', tasteDashboardHtml(entries, actresses), hasTasteData(entries, actresses))}

      ${collapsibleSection('sites', 'Sitios', simpleBarsHtml(bySite, 6), bySite.length > 0)}
      ${collapsibleSection('devices', 'Dispositivos', simpleBarsHtml(byDevice, 6), byDevice.length > 0)}
      ${collapsibleSection('source', 'Tipo de fuente', simpleBarsHtml(bySource, 6), bySource.length > 0)}
      ${collapsibleSection('lube', 'Lubricante', simpleBarsHtml(byLubricant, 6), byLubricant.length > 0)}
    </div>
  `;

  bindFilters(main);
  bindCollapsibles(main);
  bindActressClicks(main);
  renderHeatmapDom(heatmap, heatColors, heatMax);
}

function summaryCard(label, value, hint, color) {
  return `
    <div class="summary-cell summary-cell--${color}">
      <div class="summary-cell__label">${escapeHtml(label)}</div>
      <div class="summary-cell__value">${escapeHtml(String(value))}</div>
      <div class="summary-cell__hint">${escapeHtml(hint)}</div>
    </div>
  `;
}

function computeAvgPerDay(entries) {
  if (!entries.length) return 0;
  const last30 = entries.filter((e) => e.at >= Date.now() - 30 * 86400000);
  const days = new Set(last30.map((e) => startOfDay(e.at))).size || 1;
  return (last30.length / days).toFixed(1);
}

function computeAvgGap(entries) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.at - b.at);
  let totalGap = 0;
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].at - sorted[i - 1].at;
    if (gap < 7 * 86400000) {
      totalGap += gap;
      gaps++;
    }
  }
  if (gaps === 0) return null;
  const avgMs = totalGap / gaps;
  const hours = avgMs / 3600000;
  if (hours < 1) return `${Math.round(avgMs / 60000)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function computeActiveDaysPerWeek(entries) {
  if (!entries.length) return 0;
  const last30 = entries.filter((e) => e.at >= Date.now() - 30 * 86400000);
  const days = new Set(last30.map((e) => startOfDay(e.at))).size;
  return (days / 4.3).toFixed(1);
}

function habitsCard(entries, avgGap, activeDaysPerWeek, hours, weekdays) {
  const maxHour = Math.max(...hours);
  const peakHour = hours.indexOf(maxHour);
  const maxWeekday = Math.max(...weekdays);
  const peakWeekday = weekdays.indexOf(maxWeekday);
  const items = [
    { label: 'Hora pico', value: `${pad2(peakHour)}:00 – ${pad2(peakHour)}:59`, sub: `${maxHour} registros` },
    { label: 'Día favorito', value: WEEKDAYS_ES[peakWeekday], sub: `${maxWeekday} registros` },
    { label: 'Días activos/sem', value: activeDaysPerWeek, sub: 'media de los últimos 30 días' },
    { label: 'Entre registros', value: avgGap || '—', sub: 'tiempo medio entre cada uno' },
  ];
  return `<div class="habits-grid">${items.map((it) => `
    <div class="habit-cell">
      <div class="habit-cell__label">${escapeHtml(it.label)}</div>
      <div class="habit-cell__value">${escapeHtml(String(it.value))}</div>
      <div class="habit-cell__sub">${escapeHtml(it.sub)}</div>
    </div>
  `).join('')}</div>`;
}

function collapsibleSection(id, title, body, hasData = true) {
  const isOpen = ['habits', 'heatmap', 'hours', 'actresses', 'categories', 'taste-age'].includes(id);
  if (!hasData) {
    return `
      <section class="stats-section">
        <header class="stats-section__head">
          <span class="stats-section__title">${escapeHtml(title)}</span>
          <span class="stats-section__chev"></span>
        </header>
      </section>
    `;
  }
  return `
    <section class="stats-section ${isOpen ? 'is-open' : ''}">
      <button class="stats-section__head" data-toggle="${id}" aria-expanded="${isOpen}">
        <span class="stats-section__title">${escapeHtml(title)}</span>
        <span class="stats-section__chev ${isOpen ? 'is-open' : ''}"></span>
      </button>
      <div class="stats-section__body ${isOpen ? 'is-open' : ''}" data-body="${id}">${body}</div>
    </section>
  `;
}

function renderWrappedHero(year, t, streaks, catCount, prev, report, allEntries) {
  let body = '';
  if (t.count) {
    const peakHour = report?.peakHour ?? 0;
    const peakMonth = report?.peakMonth ?? 0;
    const cards = [];
    cards.push(wrappedCard('Tu año', String(t.count), 'momentos', 'pink'));
    if (prev && prev.summary.count) {
      const diff = t.count - prev.summary.count;
      const pct = Math.round((diff / prev.summary.count) * 100);
      cards.push(wrappedCard(`vs ${year - 1}`, `${diff >= 0 ? '+' : ''}${diff}`, `${pct >= 0 ? '+' : ''}${pct}%`, diff >= 0 ? 'green' : 'orange'));
    }
    cards.push(wrappedCard('Mejor racha', `${streaks.longest}d`, 'seguidos', 'purple'));
    cards.push(wrappedCard('Hora pico', `${pad2(peakHour)}:00`, MONTHS_SHORT[peakMonth] || '', 'blue'));
    if (report?.byActress?.[0]) {
      cards.push(wrappedCard('Tu top', '★', `<b>${escapeHtml(report.byActress[0][0])}</b><br>${report.byActress[0][1]} veces`, 'pink'));
    }
    cards.push(wrappedCard('Variedad', String(catCount), 'categorías', 'green'));
    body = `<div class="wrapped-hero__grid">${cards.join('')}</div>`;
  } else {
    body = `<div class="wrapped-hero__empty">Sin datos en ${year}</div>`;
  }

  const availableYears = [...new Set(allEntries.map((e) => new Date(e.at).getFullYear()))].sort((a, b) => b - a);
  const idx = availableYears.indexOf(year);
  const prevYear = idx >= 0 && idx < availableYears.length - 1 ? availableYears[idx + 1] : null;
  const nextYear = idx > 0 ? availableYears[idx - 1] : null;

  return `
    <section class="wrapped-hero">
      <div class="wrapped-hero__nav">
        <button class="wrapped-hero__arrow" data-wrapped-nav="${prevYear ?? ''}" ${prevYear ? '' : 'disabled'} aria-label="Año anterior">‹</button>
        <div class="wrapped-hero__title">
          <span>Wrapped</span>
          <strong>${year}</strong>
        </div>
        <button class="wrapped-hero__arrow" data-wrapped-nav="${nextYear ?? ''}" ${nextYear ? '' : 'disabled'} aria-label="Año siguiente">›</button>
      </div>
      <button class="wrapped-hero__global" id="wrappedGlobal">
        <span>Ver global</span>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/></svg>
      </button>
      ${body}
    </section>
  `;
}

function wrappedCard(title, bigNumber, sub, accent) {
  return `
    <div class="wrapped-card wrapped-card--${escapeHtml(accent)}">
      <div class="wrapped-card__title">${escapeHtml(title)}</div>
      <div class="wrapped-card__big">${bigNumber}</div>
      <div class="wrapped-card__sub">${sub}</div>
    </div>
  `;
}

function actressesGridHtml(topActresses) {
  if (!topActresses.length) return emptyCard('Sin datos.');
  return `<div class="grid-cards grid-cards--3">${topActresses
    .map(({ actress, displayName, count }, i) => {
      const name = displayName || actress?.name || '—';
      const initial = name[0] ? name[0].toUpperCase() : '?';
      const encoded = encodeURIComponent(name);
      const meta = actress?.born ? escapeHtml(actress.born) : `${count} ${count === 1 ? 'vez' : 'veces'}`;
      return `
      <button class="actress-tile" data-actress="${encoded}">
        <div class="actress-tile__rank">${i + 1}</div>
        <div class="actress-tile__avatar">${actress?.avatar ? `<img src="${escapeHtml(actress.avatar)}" alt="" loading="lazy">` : escapeHtml(initial)}</div>
        <div class="actress-tile__name">${escapeHtml(name)}</div>
        <div class="actress-tile__meta">${meta}</div>
        <div class="actress-tile__count">${count}</div>
      </button>`;
    })
    .join('')}</div>`;
}

function categoryGridHtml(byCategory) {
  if (!byCategory.length) return emptyCard('Sin datos.');
  const total = byCategory.reduce((a, [, v]) => a + v, 0);
  return `<div class="grid-cards grid-cards--2">${byCategory
    .slice(0, 12)
    .map(([label, v]) => {
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return `
      <div class="cat-tile">
        <div class="cat-tile__pct">${pct}%</div>
        <div class="cat-tile__label">${escapeHtml(label)}</div>
        <div class="cat-tile__count">${v} ${v === 1 ? 'vez' : 'veces'}</div>
      </div>`;
    })
    .join('')}</div>`;
}

function hoursBarsHtml(hours) {
  const max = Math.max(1, ...hours);
  const top3 = hours
    .map((v, i) => ({ h: i, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .filter((x) => x.v > 0);
  const topLabel = top3.map((t) => `${pad2(t.h)}:00`).join(' · ');
  return `<div class="card">
    <div class="hours-summary">Top: <b>${escapeHtml(topLabel || '—')}</b></div>
    <div class="bars">${hours.map((v, i) => {
      const pct = Math.round((v / max) * 100);
      const isPeak = v === max && v > 0;
      return `<div class="bar-row"><span class="bar-row__label">${pad2(i)}h</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${pct}%"></span></span><span class="bar-row__value">${v}</span></div>`;
    }).join('')}</div>
  </div>`;
}

function weekdayBarsHtml(weekdays) {
  const max = Math.max(1, ...weekdays);
  return `<div class="card"><div class="bars">${weekdays.map((v, i) => {
    const pct = Math.round((v / max) * 100);
    return `<div class="bar-row"><span class="bar-row__label">${WEEKDAYS_ES[i]}</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${pct}%"></span></span><span class="bar-row__value">${v}</span></div>`;
  }).join('')}</div></div>`;
}

function monthBarsHtml(months) {
  const max = Math.max(1, ...months);
  return `<div class="card"><div class="bars">${months.map((v, i) => {
    const pct = Math.round((v / max) * 100);
    return `<div class="bar-row"><span class="bar-row__label">${MONTHS_SHORT[i]}</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${pct}%"></span></span><span class="bar-row__value">${v}</span></div>`;
  }).join('')}</div></div>`;
}

function simpleBarsHtml(arr, limit) {
  if (!arr.length) return emptyCard('Sin datos.');
  const total = arr.reduce((a, [, v]) => a + v, 0);
  return `<div class="card"><div class="bars">${arr.slice(0, limit).map(([label, v], i) => {
    const pct = Math.round((v / total) * 100);
    return `<div class="bar-row"><span class="bar-row__rank">${i + 1}</span><span class="bar-row__label">${escapeHtml(label)}</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${pct}%"></span></span><span class="bar-row__value">${v}</span></div>`;
  }).join('')}</div></div>`;
}

function tasteGridHtml(map) {
  if (!map || !map.size) return emptyCard('Sin datos. Las actrices necesitan tener info de Pornhub (fecha de nacimiento, etnia, etc.) para aparecer aquí.');
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  return `<div class="grid-cards grid-cards--2">${entries.map(([k, v], i) => {
    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
    const color = PALETTE[i % PALETTE.length];
    return `
    <div class="cat-tile cat-tile--colored" style="--c:${color}">
      <div class="cat-tile__pct">${pct}%</div>
      <div class="cat-tile__label">${escapeHtml(k)}</div>
      <div class="cat-tile__count">${v} ${v === 1 ? 'vez' : 'veces'}</div>
    </div>`;
  }).join('')}</div>`;
}

function tasteDashboardHtml(entries, actresses) {
  if (!entries.length) return emptyCard('Sin registros.');
  if (!actresses.length) return emptyCard('Sin actrices guardadas.');

  const aById = new Map(actresses.map((a) => [a.id, a]));
  const aByName = new Map(actresses.filter((a) => a.name).map((a) => [a.name.toLowerCase(), a]));

  // Recopilar datos
  const byAge = new Map();
  const byEthnicity = new Map();
  const byHair = new Map();
  const byHeight = new Map();
  const byWeight = new Map();
  const byCup = new Map();
  const byBust = new Map();
  let withData = 0;

  for (const e of entries) {
    if (!e.actressName) continue;
    const a = aByName.get(e.actressName.toLowerCase());
    if (!a) continue;
    const age = ageBucket(a);
    if (age) { byAge.set(age, (byAge.get(age) || 0) + 1); withData++; }
    const eth = ethnicityBucket(a);
    if (eth) byEthnicity.set(eth, (byEthnicity.get(eth) || 0) + 1);
    if (a.hair) {
      const h = a.hair.toLowerCase();
      const key = h.includes('blond') ? 'Rubia' : h.includes('brown') || h.includes('brunette') ? 'Morena' : h.includes('red') ? 'Pelirroja' : h.includes('black') ? 'Morena' : a.hair;
      byHair.set(key, (byHair.get(key) || 0) + 1);
    }
    const bust = parseInt(String(a.bust || '').match(/(\d+)/)?.[1] || '', 10);
    if (bust && bust >= 80) {
      const key = bust >= 95 ? 'Muy grande' : bust >= 90 ? 'Grande' : 'Mediano';
      byBust.set(key, (byBust.get(key) || 0) + 1);
    }
    if (a.cup) byCup.set(a.cup, (byCup.get(a.cup) || 0) + 1);
    const height = parseInt(String(a.height || '').match(/(\d+)/)?.[1] || '', 10);
    if (height) {
      const key = height < 160 ? 'Baja' : height >= 175 ? 'Alta' : 'Mediana';
      byHeight.set(key, (byHeight.get(key) || 0) + 1);
    }
    const weight = parseInt(String(a.weight || '').match(/(\d+)/)?.[1] || '', 10);
    if (weight) {
      const key = weight < 50 ? 'Delgada' : weight >= 65 ? 'Curvy' : 'Normal';
      byWeight.set(key, (byWeight.get(key) || 0) + 1);
    }
  }

  if (!withData) return emptyCard('Las actrices no tienen datos físicos. Necesitan tener info de Pornhub (fecha de nacimiento, etnia, etc.) para aparecer aquí.');

  // Pick the most informative category for the donut
  const candidates = [
    { title: 'Edad', data: byAge },
    { title: 'Etnia', data: byEthnicity },
    { title: 'Cabello', data: byHair },
    { title: 'Altura', data: byHeight },
    { title: 'Complexión', data: byWeight },
    { title: 'Busto', data: byBust },
  ].filter((c) => c.data.size > 0);

  const primary = candidates.sort((a, b) => b.data.size - a.data.size)[0];
  const others = candidates.filter((c) => c !== primary).slice(0, 3);

  return `
    <div class="card">
      <div class="taste-donut">
        ${renderDonut(primary.title, primary.data)}
        <div class="taste-side">
          ${renderBars(primary.title, primary.data)}
        </div>
      </div>
      ${others.length ? `
        <div class="taste-others">
          ${others.map((o) => `
            <div class="taste-other">
              <div class="taste-other__title">${escapeHtml(o.title)}</div>
              ${renderBars(o.title, o.data, true)}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderDonut(title, data) {
  const entries = [...data.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (!total) return '<div class="donut-empty">Sin datos</div>';

  const size = 140;
  const r = 50;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segs = entries.map(([k, v], i) => {
    const pct = v / total;
    const dash = c * pct;
    const seg = `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="18" stroke-dasharray="${dash} ${c - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" />`;
    offset += dash;
    return seg;
  }).join('');
  const top = entries[0];
  return `
    <div class="donut-wrap">
      <svg class="donut-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="18" />
        ${segs}
      </svg>
      <div class="donut-center">
        <div class="donut-center__pct">${Math.round((top[1] / total) * 100)}%</div>
        <div class="donut-center__label">${escapeHtml(top[0])}</div>
      </div>
      <div class="donut-title">${escapeHtml(title)}</div>
    </div>
  `;
}

function renderBars(title, data, compact = false) {
  const entries = [...data.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (!total) return '';
  return `<div class="taste-bars ${compact ? 'taste-bars--compact' : ''}">${entries.map(([k, v], i) => {
    const pct = Math.round((v / total) * 100);
    const color = PALETTE[i % PALETTE.length];
    return `
      <div class="taste-bar">
        <div class="taste-bar__label">${escapeHtml(k)}</div>
        <div class="taste-bar__track"><span class="taste-bar__fill" style="width:${pct}%; background:${color}"></span></div>
        <div class="taste-bar__value">${pct}%</div>
      </div>
    `;
  }).join('')}</div>`;
}

const PALETTE = ['#ff3b6b', '#ff9f0a', '#00b894', '#0984e3', '#6c5ce7', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe', '#55efc4'];

function emptyCard(text) {
  return `<div class="card empty"><span>${escapeHtml(text)}</span></div>`;
}

function hasTasteData(entries, actresses) {
  if (!entries.length || !actresses.length) return false;
  const aByName = new Map(actresses.filter((a) => a?.name).map((a) => [a.name.toLowerCase(), a]));
  for (const e of entries) {
    if (!e.actressName) continue;
    const a = aByName.get(e.actressName.toLowerCase());
    if (a && (a.born || a.ethnicity || a.hair || a.height || a.weight)) return true;
  }
  return false;
}

function hasAgeData(entries, actresses) {
  if (!entries.length) return false;
  const aByName = new Map(actresses.filter((a) => a?.name).map((a) => [a.name.toLowerCase(), a]));
  for (const e of entries) {
    if (!e.actressName) continue;
    const a = aByName.get(e.actressName.toLowerCase());
    if (a && a.born) return true;
  }
  return false;
}

function hasEthnicityData(entries, actresses) {
  if (!entries.length) return false;
  const aByName = new Map(actresses.filter((a) => a?.name).map((a) => [a.name.toLowerCase(), a]));
  for (const e of entries) {
    if (!e.actressName) continue;
    const a = aByName.get(e.actressName.toLowerCase());
    if (a && a.ethnicity) return true;
  }
  return false;
}

function bindCollapsibles(main) {
  main.querySelectorAll('.stats-section__head').forEach((head) => {
    head.addEventListener('click', () => {
      const id = head.dataset.toggle;
      const section = head.closest('.stats-section');
      if (!section) return;
      section.classList.toggle('is-open');
      const isOpen = section.classList.contains('is-open');
      head.setAttribute('aria-expanded', isOpen);
      const body = section.querySelector('.stats-section__body');
      const chev = head.querySelector('.stats-section__chev');
      if (body) body.classList.toggle('is-open', isOpen);
      if (chev) chev.classList.toggle('is-open', isOpen);
    });
  });
}

function bindActressClicks(main) {
  main.querySelectorAll('[data-actress]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.dataset.actress);
      openActressDetailModal(name, []);
    });
  });
}

function bindFilters(main) {
  document.getElementById('openFilters').addEventListener('click', () => {
    openFiltersModal(main);
  });
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    currentFilter = 'all';
    currentYear = null;
    currentMonth = null;
    currentDevice = '';
    currentSourceType = '';
    renderStats(main);
  });

  main.querySelectorAll('.stats-section__head').forEach((head) => {
    head.addEventListener('click', () => {
      const id = head.dataset.toggle;
      const section = head.closest('.stats-section');
      if (!section) return;
      section.classList.toggle('is-open');
      const isOpen = section.classList.contains('is-open');
      head.setAttribute('aria-expanded', isOpen);
      const body = section.querySelector('.stats-section__body');
      const chev = head.querySelector('.stats-section__chev');
      if (body) body.classList.toggle('is-open', isOpen);
      if (chev) chev.classList.toggle('is-open', isOpen);
    });
  });

  main.querySelectorAll('[data-actress]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.dataset.actress);
      openActressDetailModal(name, []);
    });
  });

  main.querySelectorAll('[data-wrapped-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const y = btn.dataset.wrappedNav;
      if (y) {
        currentWrappedYear = Number(y);
        renderStats(main);
      }
    });
  });
  document.getElementById('wrappedGlobal')?.addEventListener('click', () => {
    currentWrappedYear = null;
    renderStats(main);
  });

  main.querySelectorAll('[data-heatmap-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentHeatmapRange = Number(btn.dataset.heatmapRange);
      renderStats(main);
    });
  });
}

function openFiltersModal(main) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="filter-modal">
      <div class="filter-modal__group">
        <div class="filter-modal__label">Periodo</div>
        <div class="filter-modal__chips">
          ${Object.entries(FILTERS)
            .map(([k, v]) => `<button class="chip chip--lg ${currentFilter === k ? 'is-active' : ''}" data-filter="${k}">${escapeHtml(v.label)}</button>`)
            .join('')}
        </div>
      </div>
    </div>
  `;

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '8px';
  footer.style.width = '100%';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn';
  clear.textContent = 'Limpiar todo';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn btn--primary';
  close.textContent = 'Cerrar';
  footer.appendChild(clear);
  footer.appendChild(close);

  const m = openModal({ title: 'Filtros', body, footer });

  body.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    currentFilter = b.dataset.filter;
    renderStats(main);
    m.close();
  }));

  clear.addEventListener('click', () => {
    currentFilter = 'all';
    currentYear = null;
    currentMonth = null;
    currentDevice = '';
    currentSourceType = '';
    renderStats(main);
    m.close();
  });
  close.addEventListener('click', () => m.close());
}

function renderHeatmapHtml(heatmap, range) {
  const options = [
    { days: 30, label: '1m' },
    { days: 90, label: '3m' },
    { days: 180, label: '6m' },
    { days: 365, label: '1a' },
  ];
  return `<div class="card">
    <div class="heatmap__nav">
      <span class="heatmap__nav-label">Últimos ${range} días</span>
      <div class="heatmap__nav-chips">
        ${options.map(o => `<button type="button" class="heatmap__nav-chip ${o.days === range ? 'is-active' : ''}" data-heatmap-range="${o.days}">${o.label}</button>`).join('')}
      </div>
    </div>
    <div class="heatmap" id="heatmap"></div>
    <div class="heatmap__legend">menos <span class="heatmap__cell" style="background:var(--bg-elevated)"></span><span class="heatmap__cell" style="background:color-mix(in srgb, var(--accent) 22%, var(--bg-elevated))"></span><span class="heatmap__cell" style="background:color-mix(in srgb, var(--accent) 44%, var(--bg-elevated))"></span><span class="heatmap__cell" style="background:color-mix(in srgb, var(--accent) 66%, var(--bg-elevated))"></span><span class="heatmap__cell" style="background:var(--accent)"></span> más</div>
  </div>`;
}

function renderHeatmapDom(heatmap, heatColors, heatMax) {
  const heat = document.getElementById('heatmap');
  if (!heat) return;
  const today = startOfDay(Date.now());
  const start = addDays(today, -181);
  const offsetDow = (new Date(start).getDay() + 6) % 7;
  for (let i = 0; i < offsetDow; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'heatmap__cell';
    spacer.style.visibility = 'hidden';
    heat.appendChild(spacer);
  }
  for (let i = 0; i < 182; i++) {
    const t = addDays(start, i);
    const v = heatmap.get(t) || 0;
    const level = v === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((v / heatMax) * 4)));
    const cell = document.createElement('div');
    cell.className = 'heatmap__cell';
    cell.style.background = `color-mix(in srgb, var(--accent) ${level * 22}%, var(--bg-elevated))`;
    cell.title = `${new Date(t).toISOString().slice(0, 10)}: ${v}`;
    heat.appendChild(cell);
  }
}

function computeFilters(allEntries) {
  const f = {};
  if (currentFilter !== 'all') {
    const def = FILTERS[currentFilter];
    if (def) {
      f.from = def.from();
      f.to = def.to();
    }
  }
  if (currentYear) {
    f.year = currentYear;
    if (currentMonth !== null) f.month = currentMonth;
  }
  if (currentDevice) f.device = currentDevice;
  if (currentSourceType) f.sourceType = currentSourceType;
  return f;
}

function applyFilter(entries, f) {
  return entries.filter((e) => {
    if (f.from != null && e.at < f.from) return false;
    if (f.to != null && e.at >= f.to) return false;
    if (f.year != null) {
      const d = new Date(e.at);
      if (d.getFullYear() !== f.year) return false;
      if (f.month != null && d.getMonth() !== f.month) return false;
    }
    if (f.device && e.device !== f.device) return false;
    if (f.sourceType && e.sourceType !== f.sourceType) return false;
    return true;
  });
}

export function resetStatsFilter() {
  currentFilter = 'all';
  currentYear = null;
  currentMonth = null;
  currentDevice = '';
  currentSourceType = '';
  currentWrappedYear = null;
}

export default { renderStats };
