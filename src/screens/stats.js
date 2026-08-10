import { getAllEntries, listActresses, getAllEntriesBeforeYear } from '../db.js';
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
  avgDuration,
  weeklySeries,
  ageBucket,
  heightBucket,
  weightBucket,
  rankBucket,
  sourceBucket,
  distribution,
  topActressesByScore,
} from '../services/analytics.js';
import { MONTHS_SHORT, MONTHS_ES, WEEKDAYS_ES, addDays, startOfDay, pad2 } from '../services/date.js';
import { formatDuration } from '../services/date.js';
import { escapeHtml } from '../services/html.js';

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
let expandedSections = new Set();

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
  const year = currentYear ?? today.getFullYear();
  const report = yearReport(entries, year);

  const previousYearReport = (() => {
    if (currentYear === null) return null;
    const prev = yearReport(allEntries, currentYear - 1);
    if (!prev) return null;
    return prev;
  })();

  const week = weeklySeries(entries, 12);
  const heatmap = heatmapByDay(entries, 182);
  const months = monthlySeries(entries, year);
  const hours = hourlyDistribution(entries);
  const weekdays = weekdayDistribution(entries);

  const byCategory = topN(totalsByCategories(entries), 20);
  const byActress = topN(
    totalsBy(entries, (e) => e.actressId || e.actressName || null),
    20,
  ).filter(([k]) => k);
  const bySite = topN(totalsBy(entries, (e) => e.site || null), 6).filter(([k]) => k);
  const byDevice = topN(totalsBy(entries, (e) => e.device || null), 6).filter(([k]) => k);
  const bySource = topN(totalsBy(entries, (e) => e.sourceType || null), 6).filter(([k]) => k);
  const byLubricant = topN(totalsBy(entries, (e) => e.lubricant || null), 6).filter(([k]) => k);

  const byAge = distribution(entries, actresses, ageBucket);
  const byHeight = distribution(entries, actresses, heightBucket);
  const byWeight = distribution(entries, actresses, weightBucket);
  const byRank = distribution(entries, actresses, rankBucket);
  const byRelation = distribution(entries, actresses, (a) => a?.relation);
  const byGender = distribution(entries, actresses, (a) => a?.gender);
  const byEthnicity = distribution(entries, actresses, (a) => a?.ethnicity);
  const bySourceKind = distribution(entries, actresses, sourceBucket);

  const topActresses = topActressesByScore(entries, actresses, 10);

  const heatVals = [...heatmap.values()];
  const heatMax = Math.max(1, ...heatVals);
  const heatColors = ['var(--bg-elevated)'];
  for (let i = 1; i <= 4; i++) {
    heatColors.push(`color-mix(in srgb, var(--accent) ${i * 22}%, var(--bg-elevated))`);
  }

  const actressCount = uniqueActresses(entries);

  main.innerHTML = `
    <div class="screen">
      <h2>Estadísticas</h2>
      <p class="muted">Análisis completo. Privado, en local.</p>

      ${renderWrappedHero(year, t, streaks, actressCount, byCategory.length, previousYearReport, report, actresses)}

      <div class="filter-bar">
        <div class="filter-group">
          <div class="filter-group__label">Periodo</div>
          <div class="filter-row" id="rangeChips">
            ${Object.entries(FILTERS)
              .map(
                ([k, v]) =>
                  `<button class="chip ${currentFilter === k ? 'is-active' : ''}" data-filter="${k}">${escapeHtml(v.label)}</button>`,
              )
              .join('')}
          </div>
        </div>
        ${
          years.length > 1
            ? `<div class="filter-group">
                <div class="filter-group__label">Año</div>
                <div class="filter-row" id="yearChips">
                  <button class="chip ${currentYear === null ? 'is-active' : ''}" data-year="">Auto</button>
                  ${years
                    .map(
                      (y) =>
                        `<button class="chip ${currentYear === y ? 'is-active' : ''}" data-year="${y}">${y}</button>`,
                    )
                    .join('')}
                </div>
              </div>`
            : ''
        }
        ${
          currentYear
            ? `<div class="filter-group">
                <div class="filter-group__label">Mes</div>
                <div class="filter-row" id="monthChips">
                  <button class="chip ${currentMonth === null ? 'is-active' : ''}" data-month="">Todos</button>
                  ${MONTHS_SHORT.map(
                    (m, i) =>
                      `<button class="chip ${currentMonth === i ? 'is-active' : ''}" data-month="${i}">${m}</button>`,
                  ).join('')}
                </div>
              </div>`
            : ''
        }
        ${
          devices.length
            ? `<div class="filter-group">
                <div class="filter-group__label">Dispositivo</div>
                <div class="filter-row">
                  <button class="chip ${currentDevice === '' ? 'is-active' : ''}" data-device="">Todos</button>
                  ${devices.map((d) => `<button class="chip ${currentDevice === d ? 'is-active' : ''}" data-device="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('')}
                </div>
              </div>`
            : ''
        }
        ${
          sourceTypes.length
            ? `<div class="filter-group">
                <div class="filter-group__label">Fuente</div>
                <div class="filter-row">
                  <button class="chip ${currentSourceType === '' ? 'is-active' : ''}" data-source="">Todas</button>
                  ${sourceTypes.map((s) => `<button class="chip ${currentSourceType === s ? 'is-active' : ''}" data-source="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
                </div>
              </div>`
            : ''
        }
      </div>

      ${collapsibleSection('heatmap', 'Heatmap · últimos 6 meses', `
        <div class="card">
          <div class="heatmap" id="heatmap"></div>
          <div class="heatmap__legend">
            menos
            ${[0, 1, 2, 3, 4]
              .map((i) => `<span class="heatmap__cell" style="background:${heatColors[i]}; border-color: transparent;"></span>`)
              .join('')}
            más
          </div>
        </div>
      `)}

      ${collapsibleSection('months', `Por mes · ${year}`, monthsBars(months))}

      ${collapsibleSection('hours', 'Por hora del día', hoursBars(hours))}

      ${collapsibleSection('weekdays', 'Por día de la semana', weekdayBars(weekdays))}

      ${collapsibleSection('categories', 'Top categorías', barsCard(byCategory, 5, 20), entries.length > 0)}

      ${collapsibleSection('actresses', 'Top actrices', actressesCard(topActresses, entries, actresses), entries.length > 0)}

      ${collapsibleSection('taste-age', 'Tus gustos: edad', tasteCard(byAge), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-height', 'Tus gustos: altura', tasteCard(byHeight), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-weight', 'Tus gustos: peso', tasteCard(byWeight), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-ethnicity', 'Tus gustos: etnia', tasteCard(byEthnicity), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-rank', 'Tus gustos: ranking Pornhub', tasteCard(byRank), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-relation', 'Tus gustos: relación', tasteCard(byRelation), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-gender', 'Tus gustos: género', tasteCard(byGender), hasActressData(entries, actresses))}
      ${collapsibleSection('taste-source', 'Tus datos: fuente', tasteCard(bySourceKind), hasActressData(entries, actresses))}

      ${collapsibleSection('sites', 'Sitios', barsCard(bySite, 6))}
      ${collapsibleSection('devices', 'Dispositivos', barsCard(byDevice, 6))}
      ${collapsibleSection('source', 'Tipo de fuente', barsCard(bySource, 6))}
      ${collapsibleSection('lube', 'Lubricante', barsCard(byLubricant, 6))}

      ${collapsibleSection('weeks', 'Últimas 12 semanas', weeksCard(week))}
    </div>
  `;

  bindFilters(main);
  bindCollapsibles(main);
  bindExtraToggles(main);
  renderHeatmap(heatmap, heatColors, heatMax);
}

function renderWrappedHero(year, t, streaks, actressCount, catCount, prev, report, actresses) {
  if (!t.count) return '';
  const peakHour = report?.peakHour ?? 0;
  const peakMonth = report?.peakMonth ?? 0;
  const peakWeekday = report?.peakWeekday ?? 0;
  const totalMin = Math.round((t.totalSeconds || 0) / 60);

  const cards = [];

  cards.push(wrappedCard({
    title: 'Tu año en números',
    bigNumber: String(t.count),
    sub: `Momentos registrados`,
    accent: 'pink',
  }));

  if (prev) {
    const diff = t.count - prev.summary.count;
    const pct = prev.summary.count > 0 ? Math.round((diff / prev.summary.count) * 100) : 0;
    cards.push(wrappedCard({
      title: 'vs año pasado',
      bigNumber: `${diff >= 0 ? '+' : ''}${diff}`,
      sub: `${pct >= 0 ? '+' : ''}${pct}% más`,
      accent: diff >= 0 ? 'green' : 'orange',
    }));
  }

  cards.push(wrappedCard({
    title: 'Récord',
    bigNumber: `${streaks.longest}d`,
    sub: `Racha más larga`,
    accent: 'purple',
  }));

  if (peakHour !== null && peakHour !== undefined) {
    cards.push(wrappedCard({
      title: 'Hora pico',
      bigNumber: `${pad2(peakHour)}:00`,
      sub: 'Tu momento favorito',
      accent: 'blue',
    }));
  }

  if (peakMonth !== null && peakMonth !== undefined) {
    cards.push(wrappedCard({
      title: 'Mes favorito',
      bigNumber: MONTHS_SHORT[peakMonth].toUpperCase(),
      sub: 'Donde más activo estuviste',
      accent: 'orange',
    }));
  }

  if (report?.byActress?.[0]) {
    cards.push(wrappedCard({
      title: 'Tu top',
      bigNumber: '1',
      sub: `<b>${escapeHtml(report.byActress[0][0])}</b><br>${report.byActress[0][1]} veces`,
      accent: 'pink',
    }));
  }

  cards.push(wrappedCard({
    title: 'Variedad',
    bigNumber: String(catCount),
    sub: `categorías distintas`,
    accent: 'green',
  }));

  cards.push(wrappedCard({
    title: 'Tu colección',
    bigNumber: String(actressCount),
    sub: `actrices únicas`,
    accent: 'purple',
  }));

  return `
    <div class="wrapped-hero">
      <div class="wrapped-hero__title">Wrapped ${year}</div>
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

function collapsibleSection(id, title, body, hasData = true) {
  const isOpen = expandedSections.has(id) ||
    ['heatmap', 'months', 'hours', 'weekdays', 'categories', 'actresses'].includes(id);
  if (!hasData) {
    return `
      <div class="section-head collapsible" data-section="${id}">
        <h3>${escapeHtml(title)}</h3>
        <span class="collapsible__chevron"></span>
      </div>
    `;
  }
  return `
    <div class="section-head collapsible" data-section="${id}" role="button" tabindex="0" aria-expanded="${isOpen}">
      <h3>${escapeHtml(title)}</h3>
      <span class="collapsible__chevron ${isOpen ? 'is-open' : ''}" aria-hidden="true"></span>
    </div>
    <div class="collapsible__body ${isOpen ? 'is-open' : ''}" data-body="${id}">${body}</div>
  `;
}

function monthsBars(months) {
  return `<div class="card"><div class="bars">${barsList(months, (i) => MONTHS_SHORT[i])}</div></div>`;
}

function hoursBars(hours) {
  return `<div class="card"><div class="bars">${barsList(hours, (i) => `${pad2(i)}h`)}</div></div>`;
}

function weekdayBars(weekdays) {
  return `<div class="card"><div class="bars">${barsList(weekdays, (i) => WEEKDAYS_ES[i])}</div></div>`;
}

function weeksCard(week) {
  const entries = [...week.entries()];
  return `<div class="card"><div class="bars">${entries
    .map(([k, v]) => {
      const max = Math.max(1, ...entries.map(([, x]) => x));
      const pct = Math.round((v / max) * 100);
      return `
        <div class="bar">
          <span class="bar__label">${escapeHtml(k.split('-W')[1])}</span>
          <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
          <span class="bar__value">${v}</span>
        </div>`;
    })
    .join('')}</div>
        <p class="subtle" style="margin-top: 8px;">Semanas ISO del periodo.</p></div>`;
}

function barsCard(map, limit, total) {
  if (!map || map.length === 0) {
    return `<div class="empty">Sin datos.</div>`;
  }
  const visible = map.slice(0, limit);
  const extra = map.slice(limit);
  const totalCount = total || map.length;
  let extraHtml = '';
  if (extra.length) {
    const id = `extra-${Math.random().toString(36).slice(2, 8)}`;
    extraHtml = `
      <button class="btn btn--ghost" data-toggle-extra="${id}" style="margin-top: 8px; width: 100%;">Ver ${extra.length} más de ${totalCount}</button>
      <div id="${id}" class="collapsible__body" hidden>
        <div class="bars">${barsHtml(extra)}</div>
      </div>
    `;
  }
  return `<div class="card"><div class="bars">${barsHtml(visible)}</div>${extraHtml}</div>`;
}

function actressesCard(topActresses, entries, actresses) {
  if (!topActresses.length) {
    return `<div class="empty">Sin datos.</div>`;
  }
  return `<div class="card"><div class="list">${topActresses
    .map(({ actress, count }) => {
      const name = actress?.name || '—';
      const initial = name[0] ? name[0].toUpperCase() : '?';
      const meta = [];
      if (actress?.rank) meta.push(`#${escapeHtml(actress.rank)}`);
      if (actress?.videosCount) meta.push(`${formatBigNumber(actress.videosCount)} vídeos`);
      if (actress?.subscribers) meta.push(`${formatBigNumber(actress.subscribers)} subs`);
      if (actress?.born) meta.push(escapeHtml(actress.born));
      if (actress?.height) meta.push(escapeHtml(actress.height));
      if (actress?.ethnicity) meta.push(escapeHtml(actress.ethnicity));
      return `
      <div class="actress-card">
        <div class="actress-card__avatar">${actress?.avatar ? `<img src="${escapeHtml(actress.avatar)}" alt="" loading="lazy">` : escapeHtml(initial)}</div>
        <div class="actress-card__info">
          <div class="actress-card__name">${escapeHtml(name)}</div>
          <div class="actress-card__meta">${meta.length ? meta.join(' · ') : `${count} ${count === 1 ? 'vez' : 'veces'}`}</div>
        </div>
        <div class="actress-card__count">${count}</div>
      </div>`;
    })
    .join('')}</div></div>`;
}

function tasteCard(map) {
  if (!map || map.size === 0) {
    return `<div class="empty subtle" style="padding: 16px;">Sin datos de actriz. Asegúrate de que la actriz tenga info de Pornhub (rank, vídeos, etc.).</div>`;
  }
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return `<div class="card"><div class="bars">${barsHtml(entries)}</div></div>`;
}

function barsList(arr, labelFn) {
  const max = Math.max(1, ...arr);
  return arr
    .map((v, i) => {
      const pct = Math.max(0, Math.round((v / max) * 100));
      return `
        <div class="bar">
          <span class="bar__label">${escapeHtml(labelFn(i))}</span>
          <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
          <span class="bar__value">${v}</span>
        </div>`;
    })
    .join('');
}

function barsHtml(arr) {
  if (!arr.length) return '';
  const max = Math.max(1, ...arr.map(([, v]) => v));
  return arr
    .map(([label, v]) => {
      const pct = Math.max(0, Math.round((v / max) * 100));
      return `
        <div class="bar">
          <span class="bar__label">${escapeHtml(label)}</span>
          <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
          <span class="bar__value">${v}</span>
        </div>`;
    })
    .join('');
}

function hasActressData(entries, actresses) {
  if (!entries.length) return false;
  const map = new Map(actresses.map((a) => [a.id, a]));
  for (const e of entries) {
    const a = map.get(e.actressId);
    if (a && (a.born || a.height || a.weight || a.rank || a.relation || a.gender || a.ethnicity)) {
      return true;
    }
  }
  return false;
}

function formatBigNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function bindFilters(main) {
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

function bindCollapsibles(main) {
  main.querySelectorAll('.section-head.collapsible').forEach((head) => {
    const id = head.dataset.section;
    head.addEventListener('click', () => toggleSection(id, main));
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSection(id, main);
      }
    });
  });
}

function bindExtraToggles(main) {
  main.querySelectorAll('[data-toggle-extra]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleExtra;
      const el = document.getElementById(id);
      if (!el) return;
      const willOpen = el.hidden;
      el.hidden = !willOpen;
      btn.textContent = willOpen ? 'Ocultar extras' : btn.textContent.replace('Ver', 'Ver');
    });
  });
}

function toggleSection(id, main) {
  if (expandedSections.has(id)) expandedSections.delete(id);
  else expandedSections.add(id);
  const body = main.querySelector(`[data-body="${id}"]`);
  const chev = main.querySelector(`[data-section="${id}"] .collapsible__chevron`);
  if (body) body.classList.toggle('is-open');
  if (chev) chev.classList.toggle('is-open');
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

function renderHeatmap(heatmap, heatColors, heatMax) {
  const heat = document.getElementById('heatmap');
  if (!heat) return;
  const today = startOfDay(Date.now());
  const start = addDays(today, -181);
  const offsetDow = (new Date(start).getDay() + 6) % 7;
  const pad = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
    cell.title = `${pad(new Date(t))}: ${v}`;
    heat.appendChild(cell);
  }
}

export function resetStatsFilter() {
  currentFilter = 'all';
  currentYear = null;
  currentMonth = null;
  currentDevice = '';
  currentSourceType = '';
  expandedSections = new Set();
}

export default { renderStats };
