import { getAllEntries, listActresses } from '../db.js';
import {
  totals,
  topN,
  totalsBy,
  monthlySeries,
  hourlyDistribution,
  weekdayDistribution,
  heatmapByDay,
  streakDays,
  yearReport,
  uniqueActresses,
  avgDuration,
  weeklySeries,
} from '../services/analytics.js';
import { MONTHS_SHORT, MONTHS_ES, WEEKDAYS_ES, addDays, startOfDay, pad2 } from '../services/date.js';
import { formatDuration } from '../services/date.js';
import { escapeHtml } from '../services/html.js';

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
  const avg = avgDuration(entries);
  const today = new Date();
  const year = currentYear ?? today.getFullYear();
  const report = yearReport(entries, year);

  const week = weeklySeries(entries, 12);
  const heatmap = heatmapByDay(entries, 182);
  const months = monthlySeries(entries, year);
  const hours = hourlyDistribution(entries);
  const weekdays = weekdayDistribution(entries);

  const byCategory = topN(totalsBy(entries, (e) => e.category || 'Sin categoría'), 10);
  const byActress = topN(
    totalsBy(entries, (e) => e.actressId || e.actressName || '—'),
    10,
  );
  const bySite = topN(totalsBy(entries, (e) => e.site || '—'), 6);
  const byDevice = topN(totalsBy(entries, (e) => e.device || '—'), 6);
  const bySource = topN(totalsBy(entries, (e) => e.sourceType || '—'), 6);
  const byLubricant = topN(totalsBy(entries, (e) => e.lubricant || '—'), 6);

  const heatVals = [...heatmap.values()];
  const heatMax = Math.max(1, ...heatVals);

  const heatColors = ['var(--bg-card)'];
  for (let i = 1; i <= 4; i++) {
    heatColors.push(`color-mix(in srgb, var(--accent) ${i * 22}%, var(--bg-card))`);
  }

  main.innerHTML = `
    <div class="screen">
      <h2>Estadísticas</h2>
      <p class="muted">Análisis completo. Privado, en local.</p>

      <div class="filter-bar">
        <div class="filter-row" id="rangeChips">
          ${Object.entries(FILTERS)
            .map(
              ([k, v]) =>
                `<button class="chip ${currentFilter === k ? 'is-active' : ''}" data-filter="${k}">${v.label}</button>`,
            )
            .join('')}
        </div>
        <div class="filter-row" id="yearChips">
          <button class="chip ${currentYear === null ? 'is-active' : ''}" data-year="">Año auto</button>
          ${years
            .map(
              (y) =>
                `<button class="chip ${currentYear === y ? 'is-active' : ''}" data-year="${y}">${y}</button>`,
            )
            .join('')}
        </div>
        ${
          currentYear
            ? `<div class="filter-row" id="monthChips">
                <button class="chip ${currentMonth === null ? 'is-active' : ''}" data-month="">Mes completo</button>
                ${MONTHS_SHORT.map(
                  (m, i) =>
                    `<button class="chip ${currentMonth === i ? 'is-active' : ''}" data-month="${i}">${m}</button>`,
                ).join('')}
              </div>`
            : ''
        }
        ${
          devices.length
            ? `<div class="filter-row">
                <span class="muted" style="font-size: 12px; align-self: center;">Dispositivo:</span>
                <button class="chip ${currentDevice === '' ? 'is-active' : ''}" data-device="">Todos</button>
                ${devices.map((d) => `<button class="chip ${currentDevice === d ? 'is-active' : ''}" data-device="${escapeAttr(d)}">${escapeHtml(d)}</button>`).join('')}
              </div>`
            : ''
        }
        ${
          sourceTypes.length
            ? `<div class="filter-row">
                <span class="muted" style="font-size: 12px; align-self: center;">Fuente:</span>
                <button class="chip ${currentSourceType === '' ? 'is-active' : ''}" data-source="">Todas</button>
                ${sourceTypes.map((s) => `<button class="chip ${currentSourceType === s ? 'is-active' : ''}" data-source="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}
              </div>`
            : ''
        }
      </div>

      <div class="stat-grid">
        <div class="stat-cell">
          <div class="stat-cell__label">Total periodo</div>
          <div class="stat-cell__value">${t.count}</div>
          <div class="stat-cell__hint">${formatDuration(t.totalSeconds)} en total</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">Media duración</div>
          <div class="stat-cell__value">${avg ? formatDuration(avg) : '—'}</div>
          <div class="stat-cell__hint">por sesión</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">Racha</div>
          <div class="stat-cell__value">${streaks.longest}</div>
          <div class="stat-cell__hint">máx. ${streaks.current} actual</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">Actrices únicas</div>
          <div class="stat-cell__value">${uniqueActresses(entries)}</div>
          <div class="stat-cell__hint">en este filtro</div>
        </div>
      </div>

      ${
        report
          ? `
        <div class="insight-card" style="margin-top: 16px;">
          <div class="insight-card__label">Wrapped ${year}</div>
          <div class="insight-card__value">${report.summary.count} registros</div>
          <div class="insight-card__hint">
            ${report.byCategory[0] ? `Top categoría: <b>${escapeHtml(report.byCategory[0][0])}</b>` : ''}
            ${report.byActress[0] ? ` · Top actriz: <b>${escapeHtml(report.byActress[0][0])}</b>` : ''}
          </div>
        </div>
      `
          : ''
      }

      <div class="section-head">
        <h3>Heatmap · últimos 6 meses</h3>
      </div>
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

      <div class="section-head">
        <h3>Por mes · ${year}</h3>
      </div>
      <div class="card">
        <div class="bars">
          ${months
            .map((v, i) => {
              const max = Math.max(1, ...months);
              const pct = Math.round((v / max) * 100);
              return `
            <div class="bar">
              <span class="bar__label">${MONTHS_SHORT[i]}</span>
              <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
              <span class="bar__value">${v}</span>
            </div>`;
            })
            .join('')}
        </div>
      </div>

      <div class="section-head">
        <h3>Por hora del día</h3>
      </div>
      <div class="card">
        <div class="bars">
          ${hours
            .map((v, i) => {
              const max = Math.max(1, ...hours);
              const pct = Math.round((v / max) * 100);
              return `
            <div class="bar">
              <span class="bar__label">${pad2(i)}h</span>
              <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
              <span class="bar__value">${v}</span>
            </div>`;
            })
            .join('')}
        </div>
      </div>

      <div class="section-head">
        <h3>Por día de la semana</h3>
      </div>
      <div class="card">
        <div class="bars">
          ${weekdays
            .map((v, i) => {
              const max = Math.max(1, ...weekdays);
              const pct = Math.round((v / max) * 100);
              return `
            <div class="bar">
              <span class="bar__label">${WEEKDAYS_ES[i]}</span>
              <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
              <span class="bar__value">${v}</span>
            </div>`;
            })
            .join('')}
        </div>
      </div>

      <div class="section-head">
        <h3>Top categorías</h3>
      </div>
      ${
        byCategory.length
          ? `<div class="card"><div class="bars">${barsHtml(byCategory)}</div></div>`
          : `<div class="empty">Sin datos.</div>`
      }

      <div class="section-head">
        <h3>Top actrices</h3>
      </div>
      ${
        byActress.length
          ? `<div class="card">
              <div class="list">
                ${byActress
                  .map(([id, count]) => {
                    const a = actresses.find((x) => x.id === id || x.name === id);
                    const name = a ? a.name : id;
                    const initial = name[0] ? name[0].toUpperCase() : '?';
                    return `
                  <div class="actress-card">
                    <div class="actress-card__avatar">${a && a.avatar ? `<img src="${a.avatar}" alt="" loading="lazy">` : escapeHtml(initial)}</div>
                    <div class="actress-card__info">
                      <div class="actress-card__name">${escapeHtml(name)}</div>
                      <div class="actress-card__meta">${count} ${count === 1 ? 'vez' : 'veces'}</div>
                    </div>
                  </div>`;
                  })
                  .join('')}
              </div>
            </div>`
          : `<div class="empty">Sin datos.</div>`
      }

      <div class="section-head">
        <h3>Sitios / fuentes</h3>
      </div>
      ${
        bySite.length
          ? `<div class="card"><div class="bars">${barsHtml(bySite)}</div></div>`
          : `<div class="empty">Sin datos.</div>`
      }

      <div class="section-head">
        <h3>Dispositivos</h3>
      </div>
      ${
        byDevice.length
          ? `<div class="card"><div class="bars">${barsHtml(byDevice)}</div></div>`
          : `<div class="empty">Sin datos.</div>`
      }

      <div class="section-head">
        <h3>Tipo de fuente</h3>
      </div>
      ${
        bySource.length
          ? `<div class="card"><div class="bars">${barsHtml(bySource)}</div></div>`
          : `<div class="empty">Sin datos.</div>`
      }

      <div class="section-head">
        <h3>Lubricante</h3>
      </div>
      ${
        byLubricant.length
          ? `<div class="card"><div class="bars">${barsHtml(byLubricant)}</div></div>`
          : `<div class="empty">Sin datos.</div>`
      }

      <div class="section-head">
        <h3>Últimas 12 semanas</h3>
      </div>
      <div class="card">
        <div class="bars">
          ${[...week.entries()]
            .map(([k, v]) => {
              const max = Math.max(1, ...[...week.values()]);
              const pct = Math.round((v / max) * 100);
              return `
            <div class="bar">
              <span class="bar__label">${k.split('-W')[1]}</span>
              <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
              <span class="bar__value">${v}</span>
            </div>`;
            })
            .join('')}
        </div>
        <p class="subtle" style="margin-top: 8px;">Semanas ISO del periodo.</p>
      </div>

      <div class="card" style="margin-top: 16px;">
        <h3>Wrapped ${year}</h3>
        ${
          report
            ? `<p>Tu mes más activo: <b>${MONTHS_ES[report.peakMonth]}</b>.</p>
               <p>Tu día de la semana preferido: <b>${WEEKDAYS_ES[report.peakWeekday]}</b>.</p>
               <p>Tu hora pico: <b>${pad2(report.peakHour)}:00</b>.</p>
               ${
                 report.byActress[0]
                   ? `<p>Actriz del año: <b>${escapeHtml(report.byActress[0][0])}</b> con ${report.byActress[0][1]} registros.</p>`
                   : ''
               }
               <p class="muted">Datos del periodo filtrado.</p>`
            : `<p class="muted">Aún no hay datos en este periodo.</p>`
        }
      </div>
    </div>
  `;

  bindFilters(main);

  const heat = document.getElementById('heatmap');
  if (heat) {
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
      const level = v === 0 ? 0 : Math.min(4, Math.ceil((v / heatMax) * 4));
      const cell = document.createElement('div');
      cell.className = 'heatmap__cell';
      cell.style.background = heatColors[level];
      cell.style.borderColor = 'transparent';
      cell.title = `${pad(new Date(t))}: ${v}`;
      heat.appendChild(cell);
    }
  }
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

function barsHtml(arr) {
  const max = Math.max(1, ...arr.map(([, v]) => v));
  return arr
    .map(([label, v]) => {
      const pct = Math.round((v / max) * 100);
      return `
        <div class="bar">
          <span class="bar__label">${escapeHtml(label)}</span>
          <span class="bar__track"><span class="bar__fill" style="width: ${pct}%"></span></span>
          <span class="bar__value">${v}</span>
        </div>`;
    })
    .join('');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

export function resetStatsFilter() {
  currentFilter = 'all';
  currentYear = null;
  currentMonth = null;
  currentDevice = '';
  currentSourceType = '';
}

export default { renderStats };
