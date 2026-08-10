import {
  addEntry,
  updateEntry,
  getEntry,
  deleteEntry,
  getActressByName,
  getActress,
  upsertActress,
} from '../db.js';
import { PH_CATEGORIES, PH_SITES, SOURCE_TYPES, DEVICES, LUBRICANT_OPTIONS } from '../data/categories.js';
import { fetchActress, slugify } from '../services/scraper.js';
import { formatBigNumber } from '../services/date.js';
import { fromDateTimeInputs, toDateInput, toTimeInput } from '../services/date.js';
import { openModal, toast } from '../ui/modal.js';
import { createSelectWithAdd } from '../ui/selectWithAdd.js';
import { getOptions } from '../services/options.js';

const RECENT_CAT_KEY = 'recentCategories';

function getRecentCategories() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_CAT_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecentCategory(cat) {
  if (!cat) return;
  const recents = getRecentCategories().filter((c) => c !== cat);
  recents.unshift(cat);
  localStorage.setItem(RECENT_CAT_KEY, JSON.stringify(recents.slice(0, 8)));
}

export async function openRecordModal({ presetAt = null, editId = null } = {}) {
  let existing = null;
  if (editId) {
    existing = await getEntry(editId);
    if (!existing) {
      toast('No se encontró el registro');
      return;
    }
  }

  const now = existing?.at ?? presetAt ?? Date.now();
  const recent = getRecentCategories();

  const body = document.createElement('div');

  body.innerHTML = `
    <form id="recordForm" autocomplete="off">
      <div class="field-row">
        <div class="field">
          <label>Fecha</label>
          <input type="date" name="date" value="${toDateInput(now)}" required />
        </div>
        <div class="field">
          <label>Hora</label>
          <input type="time" name="time" value="${toTimeInput(now)}" required />
        </div>
      </div>

      <div class="field">
        <label>Tipo de fuente</label>
        <select name="sourceType" id="sourceType">
          <option value="">—</option>
          ${SOURCE_TYPES.map(
            (s) => `<option value="${s.id}" ${existing?.sourceType === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`,
          ).join('')}
        </select>
      </div>

      <div class="field" id="siteField">
        <label>Sitio web</label>
      </div>

      <div class="field" id="categoryField">
        <label>Categoría</label>
        <div class="search">
          <input type="text" id="catInput" name="category" placeholder="Buscar o escribir..." list="catList" value="${escapeAttr(existing?.category || '')}" />
          <datalist id="catList"></datalist>
        </div>
        ${
          recent.length
            ? `<div class="chips" id="recentChips" style="margin-top: 6px;">
                ${recent
                  .map(
                    (c) =>
                      `<button type="button" class="chip" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`,
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>

      <div class="field" id="actressField">
        <label>Actriz / persona</label>
        <div class="search">
          <input type="text" id="actressInput" name="actressName" placeholder="Nombre" value="${escapeAttr(existing?.actressName || '')}" />
        </div>
        <small id="actressInfo" class="subtle" style="margin-top: 6px; display: block;"></small>
      </div>

      <div class="field" id="deviceField">
        <label>Dispositivo</label>
      </div>

      <div class="field">
        <label>Lubricante</label>
        <select name="lubricant">
          <option value="">—</option>
          ${LUBRICANT_OPTIONS.map(
            (opt) => `<option value="${opt.id}" ${existing?.lubricant === opt.id ? 'selected' : ''}>${opt.label}</option>`,
          ).join('')}
        </select>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Duración (min)</label>
          <input type="number" name="durationMinutes" min="0" max="600" value="${existing?.duration ? Math.floor(existing.duration / 60) : ''}" placeholder="—" />
        </div>
        <div class="field">
          <label>Segundos extra</label>
          <input type="number" name="durationSeconds" min="0" max="59" value="${existing?.duration ? existing.duration % 60 : ''}" />
        </div>
      </div>

      <div class="field">
        <label>Notas privadas</label>
        <textarea name="notes" placeholder="Lo que quieras recordar (no se envía a ningún sitio)">${escapeHtml(existing?.notes || '')}</textarea>
      </div>
    </form>
  `;

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '8px';
  footer.style.width = '100%';

  if (existing) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn btn--danger';
    del.textContent = 'Eliminar';
    footer.appendChild(del);
  }

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn';
  cancel.textContent = 'Cancelar';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn--primary';
  save.textContent = existing ? 'Guardar' : 'Registrar';
  footer.appendChild(cancel);
  footer.appendChild(save);

  const m = openModal({
    title: existing ? 'Editar registro' : 'Nuevo registro',
    body,
    footer,
  });

  const datalist = body.querySelector('#catList');
  PH_CATEGORIES.sort((a, b) => a.localeCompare(b)).forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    datalist.appendChild(opt);
  });

  const siteSelect = createSelectWithAdd({
    name: 'site',
    label: 'Sitio web',
    value: existing?.site || '',
    optionKey: 'site',
  });
  body.querySelector('#siteField').replaceWith(siteSelect.wrap);

  const deviceSelect = createSelectWithAdd({
    name: 'device',
    label: 'Dispositivo',
    value: existing?.device || '',
    optionKey: 'device',
  });
  body.querySelector('#deviceField').replaceWith(deviceSelect.wrap);

  const sourceType = body.querySelector('#sourceType');
  const siteWrap = siteSelect.wrap;
  const toggleSiteField = () => {
    const source = SOURCE_TYPES.find((s) => s.id === sourceType.value);
    const siteRelevant = ['clip', 'ad', 'cam', 'onlyfans'].includes(sourceType.value);
    siteWrap.style.display = siteRelevant ? '' : 'none';
  };
  sourceType.addEventListener('change', toggleSiteField);
  toggleSiteField();

  body.querySelectorAll('#recentChips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      body.querySelector('#catInput').value = chip.dataset.cat;
    });
  });

  let searchToken = 0;
  const actressInput = body.querySelector('#actressInput');
  const actressInfo = body.querySelector('#actressInfo');
  const catInput = body.querySelector('#catInput');
  const siteSel = siteSelect.select;
  let typingTimer;

  function autofillFromActress(a) {
    if (!a) return;
    if (a.rank || a.videosCount) {
      const cats = guessCategoriesFromActress(a);
      if (cats.length && !catInput.value) {
        catInput.value = cats[0];
      }
    }
    if (a.source === 'pornhub' && !siteSel.value) {
      siteSel.value = 'Pornhub';
    }
  }

  async function lookupActress(name) {
    const stored = await getActressByName(name);
    if (stored) {
      autofillFromActress(stored);
      if (stored.notes) {
        const src = stored.notes;
      }
    }
    let token = ++searchToken;
    try {
      const a = await fetchActress(name);
      if (token !== searchToken) return;
      if (a.error) {
        actressInfo.innerHTML = `<span class="warn">No se pudo obtener (${escapeHtml(a.error)}). Se guardará solo el nombre.</span>`;
      } else {
        const parts = [];
        if (a.rank) parts.push(`Rank #${escapeHtml(a.rank)}`);
        if (a.videosCount) parts.push(`${formatBigNumber(a.videosCount)} vídeos`);
        if (a.subscribers) parts.push(`${formatBigNumber(a.subscribers)} subs`);
        if (a.relation) parts.push(`Rel: ${escapeHtml(a.relation)}`);
        if (a.height) parts.push(escapeHtml(a.height));
        if (a.weight) parts.push(escapeHtml(a.weight));
        if (a.born) parts.push(escapeHtml(a.born));
        actressInfo.innerHTML = parts.length
          ? `<span class="muted">${parts.join(' · ')}</span>`
          : '<span class="muted">Sin datos adicionales.</span>';
        autofillFromActress(a);
      }
    } catch (err) {
      actressInfo.textContent = 'Error de red';
    }
  }

  actressInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    const name = actressInput.value.trim();
    if (!name) {
      actressInfo.textContent = '';
      return;
    }
    actressInfo.textContent = 'Buscando…';
    typingTimer = setTimeout(() => lookupActress(name), 600);
  });
  if (existing?.actressName) {
    actressInput.dispatchEvent(new Event('input'));
  }

  cancel.addEventListener('click', () => m.close());
  save.addEventListener('click', async () => {
    const form = body.querySelector('#recordForm');
    const fd = new FormData(form);
    const date = fd.get('date');
    const time = fd.get('time');
    const at = fromDateTimeInputs(String(date), String(time));
    const category = String(fd.get('category') || '').trim();
    const site = String(fd.get('site') || '').trim();
    const actressName = String(fd.get('actressName') || '').trim();
    const sourceTypeVal = String(fd.get('sourceType') || '').trim();
    const device = String(fd.get('device') || '').trim();
    const lubricant = String(fd.get('lubricant') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    const dm = parseInt(fd.get('durationMinutes') || '0', 10) || 0;
    const ds = parseInt(fd.get('durationSeconds') || '0', 10) || 0;
    const duration = dm * 60 + ds;

    if (!category) {
      toast('Elige una categoría');
      return;
    }

    let actressId = null;
    if (actressName) {
      const stored = await getActressByName(actressName);
      if (stored) {
        actressId = stored.id;
      } else {
        const slug = `slug:${slugify(actressName)}`;
        const fresh = {
          id: slug,
          name: actressName,
          source: 'manual',
          fetchedAt: Date.now(),
        };
        await upsertActress(fresh);
        actressId = slug;
      }
    }

    const entry = {
      at,
      category,
      site,
      actressName,
      actressId,
      sourceType: sourceTypeVal,
      device,
      lubricant,
      duration,
      notes,
    };

    if (existing) {
      await updateEntry({ ...existing, ...entry });
      toast('Actualizado');
    } else {
      await addEntry(entry);
      toast('Registrado');
      pushRecentCategory(category);
    }

    m.close();
    document.dispatchEvent(new CustomEvent('nuttracker:data-changed'));
  });

  const delBtn = footer.querySelector('.btn--danger');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      await deleteEntry(existing.id);
      toast('Eliminado');
      m.close();
      document.dispatchEvent(new CustomEvent('nuttracker:data-changed'));
    });
  }
}

function guessCategoriesFromActress(a) {
  if (!a) return [];
  const tags = [];
  if (a.relation) tags.push('MILF');
  if (a.born) {
    const year = parseInt((a.born.match(/\d{4}/) || ['0'])[0], 10);
    if (year && year > 2000) tags.push('Teen');
  }
  if (a.height) {
    const cm = parseInt((a.height.match(/\d+/) || ['0'])[0], 10);
    if (cm && cm < 160) tags.push('Petite');
  }
  if (a.videosCount && a.videosCount > 500) tags.push('Pornstar');
  if (a.rank && parseInt(a.rank, 10) <= 100) tags.push('Pornstar');
  return tags;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function escapeAttr(s) {
  return escapeHtml(s);
}

export default { openRecordModal };
