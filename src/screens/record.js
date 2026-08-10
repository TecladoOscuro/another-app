import {
  addEntry,
  updateEntry,
  getEntry,
  deleteEntry,
  getActressByName,
  listActresses,
  upsertActress,
} from '../db.js';
import { SOURCE_TYPES, LUBRICANT_OPTIONS } from '../data/categories.js';
import { fetchActress, slugify } from '../services/scraper.js';
import { formatBigNumber } from '../services/date.js';
import { escapeHtml, escapeAttr } from '../services/html.js';
import { openModal, toast } from '../ui/modal.js';
import { createSelectWithAdd } from '../ui/selectWithAdd.js';
import { getOptions, appendCustomOption } from '../services/options.js';

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

  const now = presetAt ?? Date.now();
  const allCats = await getOptions('category');
  const existingCats = existing?.categories || (existing?.category ? [existing.category] : []);

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="recordForm" autocomplete="off">

      <div class="field">
        <label>Categorías *</label>
        <div class="multi-cats" id="catChips"></div>
        <button type="button" class="btn btn--ghost" id="toggleCatPicker" style="margin-top: 6px;">
          <span id="toggleCatPickerText">+ Elegir categorías</span>
        </button>
        <div class="cat-picker" id="catPicker" hidden>
          <div class="cat-picker__head">
            <div class="search" style="flex: 1;">
              <input type="text" id="catSearchInput" placeholder="Buscar..." />
            </div>
          </div>
          <div class="cat-picker__list" id="catPickerList"></div>
          <div class="cat-picker__add">
            <input type="text" id="newCatInput" placeholder="O escribe una categoría nueva" />
            <button type="button" class="btn btn--primary" id="addNewCat">Añadir</button>
          </div>
          <button type="button" class="btn" id="doneCats" style="margin-top: 4px;">Listo</button>
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

      <div class="field" id="actressField">
        <label>Persona / actriz</label>
        <div class="search">
          <input
            type="text"
            id="actressInput"
            name="actressName"
            placeholder="Buscar guardada o nueva"
            list="actressList"
            autocomplete="off"
            value="${escapeAttr(existing?.actressName || '')}"
          />
          <datalist id="actressList"></datalist>
        </div>
        <div id="actressInfo" class="actress-info"></div>
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

  // ---- Categorías ----
  const catChips = body.querySelector('#catChips');
  const catPicker = body.querySelector('#catPicker');
  const catPickerList = body.querySelector('#catPickerList');
  const catSearchInput = body.querySelector('#catSearchInput');
  const newCatInput = body.querySelector('#newCatInput');

  const selectedCats = new Set(existingCats);

  function rerenderChips() {
    catChips.innerHTML = '';
    if (selectedCats.size === 0) {
      const hint = document.createElement('span');
      hint.className = 'muted';
      hint.style.fontSize = '13px';
      hint.textContent = 'Ninguna seleccionada';
      catChips.appendChild(hint);
      return;
    }
    [...selectedCats].forEach((c) => {
      const chip = document.createElement('span');
      chip.className = 'chip is-active';
      chip.innerHTML = `<span>${escapeHtml(c)}</span> <span class="chip__remove" aria-hidden="true">×</span>`;
      chip.addEventListener('click', () => {
        selectedCats.delete(c);
        rerenderChips();
        renderCatPickerList(catSearchInput.value);
      });
      catChips.appendChild(chip);
    });
  }
  rerenderChips();

  function renderCatPickerList(filter = '') {
    catPickerList.innerHTML = '';
    const f = filter.toLowerCase().trim();
    const recents = getRecentCategories().filter((c) => c.toLowerCase().includes(f));
    const matched = allCats.filter((c) => c.toLowerCase().includes(f));
    const toShow = [...new Set([...recents, ...matched])].sort();
    if (!toShow.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.style.fontSize = '13px';
      empty.style.padding = '8px';
      empty.textContent = 'No hay coincidencias. Escribe abajo para crear una nueva.';
      catPickerList.appendChild(empty);
      return;
    }
    toShow.forEach((c) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (selectedCats.has(c) ? ' is-active' : '');
      chip.textContent = c;
      chip.addEventListener('click', () => {
        if (selectedCats.has(c)) selectedCats.delete(c);
        else selectedCats.add(c);
        rerenderChips();
        renderCatPickerList(catSearchInput.value);
      });
      catPickerList.appendChild(chip);
    });
  }

  body.querySelector('#toggleCatPicker').addEventListener('click', () => {
    const willOpen = catPicker.hidden;
    catPicker.hidden = !willOpen;
    body.querySelector('#toggleCatPickerText').textContent = willOpen ? 'Cerrar' : '+ Elegir categorías';
    if (willOpen) {
      renderCatPickerList('');
      catSearchInput.focus();
    }
  });
  body.querySelector('#addNewCat').addEventListener('click', async () => {
    const v = newCatInput.value.trim();
    if (!v) {
      toast('Escribe el nombre');
      newCatInput.focus();
      return;
    }
    await appendCustomOption('category', v);
    if (!allCats.includes(v)) allCats.push(v);
    selectedCats.add(v);
    rerenderChips();
    newCatInput.value = '';
    renderCatPickerList(catSearchInput.value);
    toast(`Categoría "${v}" añadida`);
  });
  newCatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      body.querySelector('#addNewCat').click();
    }
  });
  body.querySelector('#doneCats').addEventListener('click', () => {
    catPicker.hidden = true;
    body.querySelector('#toggleCatPickerText').textContent = '+ Elegir categorías';
  });
  catSearchInput.addEventListener('input', () => renderCatPickerList(catSearchInput.value));

  // ---- Datalist actrices ----
  const actressDatalist = body.querySelector('#actressList');
  try {
    const storedActresses = await listActresses();
    storedActresses
      .filter((a) => a && a.name)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((a) => {
        const opt = document.createElement('option');
        opt.value = a.name;
        actressDatalist.appendChild(opt);
      });
  } catch {}

  // ---- Sitio / dispositivo ----
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
    const siteRelevant = ['clip', 'ad', 'cam', 'onlyfans'].includes(sourceType.value);
    siteWrap.style.display = siteRelevant ? '' : 'none';
  };
  sourceType.addEventListener('change', toggleSiteField);
  toggleSiteField();

  // ---- Actriz: lookup ----
  let searchToken = 0;
  let typingTimer;
  const abortLookup = () => {
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = null;
    searchToken++;
  };
  const actressInput = body.querySelector('#actressInput');
  const actressInfo = body.querySelector('#actressInfo');
  const siteSel = siteSelect.select;

  function autofillFromActress(a) {
    if (!a) return;
    if (a.source === 'pornhub' && !siteSel.value) {
      siteSel.value = 'Pornhub';
    }
  }

  function renderActressInfo(a) {
    if (!a) {
      actressInfo.innerHTML = '';
      return;
    }
    if (a.error && !a.fetchedAt) {
      actressInfo.innerHTML = `<div class="actress-info__row warn">Sin datos de Pornhub (${escapeHtml(a.error)}). Se guardará el nombre igualmente.</div>`;
      return;
    }
    if (a.notFound && !hasRealActressData(a)) {
      actressInfo.innerHTML = `<div class="actress-info__row">No encontrada en Pornhub. Se guardará como nombre manual.</div>`;
      return;
    }
    const rows = [];
    if (a.avatar) {
      rows.push(`<div class="actress-info__avatar"><img src="${escapeHtml(a.avatar)}" alt="" loading="lazy"></div>`);
    }
    const meta = [];
    if (a.rank) meta.push(`#${escapeHtml(a.rank)}`);
    if (a.videosCount) meta.push(`${formatBigNumber(a.videosCount)} vídeos`);
    if (a.subscribers) meta.push(`${formatBigNumber(a.subscribers)} subs`);
    if (a.born) meta.push(escapeHtml(a.born));
    if (a.relation) meta.push(escapeHtml(a.relation));
    if (a.height) meta.push(escapeHtml(a.height));
    if (a.weight) meta.push(escapeHtml(a.weight));
    if (a.ethnicity) meta.push(escapeHtml(a.ethnicity));
    if (a.measurements) meta.push(escapeHtml(a.measurements));
    rows.push(`<div class="actress-info__meta">${meta.length ? meta.join(' · ') : 'PH sin datos detallados'}</div>`);
    actressInfo.innerHTML = `<div class="actress-info__row">${rows.join('')}</div>`;
  }

  async function findLocalActress(name) {
    const lower = name.toLowerCase();
    const all = await listActresses();
    return (
      all.find((a) => a.name && a.name.toLowerCase() === lower) ||
      all.find((a) => a.name && a.name.toLowerCase().includes(lower))
    );
  }

  async function lookupActress(name) {
    const local = await findLocalActress(name);
    if (local && hasRealActressData(local)) {
      renderActressInfo(local);
      autofillFromActress(local);
      return;
    }
    let token = ++searchToken;
    actressInfo.innerHTML = `<div class="actress-info__row">Buscando en Pornhub…</div>`;
    try {
      const a = await fetchActress(name);
      if (token !== searchToken) return;
      renderActressInfo(a);
      autofillFromActress(a);
    } catch (err) {
      actressInfo.innerHTML = `<div class="actress-info__row warn">Error de red: ${escapeHtml(err.message)}</div>`;
    }
  }

  actressInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    const name = actressInput.value.trim();
    if (!name) {
      actressInfo.innerHTML = '';
      return;
    }
    typingTimer = setTimeout(() => lookupActress(name), 600);
  });
  actressInput.addEventListener('change', () => {
    const name = actressInput.value.trim();
    if (name) lookupActress(name);
  });

  if (existing?.actressName) {
    setTimeout(() => actressInput.dispatchEvent(new Event('input')), 50);
  }

  // ---- Save / Cancel ----
  cancel.addEventListener('click', () => {
    abortLookup();
    m.close();
  });

  save.addEventListener('click', async () => {
    abortLookup();
    const fd = new FormData(body.querySelector('#recordForm'));
    const actressName = String(fd.get('actressName') || '').trim();
    const sourceTypeVal = String(fd.get('sourceType') || '').trim();
    const device = String(fd.get('device') || '').trim();
    const lubricant = String(fd.get('lubricant') || '').trim();
    const site = String(fd.get('site') || '').trim();
    const notes = String(fd.get('notes') || '').trim();

    if (selectedCats.size === 0) {
      toast('Elige al menos una categoría');
      return;
    }

    const categories = [...selectedCats];
    const primaryCategory = categories[0];

    let actressId = null;
    if (actressName) {
      const stored = await getActressByName(actressName);
      if (stored) {
        actressId = stored.id;
      } else {
        const slug = `slug:${slugify(actressName)}`;
        await upsertActress({
          id: slug,
          name: actressName,
          source: 'manual',
          fetchedAt: Date.now(),
        });
        actressId = slug;
      }
    }

    const entry = {
      at: existing?.at ?? now,
      categories,
      category: primaryCategory,
      site,
      actressName,
      actressId,
      sourceType: sourceTypeVal,
      device,
      lubricant,
      notes,
    };

    if (existing) {
      await updateEntry({ ...existing, ...entry });
      toast('Actualizado');
    } else {
      await addEntry(entry);
      toast('Registrado');
      categories.forEach(pushRecentCategory);
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

function hasRealActressData(a) {
  if (!a) return false;
  return a.rank || a.videosCount || a.subscribers || a.born || a.height || a.weight || a.relation || a.ethnicity || a.measurements || a.avatar;
}

export default { openRecordModal };
