import {
  addEntry,
  updateEntry,
  getEntry,
  deleteEntry,
  getActressByName,
  listActresses,
  upsertActress,
} from '../db.js';
import { PH_CATEGORIES, SOURCE_TYPES, LUBRICANT_OPTIONS } from '../data/categories.js';
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
  const recent = getRecentCategories();
  const allCats = await getOptions('category');
  const allSites = await getOptions('site');
  const allDevices = await getOptions('device');

  const existingCats = existing?.categories || (existing?.category ? [existing.category] : []);

  const body = document.createElement('div');

  body.innerHTML = `
    <form id="recordForm" autocomplete="off">
      <div class="field">
        <label>Categorías *</label>
        <div class="multi-cats" id="catChips"></div>
        <button type="button" class="btn btn--ghost" id="toggleCatPicker" style="margin-top: 8px;">+ Añadir / elegir categorías</button>
        <div class="cat-picker" id="catPicker" hidden>
          <div class="search">
            <input type="text" id="catSearchInput" placeholder="Buscar categoría..." />
          </div>
          <div class="cat-picker__list" id="catPickerList"></div>
          <div class="field" style="margin-top: 8px;">
            <input type="text" id="newCatInput" placeholder="O escribe una nueva categoría" />
          </div>
          <div style="display:flex; gap: 6px;">
            <button type="button" class="btn" id="addNewCat">Añadir</button>
            <button type="button" class="btn btn--primary" id="doneCats">Listo</button>
          </div>
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
            placeholder="Buscar o escribir nombre"
            list="actressList"
            autocomplete="off"
            value="${escapeAttr(existing?.actressName || '')}"
          />
          <datalist id="actressList"></datalist>
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

  const catChips = body.querySelector('#catChips');
  const selectedCats = new Set(existingCats);
  function rerenderChips() {
    catChips.innerHTML = '';
    if (selectedCats.size === 0) {
      catChips.innerHTML = '<span class="muted" style="font-size: 13px;">Toca el botón para elegir al menos una.</span>';
      return;
    }
    [...selectedCats].forEach((c) => {
      const chip = document.createElement('span');
      chip.className = 'chip is-active';
      chip.innerHTML = `${escapeHtml(c)} <span style="margin-left: 4px; opacity: 0.7;">×</span>`;
      chip.addEventListener('click', () => {
        selectedCats.delete(c);
        rerenderChips();
      });
      catChips.appendChild(chip);
    });
  }
  rerenderChips();

  const catPicker = body.querySelector('#catPicker');
  const catPickerList = body.querySelector('#catPickerList');
  const catSearchInput = body.querySelector('#catSearchInput');

  function renderCatPickerList(filter = '') {
    catPickerList.innerHTML = '';
    const filtered = allCats
      .filter((c) => c.toLowerCase().includes(filter.toLowerCase()))
      .sort();
    const recents = getRecentCategories().filter((c) => !filtered.includes(c));
    const toShow = [...new Set([...recents, ...filtered])];
    if (!toShow.length) {
      catPickerList.innerHTML = '<div class="muted" style="padding: 8px;">Sin coincidencias.</div>';
      return;
    }
    toShow.forEach((c) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'chip ' + (selectedCats.has(c) ? 'is-active' : '');
      row.textContent = c;
      row.addEventListener('click', () => {
        if (selectedCats.has(c)) selectedCats.delete(c);
        else selectedCats.add(c);
        rerenderChips();
        renderCatPickerList(catSearchInput.value);
      });
      catPickerList.appendChild(row);
    });
  }

  body.querySelector('#toggleCatPicker').addEventListener('click', () => {
    const open = !catPicker.hidden;
    catPicker.hidden = open;
    if (!open) renderCatPickerList('');
  });
  body.querySelector('#addNewCat').addEventListener('click', async () => {
    const v = body.querySelector('#newCatInput').value.trim();
    if (!v) return;
    await appendCustomOption('category', v);
    allCats.push(v);
    selectedCats.add(v);
    rerenderChips();
    body.querySelector('#newCatInput').value = '';
    renderCatPickerList(catSearchInput.value);
  });
  body.querySelector('#doneCats').addEventListener('click', () => {
    catPicker.hidden = true;
  });
  catSearchInput.addEventListener('input', () => renderCatPickerList(catSearchInput.value));

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
    if (!a) return;
    if (a.error && !a.fetchedAt) {
      actressInfo.innerHTML = `<span class="warn">No se pudo obtener de Pornhub (${escapeHtml(a.error)}). Se guardará el nombre igualmente.</span>`;
      return;
    }
    if (a.notFound) {
      actressInfo.innerHTML = `<span class="muted">No encontrada en Pornhub. Se guardará como nombre manual.</span>`;
      return;
    }
    const parts = [];
    if (a.rank) parts.push(`Rank #${escapeHtml(a.rank)}`);
    if (a.videosCount) parts.push(`${formatBigNumber(a.videosCount)} vídeos`);
    if (a.subscribers) parts.push(`${formatBigNumber(a.subscribers)} subs`);
    if (a.videoViews) parts.push(`${formatBigNumber(a.videoViews)} views`);
    if (a.relation) parts.push(`Rel: ${escapeHtml(a.relation)}`);
    if (a.gender) parts.push(escapeHtml(a.gender));
    if (a.height) parts.push(escapeHtml(a.height));
    if (a.weight) parts.push(escapeHtml(a.weight));
    if (a.born) parts.push(escapeHtml(a.born));
    actressInfo.innerHTML = parts.length
      ? `<span class="muted">${parts.join(' · ')}</span>`
      : '<span class="muted">Sin datos adicionales en PH.</span>';
  }

  async function lookupActress(name) {
    const local = await findLocalActress(name);
    if (local && local.fetchedAt) {
      renderActressInfo(local);
      autofillFromActress(local);
      return;
    }
    let token = ++searchToken;
    try {
      const a = await fetchActress(name);
      if (token !== searchToken) return;
      renderActressInfo(a);
      autofillFromActress(a);
    } catch (err) {
      actressInfo.innerHTML = `<span class="warn">Error de red: ${escapeHtml(err.message)}</span>`;
    }
  }

  async function findLocalActress(name) {
    const lower = name.toLowerCase();
    const exact = await getActressByName(name);
    if (exact) return exact;
    const all = await listActresses();
    return (
      all.find((a) => a.name && a.name.toLowerCase() === lower) ||
      all.find((a) => a.name && a.name.toLowerCase().includes(lower))
    );
  }

  actressInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    const name = actressInput.value.trim();
    if (!name) {
      actressInfo.textContent = '';
      return;
    }
    actressInfo.textContent = 'Buscando en Pornhub…';
    typingTimer = setTimeout(() => lookupActress(name), 600);
  });
  if (existing?.actressName) {
    actressInput.dispatchEvent(new Event('input'));
  }

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

export default { openRecordModal };
