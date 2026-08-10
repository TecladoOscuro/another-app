import { getOptions, appendCustomOption } from '../services/options.js';
import { openModal, toast } from './modal.js';

export function createSelectWithAdd({ name, label, value = '', placeholder = '—', optionKey }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `
    <label>${label}</label>
    <div class="select-with-add">
      <select name="${name}"></select>
      <button type="button" class="btn" data-action="add">+ Añadir</button>
    </div>
  `;
  const select = wrap.querySelector('select');
  select.innerHTML = `<option value="">${placeholder}</option>`;

  async function refresh() {
    const opts = await getOptions(optionKey);
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    for (const o of opts) {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      if (o === current) opt.selected = true;
      select.appendChild(opt);
    }
    if (value && !opts.includes(value)) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      opt.selected = true;
      select.appendChild(opt);
    }
  }

  refresh();

  wrap.querySelector('[data-action="add"]').addEventListener('click', async () => {
    const body = document.createElement('div');
    body.innerHTML = `
      <p class="muted" style="margin: 4px 4px 12px;">Añade una opción nueva a la lista.</p>
      <div class="field">
        <label>Nombre</label>
        <input type="text" id="newOptionInput" autocomplete="off" />
      </div>
      <div id="newOptionSuggestions" class="chips" style="margin-top: 6px;"></div>
    `;
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.width = '100%';
    const cancel = document.createElement('button');
    cancel.className = 'btn';
    cancel.textContent = 'Cancelar';
    const ok = document.createElement('button');
    ok.className = 'btn btn--primary';
    ok.textContent = 'Añadir';
    footer.appendChild(cancel);
    footer.appendChild(ok);

    const m = openModal({ title: `Nueva opción · ${label}`, body, footer });
    const input = body.querySelector('#newOptionInput');
    const suggestions = body.querySelector('#newOptionSuggestions');
    const opts = await getOptions(optionKey);
    input.value = '';
    opts.forEach((o) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = o;
      chip.addEventListener('click', () => {
        input.value = o;
      });
      suggestions.appendChild(chip);
    });
    setTimeout(() => input.focus(), 100);

    cancel.addEventListener('click', () => m.close());
    ok.addEventListener('click', async () => {
      const v = input.value.trim();
      if (!v) {
        toast('Escribe un nombre');
        return;
      }
      await appendCustomOption(optionKey, v);
      value = v;
      await refresh();
      select.value = v;
      toast('Añadido');
      m.close();
    });
  });

  return { wrap, select, refresh };
}
