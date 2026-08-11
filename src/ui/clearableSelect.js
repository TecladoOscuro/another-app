import { getOptions } from '../services/options.js';
import { escapeHtml } from '../services/html.js';

export function createClearableSelect({ name, label, value = '', optionKey, placeholder = '—' }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `
    <label>${label}</label>
    <div class="clearable-select">
      <select name="${name}">
        <option value="">${placeholder}</option>
      </select>
      <button type="button" class="clearable-select__clear" aria-label="Limpiar" hidden>
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
  `;
  const select = wrap.querySelector('select');
  const clearBtn = wrap.querySelector('.clearable-select__clear');

  (async () => {
    const opts = await getOptions(optionKey);
    select.innerHTML = `<option value="">${placeholder}</option>` + opts.map((o) => `<option value="${escapeHtml(o)}" ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
    updateClearVisibility();
  })();

  function updateClearVisibility() {
    clearBtn.hidden = !select.value;
  }

  select.addEventListener('change', updateClearVisibility);

  clearBtn.addEventListener('click', () => {
    select.value = '';
    select.dispatchEvent(new Event('change'));
    updateClearVisibility();
    select.focus();
  });

  return { wrap, select };
}
