import { getSetting, setSetting } from '../db.js';

const KEY = 'theme';

export async function loadTheme() {
  const stored = await getSetting(KEY, null);
  const prefersDark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
  return theme;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0b0f' : '#f5f5f7');
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => {
      if (m.getAttribute('media')) {
        m.setAttribute('content', theme === 'dark' ? '#0b0b0f' : '#f5f5f7');
      }
    });
}

export async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  await setSetting(KEY, next);
  return next;
}

export function watchSystemTheme(callback) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (!localStorage.getItem('theme-manual')) callback(mq.matches ? 'dark' : 'light');
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
