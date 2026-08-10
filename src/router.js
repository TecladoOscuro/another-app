const routes = new Map();
let currentRoute = null;
let currentUnmount = null;

export function registerRoute(name, render) {
  routes.set(name, render);
}

export async function navigate(name, params = {}) {
  if (currentUnmount) {
    try {
      await currentUnmount();
    } catch (e) {
      console.error('unmount', e);
    }
    currentUnmount = null;
  }
  const render = routes.get(name);
  if (!render) {
    console.warn('Ruta desconocida:', name);
    return;
  }
  currentRoute = name;
  const main = document.getElementById('appMain');
  main.innerHTML = '';
  const titleEl = document.getElementById('appTitle');
  const result = await render(main, params);
  if (typeof result === 'function') currentUnmount = result;
  if (result && result.title) titleEl.textContent = result.title;
  else titleEl.textContent = 'NutTracker';

  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('is-active', t.dataset.route === name);
  });

  main.scrollTop = 0;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function getRoutes() {
  return [...routes.keys()];
}

export function attachTabbar() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const route = tab.dataset.route;
      if (!route || route === 'record') return;
      navigate(route);
    });
  });
}
