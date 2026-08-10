import {
  addEntry,
  updateEntry,
  getEntry,
  deleteEntry,
  getActressByName,
  listActresses,
  upsertActress,
} from '../db.js';
import { SOURCE_TYPES } from '../data/categories.js';
import { fetchActress, slugify } from '../services/scraper.js';
import { formatBigNumber } from '../services/date.js';
import { escapeHtml, escapeAttr } from '../services/html.js';
import { openModal, toast } from '../ui/modal.js';
import { createSelectWithAdd } from '../ui/selectWithAdd.js';
import { getOptions, appendCustomOption } from '../services/options.js';
import { getSetting, setSetting } from '../db.js';
import { loadStarsDataset, searchStars, getStar, findOrCreateActress } from '../services/actressSearch.js';

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

async function getDefaultDevice() {
  return (await getSetting('defaultDevice', 'iPad')) || 'iPad';
}

function getRecentActresses() {
  try {
    return JSON.parse(localStorage.getItem('recentActresses') || '[]');
  } catch {
    return [];
  }
}

function pushRecentActress(name) {
  if (!name) return;
  const recents = getRecentActresses().filter((n) => n.toLowerCase() !== name.toLowerCase());
  recents.unshift(name);
  localStorage.setItem('recentActresses', JSON.stringify(recents.slice(0, 8)));
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
  const defaultDevice = existing ? (existing.device || '') : await getDefaultDevice();
  const existingCats = existing?.categories || (existing?.category ? [existing.category] : []);
  const recentActresses = getRecentActresses();
  await loadStarsDataset();

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="recordForm" autocomplete="off">

      <div class="field">
        <label>Persona / actriz</label>
        <div class="search">
          <input
            type="text"
            id="actressInput"
            name="actressName"
            placeholder="Escribe o elige reciente"
            list="actressList"
            autocomplete="off"
            value="${escapeAttr(existing?.actressName || (recentActresses[0] || ''))}"
          />
          <datalist id="actressList"></datalist>
        </div>
        ${
          recentActresses.length
            ? `<div class="chips" id="recentActressChips" style="margin-top: 6px;">
                ${recentActresses
                  .slice(0, 4)
                  .map(
                    (n) =>
                      `<button type="button" class="chip" data-actress="${escapeAttr(n)}">${escapeHtml(n)}</button>`,
                  )
                  .join('')}
              </div>`
            : ''
        }
        <div id="actressInfo" class="actress-info"></div>
      </div>

      <div class="field">
        <label>Categorías</label>
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
            <input type="text" id="newCatInput" placeholder="O escribe una nueva" />
            <button type="button" class="btn btn--primary" id="addNewCat">Añadir</button>
          </div>
          <button type="button" class="btn" id="doneCats" style="margin-top: 4px;">Listo</button>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Fuente</label>
          <select name="sourceType" id="sourceType">
            <option value="">—</option>
            ${SOURCE_TYPES.map(
              (s) => `<option value="${s.id}" ${existing?.sourceType === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="field" id="deviceField">
          <label>Dispositivo</label>
        </div>
      </div>

      <div class="field">
        <label class="checkbox-row">
          <input type="checkbox" name="lubricant" id="lubricantCheck" ${existing?.lubricant === 'with' ? 'checked' : ''} />
          <span>Lubricante</span>
        </label>
      </div>

      ${
        existing
          ? `<div class="field-row">
            <div class="field">
              <label>Fecha</label>
              <input type="date" name="date" value="${escapeAttr(dateToInput(existing.at))}" required />
            </div>
            <div class="field">
              <label>Hora</label>
              <input type="time" name="time" value="${escapeAttr(timeToInput(existing.at))}" required />
            </div>
          </div>
          <div class="field" id="siteField">
            <label>Sitio web</label>
          </div>
          <div class="field">
            <label>Notas</label>
            <textarea name="notes" rows="3">${escapeHtml(existing.notes || '')}</textarea>
          </div>`
          : `<div class="field" id="siteField" style="display:none;"><label>Sitio web</label></div>`
      }
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
      hint.textContent = 'Se autocompletará con la actriz';
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

  // ---- Datalist actrices (dataset + guardadas) ----
  const actressDatalist = body.querySelector('#actressList');
  await loadStarsDataset();
  // guardadas
  try {
    const storedActresses = await listActresses();
    const storedNames = new Set();
    storedActresses
      .filter((a) => a && a.name)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((a) => {
        if (storedNames.has(a.name.toLowerCase())) return;
        storedNames.add(a.name.toLowerCase());
        const opt = document.createElement('option');
        opt.value = a.name;
        actressDatalist.appendChild(opt);
      });
  } catch {}
  // dataset (top)
  for (const s of searchStars('', 200)) {
    const opt = document.createElement('option');
    opt.value = s.n;
    actressDatalist.appendChild(opt);
  }

  // Recent actress chips
  body.querySelectorAll('#recentActressChips .chip').forEach((c) => {
    c.addEventListener('click', () => {
      body.querySelector('#actressInput').value = c.dataset.actress;
      body.querySelector('#actressInput').dispatchEvent(new Event('input'));
    });
  });

  // ---- Sitio (solo en edit) ----
  let siteSelect = null;
  if (existing) {
    siteSelect = createSelectWithAdd({
      name: 'site',
      label: 'Sitio web',
      value: existing?.site || '',
      optionKey: 'site',
    });
    body.querySelector('#siteField').replaceWith(siteSelect.wrap);
  }

  // ---- Dispositivo ----
  const deviceSelect = createSelectWithAdd({
    name: 'device',
    label: 'Dispositivo',
    value: defaultDevice,
    optionKey: 'device',
  });
  body.querySelector('#deviceField').replaceWith(deviceSelect.wrap);

  // ---- Actriz lookup ----
  let searchToken = 0;
  let typingTimer;
  const abortLookup = () => {
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = null;
    searchToken++;
  };
  const actressInput = body.querySelector('#actressInput');
  const actressInfo = body.querySelector('#actressInfo');

  function autofillFromActress(a) {
    if (!a) return;
    if (a.source === 'pornhub' && siteSelect && !siteSelect.select.value) {
      siteSelect.select.value = 'Pornhub';
    }
    // Auto-categorías: si la actriz tiene tags, seleccionarlos
    if (a.tags && Array.isArray(a.tags)) {
      const knownCats = new Set(allCats);
      a.tags.slice(0, 5).forEach((t) => {
        if (knownCats.has(t)) selectedCats.add(t);
      });
      // Tags adicionales que también sean categorías válidas
      rerenderChips();
    }
  }

  function renderActressInfo(a) {
    if (!a) {
      actressInfo.innerHTML = '';
      return;
    }
    if (a.transient) {
      actressInfo.innerHTML = `<div class="actress-info__row warn">
        <div>
          <strong>No se pudo conectar con Pornhub</strong><br>
          <small>El proxy CORS está bloqueado. Se guardará como nombre manual.</small>
        </div>
      </div>`;
      return;
    }
    if (a.notFound && !hasRealActressData(a)) {
      actressInfo.innerHTML = `<div class="actress-info__row">No encontrada en Pornhub. Se guardará como nombre manual.</div>`;
      return;
    }
    const meta = [];
    if (a.rank) meta.push(`#${escapeHtml(a.rank)}`);
    if (a.videosCount) meta.push(`${formatBigNumber(a.videosCount)} vídeos`);
    if (a.subscribers) meta.push(`${formatBigNumber(a.subscribers)} subs`);
    if (a.born) meta.push(escapeHtml(a.born));
    if (a.relation) meta.push(escapeHtml(a.relation));
    if (a.ethnicity) meta.push(escapeHtml(a.ethnicity));
    if (a.tags && a.tags.length) meta.push(`tags: ${a.tags.slice(0, 3).map(escapeHtml).join(', ')}`);
    const avatar = a.avatar ? `<div class="actress-info__avatar"><img src="${escapeHtml(a.avatar)}" alt="" loading="lazy"></div>` : '';
    actressInfo.innerHTML = `<div class="actress-info__row">${avatar}<div class="actress-info__meta">${meta.length ? meta.join(' · ') : 'PH sin datos detallados'}</div></div>`;
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
    // 1. Dataset estático (PH completo, instantáneo)
    const star = getStar(name);
    if (star) {
      const slug = `slug:${slugify(name)}`;
      const enriched = {
        id: slug,
        name: star.n,
        source: 'ph-dataset',
        rank: star.r || null,
        born: star.b || null,
        url: `https://www.pornhub.com/pornstar/${slugify(name)}`,
        fetchedAt: Date.now(),
      };
      // Fusionar con local si tiene más datos
      const local = await findLocalActress(name);
      const merged = local ? { ...enriched, ...local, name: star.n } : enriched;
      renderActressInfo(merged);
      autofillFromActress(merged);
      return;
    }

    // 2. Local con datos
    const local = await findLocalActress(name);
    if (local && hasRealActressData(local)) {
      renderActressInfo(local);
      autofillFromActress(local);
      return;
    }
    if (local && local.notFound) {
      renderActressInfo(local);
      return;
    }

    // 3. Scraping en vivo
    let token = ++searchToken;
    actressInfo.innerHTML = `<div class="actress-info__row">Buscando en Pornhub…</div>`;
    try {
      const a = await fetchActress(name);
      if (token !== searchToken) return;
      renderActressInfo(a);
      autofillFromActress(a);
    } catch (err) {
      actressInfo.innerHTML = `<div class="actress-info__row warn">Error: ${escapeHtml(err.message || 'desconocido')}</div>`;
    }
  }

  // Solo hacer lookup en edit mode o si hay valor inicial
  if (existing?.actressName) {
    setTimeout(() => actressInput.dispatchEvent(new Event('input')), 50);
  } else if (recentActresses.length) {
    // Auto-lookup de la reciente más común
    setTimeout(() => actressInput.dispatchEvent(new Event('input')), 100);
  }

  actressInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    const name = actressInput.value.trim();
    if (!name) {
      actressInfo.innerHTML = '';
      return;
    }
    // Populate datalist with matches as user types
    const matches = searchStars(name, 30);
    actressDatalist.innerHTML = '';
    for (const s of matches) {
      const opt = document.createElement('option');
      opt.value = s.n;
      actressDatalist.appendChild(opt);
    }
    typingTimer = setTimeout(() => lookupActress(name), 400);
  });

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
    const lubricant = body.querySelector('#lubricantCheck').checked ? 'with' : 'without';
    const site = siteSelect ? String(siteSelect.select.value || '').trim() : '';
    const notes = String(fd.get('notes') || '').trim();

    let at = existing?.at ?? Date.now();
    if (existing) {
      const date = String(fd.get('date') || '');
      const time = String(fd.get('time') || '');
      if (date && time) {
        const [y, m, d] = date.split('-').map(Number);
        const [hh, mm] = time.split(':').map(Number);
        at = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).getTime();
      }
    }

    const categories = [...selectedCats];
    const primaryCategory = categories[0] || 'Sin categoría';

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
      at,
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
      if (actressName) pushRecentActress(actressName);
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

function dateToInput(ts) {
  const d = new Date(ts);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeToInput(ts) {
  const d = new Date(ts);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hasRealActressData(a) {
  if (!a) return false;
  if (a.notFound) return false;
  if (a.transient) return false;
  return a.rank || a.videosCount || a.subscribers || a.born || a.height || a.weight || a.relation || a.ethnicity || a.measurements || a.avatar || (a.tags && a.tags.length);
}

export default { openRecordModal };
