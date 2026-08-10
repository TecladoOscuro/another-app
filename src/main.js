import './styles/main.css';
import { registerRoute, navigate, attachTabbar } from './router.js';
import { loadTheme, toggleTheme } from './services/theme.js';
import { renderHome } from './screens/home.js';
import { renderStats } from './screens/stats.js';
import { renderCalendar } from './screens/calendar.js';
import { renderSettings } from './screens/settings.js';
import { renderActresses } from './screens/actresses.js';
import { toast } from './ui/modal.js';

async function bootstrap() {
  await loadTheme();

  registerRoute('home', async (main) => {
    await renderHome(main);
    return { title: 'NutTracker' };
  });
  registerRoute('stats', async (main) => {
    await renderStats(main);
    return { title: 'Estadísticas' };
  });
  registerRoute('calendar', async (main) => {
    await renderCalendar(main);
    return { title: 'Calendario' };
  });
  registerRoute('settings', async (main) => {
    await renderSettings(main);
    return { title: 'Ajustes' };
  });
  registerRoute('actresses', async (main) => {
    await renderActresses(main);
    return { title: 'Actrices' };
  });

  attachTabbar();

  document.getElementById('themeToggle').addEventListener('click', async () => {
    await toggleTheme();
  });

  document.addEventListener('nuttracker:data-changed', () => {
    const route = document.querySelector('.tab.is-active')?.dataset.route || 'home';
    navigate(route);
  });

  await navigate('home');

  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.documentElement.classList.add('is-installed');
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  showInfoIfNeeded();
}

function showInfoIfNeeded() {
  try {
    const seen = localStorage.getItem('nuttracker-installed-hint');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!seen && !isStandalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setTimeout(() => {
        toast('Toca Compartir → Añadir a pantalla de inicio', { duration: 4500 });
        localStorage.setItem('nuttracker-installed-hint', '1');
      }, 1200);
    }
  } catch {}
}

bootstrap().catch((err) => {
  console.error('bootstrap error', err);
  document.body.innerHTML = `<div style="padding: 20px; color: #fff; background: #0b0b0f; height: 100vh;">
    <h2>Error al iniciar</h2>
    <pre style="white-space: pre-wrap;">${err.message}</pre>
  </div>`;
});
