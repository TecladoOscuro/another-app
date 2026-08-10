const modalRoot = () => document.getElementById('modalRoot');
const toastRoot = () => document.getElementById('toastRoot');

const stack = [];

function applyZIndex(root) {
  const base = 100;
  const step = 10;
  root.style.zIndex = String(base + stack.length * step);
}

export function openModal({ title, body, footer, onClose, dismissible = true }) {
  const root = modalRoot();
  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', title || 'Diálogo');

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
  if (dismissible) header.appendChild(closeBtn);
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

  const entry = { sheet, root, dismissible, onClose, onKey: null };
  stack.push(entry);
  applyZIndex(root);
  root.appendChild(sheet);
  requestAnimationFrame(() => {
    sheet.classList.add('is-open');
    root.classList.add('is-open');
  });

  const close = () => {
    if (!stack.includes(entry)) return;
    sheet.classList.remove('is-open');
    document.removeEventListener('keydown', entry.onKey);
    setTimeout(() => {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }, 280);
    const idx = stack.indexOf(entry);
    if (idx >= 0) stack.splice(idx, 1);
    if (stack.length === 0) {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
    } else {
      applyZIndex(root);
    }
    if (entry.onClose) entry.onClose();
  };

  entry.onKey = (e) => {
    if (e.key === 'Escape' && entry.dismissible && stack[stack.length - 1] === entry) {
      close();
    }
  };
  document.addEventListener('keydown', entry.onKey);

  if (dismissible) {
    closeBtn.addEventListener('click', close);
    attachSwipeToClose(sheet, close);
  }

  return { close, body: bodyEl, sheet };
}

export function closeModal() {
  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    top._close && top._close();
  }
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

export function toast(message, { duration = 2400, type = 'default' } = {}) {
  const root = toastRoot();
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'default' ? '' : ` is-${type}`);
  el.textContent = message;
  root.appendChild(el);

  let startX = 0;
  let currentX = 0;
  let dragging = false;
  let dismissed = false;

  const onStart = (e) => {
    if (dismissed) return;
    dragging = true;
    startX = e.touches[0].clientX;
    el.style.transition = 'none';
  };
  const onMove = (e) => {
    if (!dragging || dismissed) return;
    currentX = e.touches[0].clientX - startX;
    const absX = Math.abs(currentX);
    const ratio = Math.min(1, absX / 120);
    el.style.transform = `translateX(${currentX}px)`;
    el.style.opacity = String(1 - ratio * 0.6);
  };
  const onEnd = () => {
    if (!dragging || dismissed) return;
    dragging = false;
    el.style.transition = '';
    if (Math.abs(currentX) > 100) {
      dismissed = true;
      el.classList.add('is-leaving');
      const dir = currentX > 0 ? 1 : -1;
      el.style.transform = `translateX(${dir * 400}px)`;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 240);
    } else {
      el.style.transform = '';
      el.style.opacity = '';
    }
    currentX = 0;
  };
  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: true });
  el.addEventListener('touchend', onEnd, { passive: true });

  setTimeout(() => {
    if (dismissed) return;
    dismissed = true;
    el.classList.add('is-leaving');
    el.style.transform = 'translateY(-30px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 240);
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
