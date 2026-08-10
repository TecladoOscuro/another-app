import { getAllEntries, listActresses } from '../db.js';
import {
  totals,
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
  topActressesByScore,
} from '../services/analytics.js';
import { MONTHS_SHORT, MONTHS_ES, WEEKDAYS_ES, addDays, startOfDay, pad2 } from '../services/date.js';
import { escapeHtml } from '../services/html.js';
import { openActressDetailModal } from '../ui/actressDetail.js';

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
let currentWrappedYear = null;
let expandedSections = new Set();

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

  // Wrapped: siempre global, controlado por currentWrappedYear (independiente de filtros)
  if (currentWrappedYear === null) currentWrappedYear = globalYear;
  const wrappedYear = currentWrappedYear;
  const wrappedEntries = allEntries.filter((e) => new Date(e.at).getFullYear() === wrappedYear);
  const wrappedTotals = totals(wrappedEntries);
  const wrappedStreaks = streakDays(wrappedEntries);
  const wrappedReport = yearReport(wrappedEntries, wrappedYear);
  const wrappedPrevReport = yearReport(allEntries, wrappedYear - 1);
  const wrappedByCategory = topN(totalsByCategories(wrappedEntries), 20);
  const wrappedCatCount = wrappedByCategory.length;


  const week = weeklySeries(entries, 12, anchorsTs(entries));
  const daily30 = computeDailyBars(entries, 30);
  const heatmap = heatmapByDay(entries, 182);
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
  const byDecade = distribution(entries, actresses, decadeBucket);
  const byEthnicity = distribution(entries, actresses, ethnicityBucket);

  const heatVals = [...heatmap.values()];
  const heatMax = Math.max(1, ...heatVals);
  const heatColors = ['var(--bg-elevated)'];
  for (let i = 1; i <= 4; i++) {
    heatColors.push(`color-mix(in srgb, var(--accent) ${i * 22}%, var(--bg-elevated))`);
  }

  const filterCount = activeFilterCount();
  const filterText = filterSummary();

  main.innerHTML = `
    <div class="screen">
      <div class="stats-head">
        <div>
          <h2>Estadísticas</h2>
          ${filterText ? `<div class="stats-head__filter"><span class="stats-head__filter-dot"></span>Filtrando: <b>${escapeHtml(filterText)}</b> <button class="stats-head__clear" id="clearFilters">Limpiar</button></div>` : ''}
        </div>
      </div>

      <button class="filter-pill" id="filterToggle">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/>
        </svg>
        <span>Filtros</span>
        ${filterCount > 0 ? `<span class="filter-pill__count">${filterCount}</span>` : ''}
      </button>

      <div class="filter-drawer" id="filterDrawer" hidden>
        <div class="filter-section">
          <div class="filter-section__label">Periodo</div>
          <div class="filter-chips" id="rangeChips">
            ${Object.entries(FILTERS)
              .map(
                ([k, v]) =>
                  `<button class="chip chip--sm ${currentFilter === k ? 'is-active' : ''}" data-filter="${k}">${escapeHtml(v.label)}</button>`,
              )
              .join('')}
          </div>
        </div>
        ${
          years.length
            ? `<div class="filter-section">
                <div class="filter-section__label">Año</div>
                <div class="filter-chips" id="yearChips">
                  <button class="chip chip--sm ${currentYear === null ? 'is-active' : ''}" data-year="">Todos</button>
                  ${years
                    .map((y) => `<button class="chip chip--sm ${currentYear === y ? 'is-active' : ''}" data-year="${y}">${y}</button>`)
                    .join('')}
                </div>
              </div>`
            : ''
        }
        ${
          currentYear
            ? `<div class="filter-section">
                <div class="filter-section__label">Mes</div>
                <div class="filter-chips" id="monthChips">
                  <button class="chip chip--sm ${currentMonth === null ? 'is-active' : ''}" data-month="">Todos</button>
                  ${MONTHS_SHORT.map((m, i) => `<button class="chip chip--sm ${currentMonth === i ? 'is-active' : ''}" data-month="${i}">${m}</button>`).join('')}
                </div>
              </div>`
            : ''
        }
        ${
          devices.length
            ? `<div class="filter-section">
                <div class="filter-section__label">Dispositivo</div>
                <div class="filter-chips">
                  <button class="chip chip--sm ${currentDevice === '' ? 'is-active' : ''}" data-device="">Todos</button>
                  ${devices.map((d) => `<button class="chip chip--sm ${currentDevice === d ? 'is-active' : ''}" data-device="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('')}
                </div>
              </div>`
            : ''
        }
        ${
          sourceTypes.length
            ? `<div class="filter-section">
                <div class="filter-section__label">Fuente</div>
                <div class="filter-chips">
                  <button class="chip chip--sm ${currentSourceType === '' ? 'is-active' : ''}" data-source="">Todas</button>
                  ${sourceTypes.map((s) => `<button class="chip chip--sm ${currentSourceType === s ? 'is-active' : ''}" data-source="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
                </div>
              </div>`
            : ''
        }
      </div>

      ${renderWrappedHero(wrappedYear, wrappedTotals, wrappedStreaks, wrappedCatCount, wrappedPrevReport, wrappedReport, allEntries, wrappedEntries)}

      ${statsSection('periodo', `Actividad · ${wrappedYear}`, `
        ${statBlock('Total', t.count, `${formatDuration(t.totalSeconds)} en total`)}
        ${statBlock('Racha', `${streaks.longest}d`, `actual ${streaks.current}d`)}
        ${statBlock('Actrices', uniqueActresses(entries), 'únicas')}
        ${statBlock('Categorías', byCategory.length, 'distintas')}
      `, t.count > 0)}

      ${statsSection('heatmap', 'Heatmap · 6 meses', renderHeatmapHtml(heatmap, heatColors, heatMax), t.count > 0)}

      ${statsSection('daily', 'Últimos 30 días', dailyBarsHtml(daily30), t.count > 0)}

      ${statsSection('hours', 'Por hora', donutBarsHtml(hours, (i) => `${pad2(i)}h`), t.count > 0)}

      ${statsSection('weekdays', 'Por día de la semana', donutBarsHtml(weekdays, (i) => WEEKDAYS_ES[i]), t.count > 0)}

      ${statsSection('weeks', 'Últimas 12 semanas', weekBarsHtml(week), t.count > 0)}

      ${statsSection('months', `Por mes · ${wrappedYear}`, monthBarsHtml(months), t.count > 0)}

      ${statsSection('actresses', 'Top actrices', actressesCard(topActresses, entries, actresses), t.count > 0)}

      ${statsSection('categories', 'Top categorías', categoryBarsHtml(byCategory), t.count > 0)}

      <div class="stats-subsection">
        <h3 class="stats-subsection__title">Tus gustos</h3>
        <p class="stats-subsection__sub">Calculado a partir de las actrices que ves</p>
      </div>
      ${statsSection('taste-age', 'Edad', tasteDonut(byAge, 'años'), hasAgeData(entries, actresses))}
      ${statsSection('taste-decade', 'Década de nacimiento', tasteDonut(byDecade, 'décadas'), hasAgeData(entries, actresses))}
      ${statsSection('taste-ethnicity', 'Etnia', tasteDonut(byEthnicity, 'etnias'), hasEthnicityData(entries, actresses))}

      ${statsSection('sites', 'Sitios', simpleBars(bySite), entries.length > 0)}
      ${statsSection('devices', 'Dispositivos', simpleBars(byDevice), entries.length > 0)}
      ${statsSection('source', 'Tipo de fuente', simpleBars(bySource), entries.length > 0)}
      ${statsSection('lube', 'Lubricante', simpleBars(byLubricant), entries.length > 0)}
    </div>
  `;

  bindFilters(main);
  bindSections(main);
  bindActressClicks(main, entries);
  bindWrappedNav(main);
  renderHeatmapDom(heatmap, heatColors, heatMax);
}

function bindWrappedNav(main) {
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
}

function anchorsTs(entries) {
  if (!entries.length) return Date.now();
  const sorted = [...entries].sort((a, b) => b.at - a.at);
  return sorted[0].at;
}

function computeDailyBars(entries, days) {
  const today = startOfDay(Date.now());
  const start = addDays(today, -(days - 1));
  const counts = new Map();
  for (let t = start; t <= today; t = addDays(t, 1)) {
    counts.set(t, 0);
  }
  for (const e of entries) {
    const d = startOfDay(e.at);
    if (counts.has(d)) counts.set(d, counts.get(d) + 1);
  }
  return counts;
}

function statsSection(id, title, body, hasData = true) {
  const isOpen = expandedSections.has(id) || ['periodo', 'heatmap', 'hours', 'actresses', 'categories', 'taste-age'].includes(id);
  if (!hasData) {
    return `
      <div class="stats-section" data-section="${id}">
        <button class="stats-section__head" data-toggle="${id}" aria-expanded="false">
          <span class="stats-section__title">${escapeHtml(title)}</span>
          <span class="stats-section__chev"></span>
        </button>
      </div>
    `;
  }
  return `
    <div class="stats-section" data-section="${id}">
      <button class="stats-section__head" data-toggle="${id}" aria-expanded="${isOpen}">
        <span class="stats-section__title">${escapeHtml(title)}</span>
        <span class="stats-section__chev ${isOpen ? 'is-open' : ''}"></span>
      </button>
      <div class="stats-section__body ${isOpen ? 'is-open' : ''}" data-body="${id}">${body}</div>
    </div>
  `;
}

function renderWrappedHero(year, t, streaks, catCount, prev, report, allEntries, wrappedEntries) {
  const cards = [];

  if (t.count) {
    const peakHour = report?.peakHour ?? 0;
    const peakMonth = report?.peakMonth ?? 0;

    cards.push(wrappedCard({
      title: 'Tu año',
      bigNumber: String(t.count),
      sub: 'momentos',
      accent: 'pink',
    }));

    if (prev && prev.summary.count) {
      const diff = t.count - prev.summary.count;
      const pct = Math.round((diff / prev.summary.count) * 100);
      cards.push(wrappedCard({
        title: 'vs ' + (year - 1),
        bigNumber: `${diff >= 0 ? '+' : ''}${diff}`,
        sub: `${pct >= 0 ? '+' : ''}${pct}%`,
        accent: diff >= 0 ? 'green' : 'orange',
      }));
    }

    cards.push(wrappedCard({
      title: 'Récord racha',
      bigNumber: `${streaks.longest}d`,
      sub: 'seguidos',
      accent: 'purple',
    }));

    cards.push(wrappedCard({
      title: 'Hora pico',
      bigNumber: `${pad2(peakHour)}:00`,
      sub: MONTHS_SHORT[peakMonth] || '',
      accent: 'blue',
    }));

    if (report?.byActress?.[0]) {
      cards.push(wrappedCard({
        title: 'Tu top',
        bigNumber: '★',
        sub: `<b>${escapeHtml(report.byActress[0][0])}</b><br>${report.byActress[0][1]} veces`,
        accent: 'pink',
      }));
    }

    cards.push(wrappedCard({
      title: 'Variedad',
      bigNumber: String(catCount),
      sub: 'categorías',
      accent: 'green',
    }));
  } else {
    cards.push(`<div class="wrapped-empty">Sin datos en ${year}.</div>`);
  }

  const availableYears = [...new Set(allEntries.map((e) => new Date(e.at).getFullYear()))].sort((a, b) => b - a);
  const idx = availableYears.indexOf(year);
  const prevYear = idx >= 0 && idx < availableYears.length - 1 ? availableYears[idx + 1] : null;
  const nextYear = idx > 0 ? availableYears[idx - 1] : null;

  return `
    <div class="wrapped-hero">
      <div class="wrapped-hero__nav">
        <button class="wrapped-hero__arrow" data-wrapped-nav="${prevYear ?? ''}" ${prevYear ? '' : 'disabled'}>‹</button>
        <div class="wrapped-hero__title">
          <span>Wrapped</span>
          <strong>${year}</strong>
        </div>
        <button class="wrapped-hero__arrow" data-wrapped-nav="${nextYear ?? ''}" ${nextYear ? '' : 'disabled'}>›</button>
      </div>
      <button class="wrapped-hero__global" id="wrappedGlobal">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/></svg>
        Ver global (todos los años)
      </button>
      <div class="wrapped-hero__grid">
        ${cards.join('')}
      </div>
    </div>
  `;
}

function wrappedCard({ title, bigNumber, sub, accent }) {
  return `
    <div class="wrapped-card wrapped-card--${escapeHtml(accent)}">
      <div class="wrapped-card__title">${escapeHtml(title)}</div>
      <div class="wrapped-card__big">${bigNumber}</div>
      <div class="wrapped-card__sub">${sub}</div>
    </div>
  `;
}

function statBlock(label, value, hint) {
  return `
    <div class="stat-block">
      <div class="stat-block__label">${escapeHtml(label)}</div>
      <div class="stat-block__value">${value}</div>
      <div class="stat-block__hint">${hint}</div>
    </div>
  `;
}

function actressesCard(topActresses, entries, actresses) {
  if (!topActresses.length) return `<div class="empty">Sin datos.</div>`;
  return `<div class="card actress-list">${topActresses
    .map(({ actress, displayName, count }, i) => {
      const name = displayName || actress?.name || '—';
      const initial = name[0] ? name[0].toUpperCase() : '?';
      const encoded = encodeURIComponent(name);
      return `
      <button class="actress-row" data-actress="${encoded}">
        <span class="actress-row__rank">${i + 1}</span>
        <div class="actress-row__avatar">${actress?.avatar ? `<img src="${escapeHtml(actress.avatar)}" alt="" loading="lazy">` : escapeHtml(initial)}</div>
        <div class="actress-row__info">
          <div class="actress-row__name">${escapeHtml(name)}</div>
          <div class="actress-row__meta">${actress?.born ? escapeHtml(actress.born) : `${count} ${count === 1 ? 'vez' : 'veces'}`}</div>
        </div>
        <div class="actress-row__count">${count}</div>
      </button>`;
    })
    .join('')}</div>`;
}

function categoryBarsHtml(byCategory) {
  if (!byCategory.length) return `<div class="empty">Sin datos.</div>`;
  const total = byCategory.reduce((a, [, v]) => a + v, 0);
  return `<div class="card stat-list">${byCategory
    .slice(0, 6)
    .map(([label, v]) => {
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return `
        <div class="stat-list__row">
          <div class="stat-list__label">${escapeHtml(label)}</div>
          <div class="stat-list__bar"><span style="width:${pct}%"></span></div>
          <div class="stat-list__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function simpleBars(arr) {
  if (!arr.length) return `<div class="empty">Sin datos.</div>`;
  const total = arr.reduce((a, [, v]) => a + v, 0);
  return `<div class="card stat-list">${arr
    .map(([label, v]) => {
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return `
        <div class="stat-list__row">
          <div class="stat-list__label">${escapeHtml(label)}</div>
          <div class="stat-list__bar"><span style="width:${pct}%"></span></div>
          <div class="stat-list__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function donutBarsHtml(arr, labelFn) {
  if (!arr.every((v) => typeof v === 'number')) return simpleBars(arr.map((v, i) => [labelFn(i), v]));
  const max = Math.max(1, ...arr);
  return `<div class="card stat-list">${arr
    .map((v, i) => {
      const pct = Math.round((v / max) * 100);
      return `
        <div class="stat-list__row">
          <div class="stat-list__label">${escapeHtml(labelFn(i))}</div>
          <div class="stat-list__bar"><span style="width:${pct}%"></span></div>
          <div class="stat-list__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function dailyBarsHtml(counts) {
  const arr = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  const max = Math.max(1, ...arr.map(([, v]) => v));
  return `<div class="card stat-list stat-list--days">${arr
    .map(([ts, v]) => {
      const d = new Date(ts);
      const label = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
      const pct = Math.round((v / max) * 100);
      return `
        <div class="stat-list__row">
          <div class="stat-list__label">${escapeHtml(label)}</div>
          <div class="stat-list__bar"><span style="width:${pct}%"></span></div>
          <div class="stat-list__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function weekBarsHtml(week) {
  const entries = [...week.entries()];
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return `<div class="card stat-list">${entries
    .map(([k, v]) => {
      const pct = Math.round((v / max) * 100);
      return `
        <div class="stat-list__row">
          <div class="stat-list__label">${escapeHtml(k.split('-W')[1])}</div>
          <div class="stat-list__bar"><span style="width:${pct}%"></span></div>
          <div class="stat-list__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function monthBarsHtml(months) {
  const max = Math.max(1, ...months);
  return `<div class="card stat-list">${months
    .map((v, i) => {
      const pct = Math.round((v / max) * 100);
      return `
        <div class="stat-list__row">
          <div class="stat-list__label">${MONTHS_SHORT[i]}</div>
          <div class="stat-list__bar"><span style="width:${pct}%"></span></div>
          <div class="stat-list__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function renderHeatmapHtml(heatmap, heatColors, heatMax) {
  return `<div class="card"><div class="heatmap" id="heatmap"></div>
    <div class="heatmap__legend">menos ${[0, 1, 2, 3, 4]
      .map((i) => `<span class="heatmap__cell" style="background:${heatColors[i]}; border-color: transparent;"></span>`)
      .join('')} más</div></div>`;
}

const DONUT_PALETTE = ['#ff3b6b', '#ff9f0a', '#00b894', '#0984e3', '#6c5ce7', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe', '#55efc4'];

function tasteDonut(map) {
  if (!map || !map.size) {
    return `<div class="empty subtle" style="padding: 20px;">Sin datos suficientes.</div>`;
  }
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  return `<div class="card stat-list">${entries
    .map(([label, v], i) => {
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
      return `
        <div class="stat-list__row">
          <div class="stat-list__dot" style="background:${color}"></div>
          <div class="stat-list__label">${escapeHtml(label)}</div>
          <div class="stat-list__bar"><span style="width:${pct}%; background:${color}"></span></div>
          <div class="stat-list__value">${v} <span class="muted" style="font-size: 11px;">${pct}%</span></div>
        </div>`;
    })
    .join('')}</div>`;
}

function formatDuration(s) {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m % 60}m`;
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
  return true; // ethnicity comes from name heuristics too
}

function distribution(entries, actresses, compute) {
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

function topN(map, limit) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function bindFilters(main) {
  document.getElementById('filterToggle').addEventListener('click', () => {
    const drawer = document.getElementById('filterDrawer');
    drawer.hidden = !drawer.hidden;
  });
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    currentFilter = 'all';
    currentYear = null;
    currentMonth = null;
    currentDevice = '';
    currentSourceType = '';
    renderStats(main);
  });
  main.querySelectorAll('#rangeChips [data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      renderStats(main);
    });
  });
  main.querySelectorAll('#yearChips [data-year]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.year;
      currentYear = v ? Number(v) : null;
      currentMonth = null;
      renderStats(main);
    });
  });
  main.querySelectorAll('#monthChips [data-month]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.month;
      currentMonth = v === '' ? null : Number(v);
      renderStats(main);
    });
  });
  main.querySelectorAll('[data-device]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentDevice = btn.dataset.device;
      renderStats(main);
    });
  });
  main.querySelectorAll('[data-source]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSourceType = btn.dataset.source;
      renderStats(main);
    });
  });
}

function bindSections(main) {
  main.querySelectorAll('.stats-section__head').forEach((head) => {
    head.addEventListener('click', () => {
      const id = head.dataset.toggle;
      const body = main.querySelector(`[data-body="${id}"]`);
      const chev = head.querySelector('.stats-section__chev');
      if (!body) return;
      const isOpen = body.classList.toggle('is-open');
      if (chev) chev.classList.toggle('is-open', isOpen);
      head.setAttribute('aria-expanded', isOpen);
      if (isOpen) expandedSections.add(id);
      else expandedSections.delete(id);
    });
  });
}

function bindActressClicks(main, entries) {
  main.querySelectorAll('[data-actress]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.dataset.actress);
      openActressDetailModal(name, entries);
    });
  });
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
    cell.style.background = heatColors[level];
    cell.style.borderColor = 'transparent';
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
    if (currentMonth !== null) {
      f.month = currentMonth;
    }
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
  expandedSections = new Set();
}

export default { renderStats };
