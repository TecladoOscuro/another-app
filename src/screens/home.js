import { getAllEntries, getSetting } from '../db.js';
import { entriesToday, totals, entriesThisMonth, yearReport, streakDays, uniqueActresses, avgDuration, hourlyDistribution } from '../services/analytics.js';
import { formatTime, formatBigNumber } from '../services/date.js';
import { escapeHtml } from '../services/html.js';
import { openRecordModal } from './record.js';

export async function renderHome(main) {
  const entries = await getAllEntries();
  const simpleMode = await getSetting('simpleMode', false);
  const today = entriesToday(entries);
  const month = entriesThisMonth(entries);
  const t = totals(entries);
  const streaks = streakDays(entries);
  const year = new Date().getFullYear();
  const report = yearReport(entries, year);

  const recent = [...entries].sort((a, b) => b.at - a.at).slice(0, 5);

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';

  main.innerHTML = `
    <div class="screen">
      <p class="muted" style="margin-top: 8px;">${greeting},</p>
      <h2>¿Otra vez?</h2>
      <p class="muted">${simpleMode ? 'Modo simple: un toque y listo.' : 'Toca el botón para registrar con detalles.'}</p>

      <div class="record-hero">
        <button class="record-btn" id="recordBtn" aria-label="Registrar ahora">
          <span class="record-btn__label">
            <small>${simpleMode ? 'Registrar' : 'Registrar'}</small>
            YA
          </span>
        </button>
      </div>

      <div class="stat-grid">
        <div class="stat-cell">
          <div class="stat-cell__label">Hoy</div>
          <div class="stat-cell__value">${today.length}</div>
          <div class="stat-cell__hint">${today.length === 1 ? 'registro' : 'registros'}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">Este mes</div>
          <div class="stat-cell__value">${month.length}</div>
          <div class="stat-cell__hint">${formatBigNumber(t.totalSeconds / 60)} min totales</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">Racha actual</div>
          <div class="stat-cell__value">${streaks.current}</div>
          <div class="stat-cell__hint">días seguidos</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">Total ${year}</div>
          <div class="stat-cell__value">${report ? report.summary.count : 0}</div>
          <div class="stat-cell__hint">${uniqueActresses(entries)} actrices únicas</div>
        </div>
      </div>

      <div class="section-head">
        <h3>Últimos registros</h3>
        <span class="muted">${recent.length}</span>
      </div>

      ${
        recent.length
          ? `<div class="list">
              ${recent
                .map(
                  (e) => `
                <div class="list-item">
                  <div class="list-item__title">
                    ${escapeHtml(e.category || 'Sin categoría')}
                    <div class="list-item__sub">
                      ${escapeHtml(e.actressName || e.site || '—')} · ${formatTime(e.at)}
                      ${e.sourceType ? ` · <span class="site-badge">${escapeHtml(e.sourceType)}</span>` : ''}
                      ${e.device ? ` · <span class="site-badge">${escapeHtml(e.device)}</span>` : ''}
                    </div>
                  </div>
                </div>`,
                )
                .join('')}
            </div>`
          : `<div class="empty">
              <div class="empty__icon">·</div>
              <div class="empty__title">Sin registros todavía</div>
              <div>Pulsa el botón rojo para empezar.</div>
            </div>`
      }

      ${
        t.count >= 3
          ? `<div class="insight-card">
              <div class="insight-card__label">Insight</div>
              <div class="insight-card__value">${mostActiveHourLabel(entries)}</div>
              <div class="insight-card__hint">Tu hora más activa. Curioso, ¿no?</div>
            </div>`
          : ''
      }
    </div>
  `;

  document.getElementById('recordBtn').addEventListener('click', () => {
    if (simpleMode) {
      openRecordModal({ simple: true });
    } else {
      openRecordModal();
    }
  });
}

function mostActiveHourLabel(entries) {
  const hours = hourlyDistribution(entries);
  const max = Math.max(...hours);
  if (max === 0) return '—';
  const h = hours.indexOf(max);
  return `${pad2(h)}:00 — ${pad2(h)}:59`;
}

function pad2(n) {
  return n.toString().padStart(2, '0');
}

export default { renderHome };
