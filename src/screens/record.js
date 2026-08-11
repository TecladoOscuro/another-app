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
import { createClearableSelect } from '../ui/clearableSelect.js';
import { getOptions, appendCustomOption } from '../services/options.js';
import { getSetting, setSetting } from '../db.js';
import { loadStarsDataset, searchStars, getStar } from '../services/actressSearch.js';

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

function parseHeight(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)\s*cm/i);
  if (m) return `${m[1]} cm`;
  const n = parseInt(s, 10);
  if (n > 50 && n < 250) return `${n} cm`;
  return null;
}

function parseWeight(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)\s*kg/i);
  if (m) return `${m[1]} kg`;
  const n = parseInt(s, 10);
  if (n > 30 && n < 200) return `${n} kg`;
  return null;
}

function guessCategoriesFromActress(a) {
  const cats = new Set();
  if (!a) return cats;

  // Edad
  if (a.born) {
    const yearMatch = a.born.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const age = new Date().getFullYear() - parseInt(yearMatch[0], 10);
      if (age >= 40) cats.add('MILF');
      else if (age >= 30) cats.add('MILF');
      else if (age < 25) cats.add('Teen');
      else if (age < 30) cats.add('Young');
    }
  }

  // Etnia
  if (a.ethnicity) {
    const e = a.ethnicity.toLowerCase();
    if (e.includes('latin') || e.includes('hispanic')) cats.add('Latina');
    else if (e.includes('asian')) cats.add('Asian');
    else if (e.includes('ebony') || e.includes('black')) cats.add('Black');
    else if (e.includes('caucasian') || e.includes('white')) cats.add('Caucasian');
    else if (e.includes('middle eastern') || e.includes('arab')) cats.add('Arab');
    else if (e.includes('mixed')) cats.add('Mixed');
  }

  // Cabello
  if (a.hair) {
    const h = a.hair.toLowerCase();
    if (h.includes('blond')) cats.add('Blonde');
    else if (h.includes('brown') || h.includes('brunette')) cats.add('Brunette');
    else if (h.includes('red')) cats.add('Redhead');
    else if (h.includes('black')) cats.add('Brunette');
  }

  // Medidas → Big Tits / Big Ass
  const bust = parseInt(String(a.bust || '').match(/(\d+)/)?.[1] || '', 10);
  if (bust && bust >= 90) cats.add('Big Tits');
  const hip = parseInt(String(a.hip || '').match(/(\d+)/)?.[1] || '', 10);
  const waist = parseInt(String(a.waist || '').match(/(\d+)/)?.[1] || '', 10);
  if (hip && waist && hip - waist >= 25) cats.add('Big Ass');

  // Talla → Petite / Tall
  const height = parseInt(String(a.height || '').match(/(\d+)/)?.[1] || '', 10);
  if (height && height < 160) cats.add('Petite');
  else if (height && height >= 175) cats.add('Tall');

  // Peso
  const weight = parseInt(String(a.weight || '').match(/(\d+)/)?.[1] || '', 10);
  if (weight && weight >= 80) cats.add('BBW');

  // Relation
  if (a.relation) {
    const r = a.relation.toLowerCase();
    if (r.includes('married')) cats.add('MILF');
  }

  // Tags ya canónicos (de FreeOnes, scraping, etc.)
  if (a.tags && Array.isArray(a.tags)) {
    const knownCats = new Set([
      'MILF', 'Teen', 'Asian', 'Latina', 'Black', 'Caucasian', 'Ebony', 'Amateur', 'Anal', 'Blowjob', 'Threesome', 'Creampie', 'Squirt',
      'Petite', 'Babe', 'Masturbation', 'Lesbian', 'Big Tits', 'Big Ass', 'Brunette', 'Blonde', 'Redhead',
      'Shaved', 'Tattoo', 'Piercing', 'BBW', 'Tall', 'Stockings', 'Heels', 'Lingerie', 'Glamour',
    ]);
    a.tags.forEach((t) => {
      if (knownCats.has(t)) cats.add(t);
    });
  }

  return cats;
}

export async function openRecordModal({ presetAt = null, editId = null, simple = false } = {}) {
  let existing = null;
  if (editId) {
    existing = await getEntry(editId);
    if (!existing) {
      toast('No se encontró el registro');
      return;
    }
  }

  if (simple && !editId) {
    return recordSimple(presetAt);
  }

  const now = presetAt ?? Date.now();
  const allCats = await getOptions('category');
  const defaultDevice = existing ? (existing.device || '') : await getDefaultDevice();
  const existingCats = existing?.categories || (existing?.category ? [existing.category] : []);
  const recentActresses = getRecentActresses();
  await loadStarsDataset();

  const initialActressName = existing?.actressName || '';
  const body = document.createElement('div');
  body.innerHTML = `
    <form id="recordForm" autocomplete="off" tabindex="-1">

      <div class="record-section">
        <div class="field">
          <label>Persona / actriz</label>
          <div class="actress-picker">
            <input
              type="text"
              id="actressInput"
              name="actressName"
              placeholder="Escribe o elige reciente"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              value="${escapeAttr(initialActressName)}"
            />
            <div class="actress-dropdown" id="actressDropdown" hidden></div>
          </div>
          ${
            recentActresses.length && !initialActressName
              ? `<div class="chips" id="recentActressChips" style="margin-top: 6px;">
                ${recentActresses
                  .slice(0, 4)
                  .map((n) => `<button type="button" class="chip" data-actress="${escapeAttr(n)}">${escapeHtml(n)}</button>`)
                  .join('')}
              </div>`
              : ''
          }
          <div id="actressInfo" class="actress-info"></div>
        </div>
      </div>

      <div class="record-section">
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
      </div>

      ${
        existing
          ? `<div class="record-section">
            <div class="field-row">
              <div class="field">
                <label>Fecha</label>
                <input type="date" name="date" value="${escapeAttr(dateToInput(existing.at))}" required />
              </div>
              <div class="field">
                <label>Hora</label>
                <input type="time" name="time" value="${escapeAttr(timeToInput(existing.at))}" required />
              </div>
            </div>
          </div>`
          : ''
      }

      <div class="record-section">
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
        ${
          existing
            ? `<div class="field" id="siteField" style="margin-top: 12px;">
                <label>Sitio web</label>
              </div>`
            : ''
        }
      </div>

      <div class="record-section">
        <label class="ios-toggle">
          <input type="checkbox" name="lubricant" id="lubricantCheck" ${existing?.lubricant === 'with' ? 'checked' : ''} />
          <span class="ios-toggle__track"><span class="ios-toggle__thumb"></span></span>
          <span class="ios-toggle__label">Lubricante</span>
        </label>
      </div>

      ${
        existing
          ? `<div class="record-section">
              <div class="field">
                <label>Notas</label>
                <textarea name="notes" rows="3" placeholder="Lo que quieras recordar">${escapeHtml(existing.notes || '')}</textarea>
              </div>
            </div>`
          : ''
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

  // ---- Actress input reference (must be defined before dropdown wiring) ----
  const actressInput = body.querySelector('#actressInput');

  // ---- Actress dropdown ----
  const actressDropdown = body.querySelector('#actressDropdown');
  let dropdownItems = [];

  function renderDropdown(matches, query) {
    actressDropdown.innerHTML = '';
    if (!matches.length) {
      actressDropdown.hidden = true;
      return;
    }
    matches.slice(0, 8).forEach((name, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'actress-dropdown__item';
      btn.dataset.name = name;
      const lower = name.toLowerCase();
      const q = (query || '').toLowerCase();
      let label = escapeHtml(name);
      if (q) {
        const idx = lower.indexOf(q);
        if (idx >= 0) {
          label =
            escapeHtml(name.slice(0, idx)) +
            '<b>' +
            escapeHtml(name.slice(idx, idx + q.length)) +
            '</b>' +
            escapeHtml(name.slice(idx + q.length));
        }
      }
      btn.innerHTML = `<span>${label}</span>${i === 0 ? '<small class="muted">↵</small>' : ''}`;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectActress(name);
      });
      actressDropdown.appendChild(btn);
    });
    actressDropdown.hidden = false;
    dropdownItems = matches.slice(0, 8);
  }

  function closeDropdown() {
    actressDropdown.hidden = true;
    dropdownItems = [];
  }

  function selectActress(name) {
    actressInput.value = name;
    closeDropdown();
    actressInput.dispatchEvent(new Event('input'));
  }

  async function updateDropdown(query) {
    const q = (query || '').trim();
    if (!q) {
      // No query: show recents + top of dataset
      const recent = getRecentActresses();
      const recents = recent.map((n) => n).filter(Boolean);
      const topDataset = searchStars('', 6).map((s) => s.n);
      const seen = new Set();
      const combined = [];
      [...recents, ...topDataset].forEach((n) => {
        const key = n.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        combined.push(n);
      });
      renderDropdown(combined.slice(0, 8), '');
      return;
    }
    const lower = q.toLowerCase();
    // 1. Guardadas
    let stored = [];
    try {
      const all = await listActresses();
      stored = all
        .filter((a) => a && a.name)
        .map((a) => a.name)
        .filter((n) => n.toLowerCase().includes(lower));
    } catch {}
    // 2. Dataset
    const dataset = searchStars(q, 12).map((s) => s.n);
    // Dedup, priorizando guardadas
    const seen = new Set();
    const combined = [];
    [...stored, ...dataset].forEach((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      combined.push(n);
    });
    renderDropdown(combined.slice(0, 8), q);
  }

  // No abrimos el dropdown en focus automático de iOS.
  // Solo abrimos en click real del usuario o cuando escribe.
  let userInteracted = false;
  actressInput.addEventListener('mousedown', () => {
    userInteracted = true;
    updateDropdown(actressInput.value);
  });
  actressInput.addEventListener('touchstart', () => {
    userInteracted = true;
    updateDropdown(actressInput.value);
  }, { passive: true });
  actressInput.addEventListener('blur', () => {
    setTimeout(closeDropdown, 200);
    setTimeout(() => { userInteracted = false; }, 250);
  });

  let lastInput = '';
  actressInput.addEventListener('input', () => {
    const v = actressInput.value;
    if (v === lastInput) return;
    lastInput = v;
    updateDropdown(v);
  });

  actressInput.addEventListener('keydown', (e) => {
    if (!actressDropdown.hidden && dropdownItems.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
        selectActress(dropdownItems[0]);
        return;
      }
      if (e.key === 'Escape') {
        closeDropdown();
        return;
      }
    }
  });

  body.querySelectorAll('#recentActressChips .chip').forEach((c) => {
    c.addEventListener('click', () => {
      const name = c.dataset.actress;
      selectActress(name);
    });
  });

  // Initial render (después de esperar al dataset)
  if (initialActressName) {
    loadStarsDataset().then(() => updateDropdown(initialActressName));
  }

  // ---- Sitio (solo edit) ----
  let siteSelect = null;
  if (existing) {
    siteSelect = createClearableSelect({
      name: 'site',
      label: 'Sitio web',
      value: existing?.site || '',
      optionKey: 'site',
    });
    body.querySelector('#siteField').replaceWith(siteSelect.wrap);
  }

  // ---- Dispositivo ----
  const deviceSelect = createClearableSelect({
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
  const actressInfo = body.querySelector('#actressInfo');

  function autofillFromActress(a) {
    if (!a) return;
    const catsFromActress = [...guessCategoriesFromActress(a)];
    catsFromActress.forEach((c) => {
      if (!allCats.includes(c)) allCats.push(c);
      selectedCats.add(c);
    });
    rerenderChips();
    renderCatPickerList('');
    return catsFromActress;
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
    if (a.ethnicity) meta.push(escapeHtml(a.ethnicity));
    if (a.hair) meta.push(`Cabello: ${escapeHtml(a.hair)}`);
    if (a.height) meta.push(escapeHtml(a.height));
    if (a.weight) meta.push(escapeHtml(a.weight));
    if (a.bust && a.cup) meta.push(`Busto: ${escapeHtml(a.bust)}${escapeHtml(a.cup)}`);
    if (a.born) meta.push(escapeHtml(a.born));
    if (a.relation) meta.push(escapeHtml(a.relation));
    const avatar = a.avatar ? `<div class="actress-info__avatar"><img src="${escapeHtml(a.avatar)}" alt="" loading="lazy"></div>` : '';
    const autoCats = [...guessCategoriesFromActress(a)];
    const autoCatsHtml = autoCats.length
      ? `<div class="actress-info__autocats">
          <span class="actress-info__autocats-label">Auto:</span>
          ${autoCats.map((c) => `<span class="chip is-active" style="font-size: 11px; padding: 3px 8px;">${escapeHtml(c)}</span>`).join(' ')}
        </div>`
      : '';
    actressInfo.innerHTML = `<div class="actress-info__row">${avatar}<div class="actress-info__meta">${meta.length ? meta.join(' · ') : 'PH sin datos detallados'}</div>${autoCatsHtml}</div>`;
  }

  async function lookupActress(name) {
    // Esperar a que el dataset esté cargado
    await loadStarsDataset();

    const all = await listActresses();
    const local = all.find((x) => x.name && x.name.toLowerCase() === name.toLowerCase());

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
        ethnicity: star.ethnicity || null,
        hair: star.hair || null,
        eyes: star.eyes || null,
        cup: star.cup || null,
        bust: star.bust || null,
        waist: star.waist || null,
        hip: star.hip || null,
        height: parseHeight(star.height) || null,
        weight: parseWeight(star.weight) || null,
        tags: star.tags || [],
        url: `https://www.pornhub.com/pornstar/${slugify(name)}`,
        fetchedAt: Date.now(),
      };
      // Merge: local gana (más reciente), pero empezamos con enriched
      const merged = local ? { ...enriched, ...local, name: star.n, id: local.id || enriched.id } : enriched;
      renderActressInfo(merged);
      autofillFromActress(merged);
      // Persistir lo que tenemos del dataset para próximas veces
      if (!local) {
        await upsertActress(merged);
      }
      return;
    }

    // 2. Local con datos
    if (local && hasRealActressData(local)) {
      renderActressInfo(local);
      autofillFromActress(local);
      return;
    }
    if (local && local.notFound) {
      renderActressInfo(local);
      return;
    }

    // 3. Scraping en vivo (rara vez funciona por CORS)
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

  if (initialActressName) {
    setTimeout(() => actressInput.dispatchEvent(new Event('input')), 50);
  }

  actressInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    const name = actressInput.value.trim();
    if (!name) {
      actressInfo.innerHTML = '';
      return;
    }
    typingTimer = setTimeout(() => lookupActress(name), 350);
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

// Modo simple: registra sin modal
async function recordSimple(presetAt) {
  const defaultDevice = await getDefaultDevice();
  const entry = {
    at: presetAt ?? Date.now(),
    categories: [],
    category: 'Sin categoría',
    site: '',
    actressName: '',
    actressId: null,
    sourceType: '',
    device: defaultDevice,
    lubricant: 'without',
    notes: '',
  };
  await addEntry(entry);
  toast('Registrado');
  document.dispatchEvent(new CustomEvent('nuttracker:data-changed'));
}

// Select simple sin botón "+ Añadir"
function createSimpleSelect({ name, label, value = '', optionKey }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `
    <label>${label}</label>
    <select name="${name}"></select>
  `;
  const select = wrap.querySelector('select');
  (async () => {
    const opts = await getOptions(optionKey);
    select.innerHTML = `<option value="">—</option>` + opts.map((o) => `<option value="${escapeAttr(o)}" ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
  })();
  return { wrap, select };
}

export default { openRecordModal };
