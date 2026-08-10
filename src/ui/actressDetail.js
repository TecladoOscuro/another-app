import { getActressByName, getEntriesByActress } from '../db.js';
import { openModal, toast } from './modal.js';
import { escapeHtml, escapeAttr } from '../services/html.js';
import { formatBigNumber } from '../services/date.js';
import { searchStars, getStar } from '../services/actressSearch.js';

function openExternal(url) {
  // En navegador estándar abre nueva pestaña. En PWA iOS standalone no soporta
  // ventana privada real, pero sí podemos abrir el link.
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

function copyText(text) {
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  } catch {}
}

export async function openActressDetailModal(name, allEntries = []) {
  const lower = name.toLowerCase();
  let a = await getActressByName(name);
  if (!a) {
    const star = getStar(name);
    if (star) {
      a = {
        id: `slug:${star.n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: star.n,
        source: 'ph-dataset',
        rank: star.r,
        born: star.b,
        url: `https://www.pornhub.com/pornstar/${star.n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        fetchedAt: Date.now(),
      };
    }
  }

  const entryCount = a
    ? allEntries.filter((e) => (a.id && e.actressId === a.id) || (a.name && e.actressName === a.name)).length
    : 0;

  const slug = (a?.name || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const phUrl = `https://www.pornhub.com/pornstar/${slug}`;
  const iafd = `https://www.iafd.com/results.asp?searchtype=comprehensive&searchstring=${encodeURIComponent(name)}`;
  const freeones = `https://www.freeones.com/${slug}`;
  const babepedia = `https://www.babepedia.com/pornstar/${slug}`;
  const xvideosUrl = `https://www.xvideos.com/?k=${encodeURIComponent(name)}`;
  const xhamsterUrl = `https://xhamster.com/search/${encodeURIComponent(name)}`;
  const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(name + ' pornstar')}&type=user`;

  const avatar = a?.avatar
    ? `<img src="${escapeAttr(a.avatar)}" alt="" class="actress-detail__avatar" loading="lazy">`
    : `<div class="actress-detail__avatar actress-detail__avatar--init">${escapeHtml((name[0] || '?').toUpperCase())}</div>`;

  const meta = [];
  if (a?.rank) meta.push({ label: 'Ranking PH', value: '#' + a.rank });
  if (a?.videosCount) meta.push({ label: 'Vídeos', value: formatBigNumber(a.videosCount) });
  if (a?.subscribers) meta.push({ label: 'Suscriptores', value: formatBigNumber(a.subscribers) });
  if (a?.videoViews) meta.push({ label: 'Views', value: formatBigNumber(a.videoViews) });
  if (a?.born) meta.push({ label: 'Nacimiento', value: a.born });
  if (a?.ethnicity) meta.push({ label: 'Etnia', value: a.ethnicity });
  if (a?.relation) meta.push({ label: 'Relación', value: a.relation });
  if (a?.height) meta.push({ label: 'Altura', value: a.height });
  if (a?.weight) meta.push({ label: 'Peso', value: a.weight });
  if (a?.bust) meta.push({ label: 'Busto', value: a.bust + (a?.cup ? a.cup : '') });
  if (a?.waist) meta.push({ label: 'Cintura', value: a.waist });
  if (a?.hip) meta.push({ label: 'Cadera', value: a.hip });
  if (a?.cup) meta.push({ label: 'Copa', value: a.cup });
  if (a?.hair) meta.push({ label: 'Cabello', value: a.hair });
  if (a?.eyes) meta.push({ label: 'Ojos', value: a.eyes });
  if (a?.startedYear) meta.push({ label: 'Año de inicio', value: a.startedYear });

  const tags = (a?.tags || []).slice(0, 12);
  const tagsHtml = tags.length
    ? `<div class="actress-detail__tags">${tags.map((t) => `<span class="chip is-active" style="font-size: 11px; padding: 4px 8px;">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const links = [
    { label: 'Pornhub', url: phUrl, color: 'pink' },
    { label: 'IAFD', url: iafd, color: 'blue' },
    { label: 'FreeOnes', url: freeones, color: 'purple' },
    { label: 'Babepedia', url: babepedia, color: 'green' },
    { label: 'XVideos', url: xvideosUrl, color: 'orange' },
    { label: 'xHamster', url: xhamsterUrl, color: 'red' },
    { label: 'Reddit', url: redditUrl, color: 'pink' },
  ];

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="actress-detail">
      <div class="actress-detail__header">
        ${avatar}
        <div class="actress-detail__head-info">
          <h3 style="margin: 0 0 4px;">${escapeHtml(name)}</h3>
          <div class="muted" style="font-size: 13px;">${entryCount} ${entryCount === 1 ? 'registro' : 'registros'} en tu colección</div>
          ${a?.source ? `<div class="muted" style="font-size: 11px; margin-top: 2px;">Fuente: ${escapeHtml(a.source === 'ph-dataset' ? 'Dataset PH' : a.source)}</div>` : ''}
        </div>
      </div>

      ${meta.length ? `<div class="actress-detail__meta-grid">${meta.map((m) => `<div class="actress-detail__meta-item"><span class="muted">${escapeHtml(m.label)}</span><strong>${escapeHtml(String(m.value))}</strong></div>`).join('')}</div>` : ''}

      ${tagsHtml ? `<div style="margin-top: 14px;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Tags</div>${tagsHtml}</div>` : ''}

      <div style="margin-top: 18px;">
        <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">Perfiles y vídeos</div>
        <div class="actress-detail__links">
          ${links
            .map(
              (l) => `<button type="button" class="actress-detail__link actress-detail__link--${l.color}" data-url="${escapeAttr(l.url)}">${escapeHtml(l.label)} ↗</button>`,
            )
            .join('')}
        </div>
        <p class="subtle" style="margin-top: 8px;">Se abren en una pestaña nueva. Para navegación privada, abre Safari/InPrivate manualmente.</p>
      </div>
    </div>
  `;

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '8px';
  footer.style.width = '100%';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn';
  copyBtn.textContent = 'Copiar nombre';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn--primary';
  closeBtn.textContent = 'Cerrar';
  footer.appendChild(copyBtn);
  footer.appendChild(closeBtn);

  const m = openModal({ title: 'Actriz', body, footer });

  body.querySelectorAll('[data-url]').forEach((btn) => {
    btn.addEventListener('click', () => openExternal(btn.dataset.url));
  });
  copyBtn.addEventListener('click', () => {
    copyText(name);
    toast('Nombre copiado');
  });
  closeBtn.addEventListener('click', () => m.close());
}

export default { openActressDetailModal };
