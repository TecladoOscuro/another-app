# NutTracker

PWA para registrar y analizar tu actividad personal. Funciona offline, se instala en iPhone/Android y se aloja en GitHub Pages.

## Stack

- Vanilla JS + Vite
- IndexedDB (vía `idb`) para datos locales
- PWA con service worker y manifest instalable
- Sin backend, sin tracking, todo en tu dispositivo

## Levantar

```bash
npm install
npm run dev      # local en http://localhost:5173
npm run build    # genera dist/
npm run deploy   # publica en GitHub Pages
```

## Desplegar en GitHub Pages

1. Sube el repo a GitHub.
2. En `vite.config.js` cambia `base: './'` por `base: '/nuttracker/'` si el repo se llama `nuttracker`.
3. `npm run deploy`.

## Privacidad

Todos los datos viven en IndexedDB del navegador. No hay servidor. Si borras el sitio del navegador, los datos se van.
