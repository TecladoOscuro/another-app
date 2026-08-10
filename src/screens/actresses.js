import { listActresses, upsertActress, deleteActress, getEntriesByActress } from '../db.js';
import { escapeHtml, escapeAttr } from '../services/html.js';
import { openModal, toast } from '../ui/modal.js';
import { formatBigNumber } from '../services/date.js';
import { fetchActress, refreshActress } from '../services/scraper.js';

export async function renderActresses(main) {
  const actresses = await listActresses();
  const sorted = actresses
    .filter((a) => a && a.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  main.innerHTML = `
    <div class="screen">
      <h2>Actrices</h2>
      <p class="muted">Tu colección. Toca para editar.</p>
      ${
        sorted.length
          ? `<div class="card" style="padding: 0;">
              <div class="list">${sorted
                .map(
                  (a) => `
                <button class="list-item" data-actress-id="${escapeAttr(a.id)}" style="width: 100%; text-align: left; cursor: pointer;">
                  <div class="actress-card__avatar">${a.avatar ? `<img src="${escapeHtml(a.avatar)}" alt="" loading="lazy">` : escapeHtml((a.name[0] || '?').toUpperCase())}</div>
                  <div class="list-item__title" style="flex: 1;">
                    ${escapeHtml(a.name)}
                    <div class="list-item__sub">
                      ${a.rank ? `#${escapeHtml(a.rank)} · ` : ''}${a.videosCount ? `${formatBigNumber(a.videosCount)} vídeos` : ''}${a.born ? ` · ${escapeHtml(a.born)}` : ''}
                    </div>
                  </div>
                  <span class="muted" style="font-size: 18px;">›</span>
                </button>
              `,
                )
                .join('')}</div>
            </div>`
          : `<div class="empty">
              <div class="empty__icon">·</div>
              <div class="empty__title">Sin actrices todavía</div>
              <div>Registra una con el botón de inicio y se añadirá aquí.</div>
            </div>`
      }
    </div>
  `;

  main.querySelectorAll('[data-actress-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openActressEditor(btn.dataset.actressId, main);
    });
  });
}

async function openActressEditor(actressId, main) {
  const all = await listActresses();
  const a = all.find((x) => x.id === actressId);
  if (!a) {
    toast('No encontrada');
    return;
  }

  const entries = await getEntriesByActress(actressId);
  const count = entries.length;

  const body = document.createElement('div');
  body.innerHTML = `
    <form id="actressForm" autocomplete="off">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="name" value="${escapeAttr(a.name)}" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Ranking PH</label>
          <input type="text" name="rank" value="${escapeAttr(a.rank || '')}" placeholder="ej. 1234" />
        </div>
        <div class="field">
          <label>Vídeos</label>
          <input type="number" name="videosCount" value="${a.videosCount || ''}" placeholder="—" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Suscriptores</label>
          <input type="number" name="subscribers" value="${a.subscribers || ''}" placeholder="—" />
        </div>
        <div class="field">
          <label>Views totales</label>
          <input type="number" name="videoViews" value="${a.videoViews || ''}" placeholder="—" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Nacimiento</label>
          <input type="text" name="born" value="${escapeAttr(a.born || '')}" placeholder="ej. Mar 15, 1990" />
        </div>
        <div class="field">
          <label>Relación</label>
          <input type="text" name="relation" value="${escapeAttr(a.relation || '')}" placeholder="ej. Single" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Altura</label>
          <input type="text" name="height" value="${escapeAttr(a.height || '')}" placeholder="ej. 165 cm" />
        </div>
        <div class="field">
          <label>Peso</label>
          <input type="text" name="weight" value="${escapeAttr(a.weight || '')}" placeholder="ej. 55 kg" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Etnia</label>
          <input type="text" name="ethnicity" value="${escapeAttr(a.ethnicity || '')}" placeholder="ej. Latin" />
        </div>
        <div class="field">
          <label>Género</label>
          <input type="text" name="gender" value="${escapeAttr(a.gender || '')}" placeholder="ej. Female" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Cabello</label>
          <input type="text" name="hair" value="${escapeAttr(a.hair || '')}" placeholder="ej. Brown" />
        </div>
        <div class="field">
          <label>Ojos</label>
          <input type="text" name="eyes" value="${escapeAttr(a.eyes || '')}" placeholder="ej. Blue" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Medidas</label>
          <input type="text" name="measurements" value="${escapeAttr(a.measurements || '')}" placeholder="ej. 34C-24-34" />
        </div>
        <div class="field">
          <label>Copa</label>
          <input type="text" name="cup" value="${escapeAttr(a.cup || '')}" placeholder="ej. C" />
        </div>
      </div>
      <div class="field">
        <label>Año de inicio</label>
        <input type="text" name="startedYear" value="${escapeAttr(a.startedYear || '')}" placeholder="ej. 2015" />
      </div>
      <div class="field">
        <label>URL avatar</label>
        <input type="url" name="avatar" value="${escapeAttr(a.avatar || '')}" placeholder="https://..." />
      </div>
      <p class="subtle" style="margin-top: 4px;">${count} ${count === 1 ? 'registro' : 'registros'} la ${count === 1 ? 'menciona' : 'mencionan'}.</p>
    </form>
  `;

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '8px';
  footer.style.width = '100%';

  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'btn';
  refresh.textContent = '↻ Refrescar PH';
  footer.appendChild(refresh);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn--primary';
  save.textContent = 'Guardar';
  footer.appendChild(save);

  const m = openModal({ title: a.name, body, footer });

  save.addEventListener('click', async () => {
    const fd = new FormData(body.querySelector('#actressForm'));
    const updated = {
      ...a,
      name: String(fd.get('name') || a.name).trim(),
      rank: String(fd.get('rank') || '').trim() || null,
      videosCount: parseInt(fd.get('videosCount') || '0', 10) || null,
      subscribers: parseInt(fd.get('subscribers') || '0', 10) || null,
      videoViews: parseInt(fd.get('videoViews') || '0', 10) || null,
      born: String(fd.get('born') || '').trim() || null,
      relation: String(fd.get('relation') || '').trim() || null,
      height: String(fd.get('height') || '').trim() || null,
      weight: String(fd.get('weight') || '').trim() || null,
      ethnicity: String(fd.get('ethnicity') || '').trim() || null,
      gender: String(fd.get('gender') || '').trim() || null,
      hair: String(fd.get('hair') || '').trim() || null,
      eyes: String(fd.get('eyes') || '').trim() || null,
      measurements: String(fd.get('measurements') || '').trim() || null,
      cup: String(fd.get('cup') || '').trim() || null,
      startedYear: String(fd.get('startedYear') || '').trim() || null,
      avatar: String(fd.get('avatar') || '').trim() || null,
    };
    await upsertActress(updated);
    toast('Guardado');
    m.close();
    renderActresses(main);
  });

  refresh.addEventListener('click', async () => {
    refresh.textContent = 'Buscando…';
    refresh.disabled = true;
    const updated = await fetchActress(a.name, { force: true });
    refresh.textContent = '↻ Refrescar PH';
    refresh.disabled = false;
    if (updated.transient) {
      toast('No se pudo conectar con Pornhub');
    } else {
      m.close();
      renderActresses(main);
    }
  });
}

export async function openActressManager() {
  const main = document.getElementById('appMain');
  await renderActresses(main);
}

export default { renderActresses, openActressManager };
