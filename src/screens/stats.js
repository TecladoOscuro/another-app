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
import { openModal } from '../ui/modal.js';
import { getOptions } from '../services/options.js';

const FILTERS = {
  all: { label: 'Todo' },
  today: { label: 'Hoy', from: () => startOfDay(Date.now()), to: () => addDays(startOfDay(Date.now()), 1) },
  '7d': { label: '7 días', from: () => addDays(startOfDay(Date.now()), -6), to: () => addDays(startOfDay(Date.now()), 1) },
  '30d': { label: '30 días', from: () => addDays(startOfDay(Date.now()), -29), to: () => addDays(startOfDay(Date.now()), 1) },
  '3m': { label: '3 meses', from: () => addDays(startOfDay(Date.now()), -89), to: () => addDays(startOfDay(Date.now()), 1) },
  '6m': { label: '6 meses', from: () => addDays(startOfDay(Date.now()), -179), to: () => addDays(startOfDay(Date.now()), 1) },
  '1y': { label: '1 año', from: () => addDays(startOfDay(Date.now()), -364), to: () => addDays(startOfDay(Date.now()), 1) },
};

let currentFilter = 'all';
let currentYear = null;
let currentMonth = null;
let currentDevice = '';
let currentSourceType = '';
let currentHeatmapRange = 90; // días
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

  const week = weeklySeries(entries, 12, anchorsTs(entries));
  const daily30 = computeDailyBars(entries, 30);
  const heatmap = heatmapByDay(entries, currentHeatmapRange);
  const months = monthlySeries(entries, wrappedYear);
  const hours = hourlyDistribution(entries);
  const weekdays = weekdayDistribution(entries);

  const byCategory = topN(totalsByCategories(entries), 10);
  const topActresses = topActressesByScore(entries, actresses, 10);
  const bySite = topN(totalsBy(entries, (e) => e.site || null), 6).filter(([k]) => k);
  const byDevice = topN(totalsBy(entries, (e) => e.device || null), 6).filter(([k]) => k);
  const bySource = topN(totalsBy(entries, (e) => e.sourceType || null), 6).filter(([k]) => k);
  const byLubricant = topN(totalsBy(entries, (e) => e.lubricant || null), 6).filter(([k]) => k);

  const byAge = distribution(entries, actresses, ageBucket);
  const byDecade = distribution(entries, actresses, decadeBucket);
  const byEthnicity = distribution(entries, actresses, ethnicityBucket);

  const filterCount = activeFilterCount();
  const filterText = filterSummary();

  main.innerHTML = `
    <div class="screen stats-screen">
      <div class="stats-header">
        <h2>Estadísticas</h2>
        <button class="btn-icon" id="openFilters" aria-label="Filtros">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/></svg>
          ${filterCount > 0 ? `<span class="btn-icon__count">${filterCount}</span>` : ''}
        </button>
      </div>

      ${
        filterText
          ? `<button class="filter-active" id="clearFilters">
              <span class="filter-active__dot"></span>
              <span class="filter-active__text">Filtrando: <b>${escapeHtml(filterText)}</b></span>
              <span class="filter-active__clear">Limpiar</span>
            </button>`
          : ''
      }

      ${renderWrappedHero(wrappedYear, wrappedTotals, wrappedStreaks, wrappedCatCount, wrappedPrevReport, wrappedReport, allEntries)}

      ${summaryGrid(t, streaks, uniqueActresses(entries), byCategory.length)}

      ${collapsibleSection('heatmap', 'Heatmap', renderHeatmapHtml(heatmap, currentHeatmapRange), t.count > 0)}

      ${collapsibleSection('daily', 'Últimos 30 días', dailyListHtml(daily30), t.count > 0)}

      ${collapsibleSection('hours', 'Por hora del día', simpleBarsHtml(hours, (i) => `${pad2(i)}:00`), t.count > 0)}

      ${collapsibleSection('weekdays', 'Por día de la semana', simpleBarsHtml(weekdays, (i) => WEEKDAYS_ES[i]), t.count > 0)}

      ${collapsibleSection('months', `Por mes · ${wrappedYear}`, simpleBarsHtml(months, (i) => MONTHS_SHORT[i], true), t.count > 0)}

      ${collapsibleSection('actresses', 'Top actrices', actressesListHtml(topActresses, entries, actresses), t.count > 0)}

      ${collapsibleSection('categories', 'Top categorías', simpleBarsHtml(topN(byCategory, 6), (k) => k), t.count > 0)}

      <div class="stats-subsection">
        <div class="stats-subsection__title">Tus gustos</div>
        <div class="stats-subsection__sub">Calculado a partir de las actrices que ves</div>
      </div>
      ${collapsibleSection('taste-age', 'Edad', tasteDonut(byAge, 'años'), hasAgeData(entries, actresses))}
      ${collapsibleSection('taste-decade', 'Década de nacimiento', tasteDonut(byDecade, 'décadas'), hasAgeData(entries, actresses))}
      ${collapsibleSection('taste-ethnicity', 'Etnia', tasteDonut(byEthnicity, 'etnias'), hasEthnicityData(entries, actresses))}

      ${collapsibleSection('sites', 'Sitios', simpleBarsHtml(bySite, (k) => k), bySite.length > 0)}
      ${collapsibleSection('devices', 'Dispositivos', simpleBarsHtml(byDevice, (k) => k), byDevice.length > 0)}
      ${collapsibleSection('source', 'Tipo de fuente', simpleBarsHtml(bySource, (k) => k), bySource.length > 0)}
      ${collapsibleSection('lube', 'Lubricante', simpleBarsHtml(byLubricant, (k) => k), byLubricant.length > 0)}
    </div>
  `;

  bindAll(main, years, devices, sourceTypes);
  renderHeatmapDom(heatmap);
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

function summaryGrid(t, streaks, actressCount, catCount) {
  return `
    <div class="summary-grid">
      <div class="summary-cell">
        <div class="summary-cell__label">Total</div>
        <div class="summary-cell__value">${t.count}</div>
        <div class="summary-cell__hint">en este periodo</div>
      </div>
      <div class="summary-cell">
        <div class="summary-cell__label">Récord</div>
        <div class="summary-cell__value">${streaks.longest}d</div>
        <div class="summary-cell__hint">racha actual ${streaks.current}d</div>
      </div>
      <div class="summary-cell">
        <div class="summary-cell__label">Actrices</div>
        <div class="summary-cell__value">${actressCount}</div>
        <div class="summary-cell__hint">únicas</div>
      </div>
      <div class="summary-cell">
        <div class="summary-cell__label">Categorías</div>
        <div class="summary-cell__value">${catCount}</div>
        <div class="summary-cell__hint">distintas</div>
      </div>
    </div>
  `;
}

function collapsibleSection(id, title, body, hasData = true) {
  const isOpen = id === 'periodo' || id === 'hours' || id === 'actresses' || id === 'categories' || id === 'taste-age';
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
    cards.push(wrappedCard('Récord racha', `${streaks.longest}d`, 'seguidos', 'purple'));
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

function actressesListHtml(topActresses, entries, actresses) {
  if (!topActresses.length) return emptyCard('Sin actrices todavía.');
  return `<div class="card list">${topActresses
    .map(({ actress, displayName, count }, i) => {
      const name = displayName || actress?.name || '—';
      const initial = name[0] ? name[0].toUpperCase() : '?';
      const encoded = encodeURIComponent(name);
      return `
      <button class="row-item row-item--clickable" data-actress="${encoded}">
        <span class="row-item__rank">${i + 1}</span>
        <div class="row-item__avatar">${actress?.avatar ? `<img src="${escapeHtml(actress.avatar)}" alt="" loading="lazy">` : escapeHtml(initial)}</div>
        <div class="row-item__info">
          <div class="row-item__title">${escapeHtml(name)}</div>
          <div class="row-item__sub">${actress?.born ? escapeHtml(actress.born) : `${count} ${count === 1 ? 'vez' : 'veces'}`}</div>
        </div>
        <div class="row-item__value">${count}</div>
      </button>`;
    })
    .join('')}</div>`;
}

function dailyListHtml(counts) {
  const arr = [...counts.entries()].sort((a, b) => b[0] - a[0]);
  const max = Math.max(1, ...arr.map(([, v]) => v));
  if (!arr.some(([, v]) => v > 0)) return emptyCard('Sin actividad en los últimos 30 días.');
  return `<div class="card list">${arr
    .map(([ts, v]) => {
      const d = new Date(ts);
      const label = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
      const pct = Math.round((v / max) * 100);
      return `
        <div class="row-item">
          <div class="row-item__info">
            <div class="row-item__title">${escapeHtml(label)}</div>
            <div class="row-item__sub">${v > 0 ? `${v} ${v === 1 ? 'momento' : 'momentos'}` : '—'}</div>
          </div>
          <div class="row-item__bar"><span style="width:${pct}%"></span></div>
        </div>`;
    })
    .join('')}</div>`;
}

function simpleBarsHtml(arr, labelFn, isMonthIndex = false) {
  if (!arr || !arr.length) return emptyCard('Sin datos.');
  const isFlat = typeof arr[0] === 'number';
  const entries = isFlat ? arr.map((v, i) => [isMonthIndex ? i : labelFn(i), v]) : arr;
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return `<div class="card list">${entries
    .map(([key, v], i) => {
      const pct = Math.round((v / max) * 100);
      return `
        <div class="row-item">
          <div class="row-item__rank">${i + 1}</div>
          <div class="row-item__info">
            <div class="row-item__title">${escapeHtml(String(key))}</div>
          </div>
          <div class="row-item__bar"><span style="width:${pct}%"></span></div>
          <div class="row-item__value">${v}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function weekListHtml(week) {
  const entries = [...week.entries()];
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.some(([, v]) => v > 0)) return emptyCard('Sin actividad.');
  return `<div class="card list">${entries
    .map(([k, v]) => {
      const pct = Math.round((v / max) * 100);
      return `
        <div class="row-item">
          <div class="row-item__info">
            <div class="row-item__title">Semana ${escapeHtml(k.split('-W')[1])}</div>
            <div class="row-item__sub">${v} ${v === 1 ? 'momento' : 'momentos'}</div>
          </div>
          <div class="row-item__bar"><span style="width:${pct}%"></span></div>
        </div>`;
    })
    .join('')}</div>`;
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

const PALETTE = ['#ff3b6b', '#ff9f0a', '#00b894', '#0984e3', '#6c5ce7', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe', '#55efc4'];

function tasteDonut(map, label) {
  if (!map || !map.size) return emptyCard('Sin datos suficientes. Las actrices deben tener info de Pornhub (rank, vídeos, etc.).');
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  return `<div class="taste-grid">${entries
    .map(([k, v], i) => {
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      const color = PALETTE[i % PALETTE.length];
      return `
        <div class="taste-chip" style="--c:${color}">
          <div class="taste-chip__pct">${pct}%</div>
          <div class="taste-chip__label">${escapeHtml(k)}</div>
          <div class="taste-chip__count">${v} ${v === 1 ? 'vez' : 'veces'}</div>
        </div>`;
    })
    .join('')}</div>`;
}

function emptyCard(text) {
  return `<div class="card empty">${escapeHtml(text)}</div>`;
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
  return entries.length > 0;
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

function bindAll(main, years, devices, sourceTypes) {
  document.getElementById('openFilters').addEventListener('click', () => {
    openFiltersModal(main, years, devices, sourceTypes);
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
}

function openFiltersModal(main, years, devices, sourceTypes) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="filter-modal">
      <div class="filter-modal__group">
        <div class="filter-modal__label">Periodo</div>
        <div class="filter-modal__chips">
          ${Object.entries(FILTERS)
            .map(
              ([k, v]) =>
                `<button class="chip chip--lg ${currentFilter === k ? 'is-active' : ''}" data-filter="${k}">${escapeHtml(v.label)}</button>`,
            )
            .join('')}
        </div>
      </div>
      ${
        years.length
          ? `<div class="filter-modal__group">
              <div class="filter-modal__label">Año</div>
              <div class="filter-modal__chips">
                <button class="chip chip--lg ${currentYear === null ? 'is-active' : ''}" data-year="">Todos</button>
                ${years
                  .map((y) => `<button class="chip chip--lg ${currentYear === y ? 'is-active' : ''}" data-year="${y}">${y}</button>`)
                  .join('')}
              </div>
            </div>`
          : ''
      }
      ${
        currentYear
          ? `<div class="filter-modal__group">
              <div class="filter-modal__label">Mes</div>
              <div class="filter-modal__chips">
                <button class="chip chip--lg ${currentMonth === null ? 'is-active' : ''}" data-month="">Todos</button>
                ${MONTHS_SHORT.map((m, i) => `<button class="chip chip--lg ${currentMonth === i ? 'is-active' : ''}" data-month="${i}">${m}</button>`).join('')}
              </div>
            </div>`
          : ''
      }
      ${
        devices.length
          ? `<div class="filter-modal__group">
              <div class="filter-modal__label">Dispositivo</div>
              <div class="filter-modal__chips">
                <button class="chip chip--lg ${currentDevice === '' ? 'is-active' : ''}" data-device="">Todos</button>
                ${devices.map((d) => `<button class="chip chip--lg ${currentDevice === d ? 'is-active' : ''}" data-device="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('')}
              </div>
            </div>`
          : ''
      }
      ${
        sourceTypes.length
          ? `<div class="filter-modal__group">
              <div class="filter-modal__label">Fuente</div>
              <div class="filter-modal__chips">
                <button class="chip chip--lg ${currentSourceType === '' ? 'is-active' : ''}" data-source="">Todas</button>
                ${sourceTypes.map((s) => `<button class="chip chip--lg ${currentSourceType === s ? 'is-active' : ''}" data-source="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
              </div>
            </div>`
          : ''
      }
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
    refreshFilter(modal => renderStats(main));
    m.close();
  }));
  body.querySelectorAll('[data-year]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.year;
    currentYear = v ? Number(v) : null;
    currentMonth = null;
    refreshFilter();
    m.close();
  }));
  body.querySelectorAll('[data-month]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.month;
    currentMonth = v === '' ? null : Number(v);
    refreshFilter();
    m.close();
  }));
  body.querySelectorAll('[data-device]').forEach((b) => b.addEventListener('click', () => {
    currentDevice = b.dataset.device;
    refreshFilter();
    m.close();
  }));
  body.querySelectorAll('[data-source]').forEach((b) => b.addEventListener('click', () => {
    currentSourceType = b.dataset.source;
    refreshFilter();
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

  function refreshFilter() {
    renderStats(main);
  }
}

function renderHeatmapDom(heatmap) {
  const heat = document.getElementById('heatmap');
  if (!heat) return;
  const today = startOfDay(Date.now());
  const start = addDays(today, -181);
  const offsetDow = (new Date(start).getDay() + 6) % 7;
  const heatVals = [...heatmap.values()];
  const heatMax = Math.max(1, ...heatVals);
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
