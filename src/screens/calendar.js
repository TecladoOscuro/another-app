import { getAllEntries, deleteEntry } from '../db.js';
import {
  WEEKDAYS_ES,
  MONTHS_SHORT,
  daysInMonth,
  formatTime,
  formatDurationShort,
  monthLabel,
  pad2,
  startOfDay,
} from '../services/date.js';
import { escapeHtml } from '../services/html.js';
import { openRecordModal } from './record.js';
import { toast, confirmDialog } from '../ui/modal.js';

let viewYear;
let viewMonth;
let selectedDay = null;

export async function renderCalendar(main) {
  const now = new Date();
  viewYear = viewYear ?? now.getFullYear();
  viewMonth = viewMonth ?? now.getMonth();
  selectedDay = selectedDay ?? startOfDay(now.getTime());

  const entries = await getAllEntries();
  const entriesByDay = new Map();
  for (const e of entries) {
    const d = startOfDay(e.at);
    if (!entriesByDay.has(d)) entriesByDay.set(d, []);
    entriesByDay.get(d).push(e);
  }

  const today = startOfDay(now.getTime());

  main.innerHTML = `
    <div class="screen">
      <h2>Calendario</h2>
      <p class="muted">Toca un día para ver o editar.</p>

      <div class="calendar">
        <div class="calendar__head">
          <div class="calendar__nav">
            <button id="prevY" aria-label="Año anterior">«</button>
            <button id="prevM" aria-label="Mes anterior">‹</button>
          </div>
          <h3>${monthLabel(viewYear, viewMonth)}</h3>
          <div class="calendar__nav">
            <button id="nextM" aria-label="Mes siguiente">›</button>
            <button id="nextY" aria-label="Año siguiente">»</button>
          </div>
        </div>
        <div class="calendar__weekdays">
          ${WEEKDAYS_ES.map((d) => `<div>${d}</div>`).join('')}
        </div>
        <div class="calendar__days" id="calendarDays"></div>
      </div>

      <div class="day-detail" id="dayDetail"></div>
    </div>
  `;

  const days = document.getElementById('calendarDays');
  const dim = daysInMonth(viewYear, viewMonth);
  const firstWd = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  for (let i = 0; i < firstWd; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar__day is-empty';
    days.appendChild(empty);
  }

  for (let d = 1; d <= dim; d++) {
    const ts = new Date(viewYear, viewMonth, d, 0, 0, 0, 0).getTime();
    const day = document.createElement('button');
    day.className = 'calendar__day';
    day.textContent = d;
    const dayEntries = entriesByDay.get(ts) || [];
    if (dayEntries.length) {
      day.classList.add('has-entries');
      const dot = document.createElement('span');
      dot.className = 'calendar__day__dot';
      day.appendChild(dot);
    }
    if (ts === today) day.classList.add('is-today');
    if (ts === selectedDay) day.classList.add('is-selected');
    day.addEventListener('click', () => {
      selectedDay = ts;
      refresh(main);
    });
    days.appendChild(day);
  }

  document.getElementById('prevM').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    selectedDay = startOfDay(new Date(viewYear, viewMonth, 1).getTime());
    refresh(main);
  });
  document.getElementById('nextM').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    selectedDay = startOfDay(new Date(viewYear, viewMonth, 1).getTime());
    refresh(main);
  });
  document.getElementById('prevY').addEventListener('click', () => {
    viewYear -= 1;
    selectedDay = startOfDay(new Date(viewYear, viewMonth, 1).getTime());
    refresh(main);
  });
  document.getElementById('nextY').addEventListener('click', () => {
    viewYear += 1;
    selectedDay = startOfDay(new Date(viewYear, viewMonth, 1).getTime());
    refresh(main);
  });

  renderDayDetail(main, entriesByDay);
}

async function renderDayDetail(main, entriesByDay) {
  const list = entriesByDay.get(selectedDay) || [];
  const sorted = [...list].sort((a, b) => a.at - b.at);
  const detail = document.getElementById('dayDetail');
  const dateObj = new Date(selectedDay);
  const dateLabel = `${pad2(dateObj.getDate())} ${MONTHS_SHORT[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  detail.innerHTML = `
    <div class="section-head">
      <h3>${dateLabel}</h3>
      <button class="btn btn--primary" id="addDay" style="flex: 0 0 auto; font-size: 13px; padding: 8px 12px; min-height: 0;">+ Añadir</button>
    </div>
    ${
      sorted.length
        ? `<div class="card">${sorted
            .map(
              (e) => `
            <div class="entry-item" data-id="${e.id}">
              <div class="entry-item__time">${formatTime(e.at)}</div>
              <div class="entry-item__title">
                <strong>${escapeHtml(e.category || 'Sin categoría')}</strong>
                <small>
                  ${escapeHtml(e.actressName || '')}
                  ${e.sourceType ? ` · <span class="site-badge">${escapeHtml(e.sourceType)}</span>` : ''}
                  ${e.site ? ` · <span class="site-badge">${escapeHtml(e.site)}</span>` : ''}
                  ${e.device ? ` · <span class="site-badge">${escapeHtml(e.device)}</span>` : ''}
                  ${e.lubricant === 'with' ? ` · <span class="site-badge">con lube</span>` : ''}
                  ${e.lubricant === 'without' ? ` · <span class="site-badge">sin lube</span>` : ''}
                  ${e.duration ? ` · ${formatDurationShort(e.duration)}` : ''}
                </small>
              </div>
              <button class="entry-item__del" data-action="edit" data-id="${e.id}">Editar</button>
              <button class="entry-item__del" data-action="del" data-id="${e.id}" style="color: var(--danger);">Borrar</button>
            </div>`,
            )
            .join('')}</div>`
        : `<div class="empty">Nada registrado este día.</div>`
    }
  `;

  document.getElementById('addDay').addEventListener('click', () => {
    openRecordModal({ presetAt: selectedDay });
  });

  detail.querySelectorAll('[data-action="del"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: '¿Eliminar registro?',
        message: 'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        danger: true,
      });
      if (ok) {
        await deleteEntry(Number(btn.dataset.id));
        toast('Eliminado');
        refresh(main);
      }
    });
  });

  detail.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openRecordModal({ editId: Number(btn.dataset.id) });
    });
  });
}

function refresh(main) {
  renderCalendar(main);
}

export default { renderCalendar };
