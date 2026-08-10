const modalRoot = () => document.getElementById('modalRoot');
const toastRoot = () => document.getElementById('toastRoot');

let activeBackdropClick = null;
let activeClose = null;

export function openModal({ title, body, footer, onClose, dismissible = true }) {
  const root = modalRoot();
  root.innerHTML = '';
  root.classList.add('is-open');
  root.setAttribute('aria-hidden', 'false');

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  root.appendChild(backdrop);

  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', title || 'Diálogo');
  root.appendChild(sheet);

  const grabber = document.createElement('div');
  grabber.className = 'modal-grabber';
  sheet.appendChild(grabber);

  const header = document.createElement('div');
  header.className = 'modal-header';
  const h = document.createElement('h2');
  h.textContent = title || '';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cerrar';
  header.appendChild(h);
  header.appendChild(closeBtn);
  sheet.appendChild(header);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);
  sheet.appendChild(bodyEl);

  if (footer) {
    const f = document.createElement('div');
    f.className = 'modal-footer';
    if (footer instanceof Node) f.appendChild(footer);
    else if (typeof footer === 'string') f.innerHTML = footer;
    sheet.appendChild(f);
  }

  const close = () => {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onKey);
    if (activeBackdropClick) {
      backdrop.removeEventListener('click', activeBackdropClick);
      activeBackdropClick = null;
    }
    if (activeClose === close) activeClose = null;
    setTimeout(() => {
      if (!root.classList.contains('is-open')) root.innerHTML = '';
    }, 300);
    if (onClose) onClose();
  };

  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) close();
  };

  activeBackdropClick = dismissible
    ? (e) => {
        if (e.target === backdrop) close();
      }
    : null;
  if (activeBackdropClick) backdrop.addEventListener('click', activeBackdropClick);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  activeClose = close;

  attachSwipeToClose(sheet, close);

  return { close, body: bodyEl, sheet };
}

export function closeModal() {
  if (activeClose) {
    activeClose();
    return;
  }
  const root = modalRoot();
  if (!root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  root.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    root.innerHTML = '';
  }, 300);
}

function attachSwipeToClose(sheet, close) {
  let startY = 0;
  let currentY = 0;
  let dragging = false;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      const target = e.target;
      if (target.closest('.modal-body')?.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      dragging = true;
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (!dragging) return;
      currentY = e.touches[0].clientY - startY;
      if (currentY > 0) {
        sheet.style.transform = `translateY(${currentY}px)`;
        sheet.style.transition = 'none';
      }
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchend',
    () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (currentY > 120) close();
      currentY = 0;
    },
    { passive: true },
  );
}

export function toast(message, { duration = 2200 } = {}) {
  const root = toastRoot();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 200ms, transform 200ms';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

export function confirmDialog({ title = '¿Seguro?', message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    const body = document.createElement('div');
    body.innerHTML = `<p style="color: var(--text-muted); margin: 4px 4px 12px;">${message}</p>`;
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.width = '100%';
    const cancel = document.createElement('button');
    cancel.className = 'btn';
    cancel.textContent = cancelText;
    const ok = document.createElement('button');
    ok.className = danger ? 'btn btn--danger' : 'btn btn--primary';
    ok.textContent = confirmText;
    footer.appendChild(cancel);
    footer.appendChild(ok);
    const m = openModal({ title, body, footer });
    cancel.addEventListener('click', () => {
      m.close();
      resolve(false);
    });
    ok.addEventListener('click', () => {
      m.close();
      resolve(true);
    });
  });
}
