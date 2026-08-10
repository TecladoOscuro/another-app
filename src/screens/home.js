import { getAllEntries, getSetting } from '../db.js';
import {
  entriesToday,
  totals,
  entriesThisMonth,
  streakDays,
  uniqueActresses,
  hourlyDistribution,
  weekdayDistribution,
  monthlySeries,
  yearReport,
} from '../services/analytics.js';
import { formatTime, formatBigNumber, MONTHS_ES, MONTHS_SHORT, WEEKDAYS_ES, pad2 } from '../services/date.js';
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
  const hours = hourlyDistribution(entries);
  const weekdays = weekdayDistribution(entries);
  const months = monthlySeries(entries, year);

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';

  const todayCount = today.length;
  const monthCount = month.length;
  const peakHour = hours.indexOf(Math.max(...hours));
  const peakHourCount = Math.max(...hours);
  const peakWeekday = weekdays.indexOf(Math.max(...weekdays));
  const peakMonth = months.indexOf(Math.max(...months));
  const peakWeekdayCount = Math.max(...weekdays);
  const peakMonthCount = Math.max(...months);

  const totalMin = Math.round(t.totalSeconds / 60);
  const actressCount = uniqueActresses(entries);
  const longestStreak = streaks.longest;

  const insight = pickInsight(entries, hours, weekdays, todayCount, monthCount, streaks, t);

  main.innerHTML = `
    <div class="screen home-screen">
      <p class="muted" style="margin-top: 8px;">${escapeHtml(greeting)},</p>
      <h2>¿Otra vez?</h2>
      <p class="muted">${simpleMode ? 'Modo simple: un toque y listo.' : 'Toca el botón para registrar con detalles.'}</p>

      <div class="record-hero">
        <button class="record-btn" id="recordBtn" aria-label="Registrar ahora">
          <span class="record-btn__label">
            <small>Registrar</small>
            YA
          </span>
        </button>
      </div>

      <div class="home-stats">
        <div class="home-stat home-stat--pink">
          <div class="home-stat__label">Hoy</div>
          <div class="home-stat__value">${todayCount}</div>
          <div class="home-stat__hint">${todayCount === 1 ? 'registro' : 'registros'}</div>
        </div>
        <div class="home-stat home-stat--blue">
          <div class="home-stat__label">Este mes</div>
          <div class="home-stat__value">${monthCount}</div>
          <div class="home-stat__hint">${formatBigNumber(totalMin)} min totales</div>
        </div>
        <div class="home-stat home-stat--purple">
          <div class="home-stat__label">Racha</div>
          <div class="home-stat__value">${streaks.current}<small>d</small></div>
          <div class="home-stat__hint">máx. ${longestStreak}d seguidos</div>
        </div>
        <div class="home-stat home-stat--green">
          <div class="home-stat__label">Actrices</div>
          <div class="home-stat__value">${actressCount}</div>
          <div class="home-stat__hint">únicas en tu colección</div>
        </div>
      </div>

      ${
        t.count >= 3
          ? `<div class="insight-card insight-card--${insight.color}">
              <div class="insight-card__label">Dato curioso</div>
              <div class="insight-card__value">${insight.title}</div>
              <div class="insight-card__hint">${insight.sub}</div>
            </div>`
          : ''
      }

      ${
        t.count >= 1
          ? `<div class="section-head"><h3>Tus patrones</h3></div>
            <div class="home-patterns">
              <div class="home-pattern">
                <div class="home-pattern__icon">⏰</div>
                <div class="home-pattern__info">
                  <div class="home-pattern__label">Hora favorita</div>
                  <div class="home-pattern__value">${pad2(peakHour)}:00 — ${pad2(peakHour)}:59</div>
                  <div class="home-pattern__sub">${peakHourCount} ${peakHourCount === 1 ? 'vez' : 'veces'}</div>
                </div>
              </div>
              <div class="home-pattern">
                <div class="home-pattern__icon">📅</div>
                <div class="home-pattern__info">
                  <div class="home-pattern__label">Día favorito</div>
                  <div class="home-pattern__value">${WEEKDAYS_ES[peakWeekday]}</div>
                  <div class="home-pattern__sub">${peakWeekdayCount} ${peakWeekdayCount === 1 ? 'vez' : 'veces'}</div>
                </div>
              </div>
              <div class="home-pattern">
                <div class="home-pattern__icon">🗓</div>
                <div class="home-pattern__info">
                  <div class="home-pattern__label">Mes favorito</div>
                  <div class="home-pattern__value">${MONTHS_SHORT[peakMonth]}</div>
                  <div class="home-pattern__sub">${peakMonthCount} ${peakMonthCount === 1 ? 'vez' : 'veces'}</div>
                </div>
              </div>
            </div>`
          : ''
      }

      <div class="section-head">
        <h3>Últimos registros</h3>
        <span class="muted">${recent.length}</span>
      </div>

      ${
        recent.length
          ? `<div class="list">${recent
              .map(
                (e) => `
            <div class="list-item">
              <div class="list-item__title">
                ${escapeHtml((e.categories && e.categories[0]) || e.category || 'Sin categoría')}
                <div class="list-item__sub">
                  ${escapeHtml(e.actressName || e.site || '—')} · ${formatTime(e.at)}
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

function pickInsight(entries, hours, weekdays, todayCount, monthCount, streaks, totals) {
  const peakHour = hours.indexOf(Math.max(...hours));
  const peakHourCount = Math.max(...hours);

  if (peakHour >= 0 && peakHour <= 5) {
    return {
      title: `${pad2(peakHour)}:00 — ${pad2(peakHour)}:59`,
      sub: `Tu hora más activa. Curioso, ¿no? Normal dormir a esas horas.`,
      color: 'purple',
    };
  }
  if (peakHour >= 13 && peakHour <= 15) {
    return {
      title: 'Tarde',
      sub: `La siesta más entretenida del día. ${peakHourCount} veces ahí.`,
      color: 'orange',
    };
  }
  if (peakHour >= 22 || peakHour <= 3) {
    return {
      title: 'Noche',
      sub: `De madrugada. ${peakHourCount} veces en la mejor hora.`,
      color: 'purple',
    };
  }
  if (streaks.longest >= 7) {
    return {
      title: `${streaks.longest} días seguidos`,
      sub: `Tu récord de racha. Productividad constante.`,
      color: 'green',
    };
  }
  if (monthCount >= 30) {
    return {
      title: `${monthCount} este mes`,
      sub: `Vas a buen ritmo. Interesante ver hasta dónde llegas.`,
      color: 'pink',
    };
  }
  if (todayCount >= 3) {
    return {
      title: `${todayCount} hoy`,
      sub: `Día activo. Curioso, ¿no?`,
      color: 'pink',
    };
  }
  return {
    title: `${pad2(peakHour)}:00 — ${pad2(peakHour)}:59`,
    sub: `Tu hora más activa hasta ahora.`,
    color: 'blue',
  };
}

export default { renderHome };
