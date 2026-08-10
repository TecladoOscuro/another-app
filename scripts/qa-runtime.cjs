// QA Runtime check: ejecuta el dist en jsdom y valida que no hay errores
// y que cada pantalla renderiza contenido. Sale con código 1 si falla.
//
// Uso: node scripts/qa-runtime.js
//      o:  node scripts/qa-runtime.js [path/to/dist]

const { JSDOM } = require('jsdom');
const fakeIDB = require('fake-indexeddb');
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] || path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('No existe el dist:', distDir);
  process.exit(1);
}

const html = `<!doctype html><html><body>
<div id="app">
  <header><div class="status-bar-spacer"></div><div class="app-header__inner">
    <h1 id="appTitle"></h1><button id="themeToggle"></button></div></header>
  <main class="app-main" id="appMain"></main>
  <nav id="tabbar">
    <button class="tab" data-route="home">H</button>
    <button class="tab" data-route="calendar">C</button>
    <button class="tab tab--record" data-route="record">R</button>
    <button class="tab" data-route="stats">S</button>
    <button class="tab" data-route="settings">A</button>
  </nav>
</div>
<div id="modalRoot"></div>
<div id="toastRoot"></div>
</body></html>`;

const jsFile = fs.readdirSync(path.join(distDir, 'assets')).find((f) => f.endsWith('.js'));
if (!jsFile) {
  console.error('No bundle en dist/assets/');
  process.exit(1);
}
const jsCode = fs.readFileSync(path.join(distDir, 'assets', jsFile), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.indexedDB = fakeIDB.indexedDB;
    window.IDBKeyRange = fakeIDB.IDBKeyRange;
    window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    window.fetch = async () => ({ ok: false, text: async () => '' });
    window.addEventListener('error', (e) => {
      errors.push('window.error: ' + (e.error?.stack || e.error?.message || e.message));
    });
    window.addEventListener('unhandledrejection', (e) => {
      errors.push('unhandledrejection: ' + (e.reason?.stack || e.reason?.message || e.reason));
    });
  },
});

dom.window.console.error = (...args) => {
  errors.push('console.error: ' + args.map((a) => a?.stack || a?.message || String(a)).join(' '));
};

try {
  dom.window.eval(jsCode);
} catch (e) {
  console.error('EVAL ERROR:', e.stack || e.message);
  process.exit(1);
}

const minLengths = {
  home: 200,
  calendar: 200,
  stats: 1000,
  settings: 200,
};

(async () => {
  // Espera inicial
  await new Promise((r) => setTimeout(r, 3000));

  const failures = [];
  for (const t of ['home', 'stats', 'calendar', 'settings']) {
    errors.length = 0;
    const tab = dom.window.document.querySelector(`[data-route="${t}"]`);
    if (!tab) {
      failures.push(`${t}: tab not found`);
      continue;
    }
    tab.click();
    await new Promise((r) => setTimeout(r, 1200));
    const m = dom.window.document.getElementById('appMain');
    const len = m?.innerHTML.length || 0;
    if (errors.length > 0) {
      failures.push(`${t}: errors = ${JSON.stringify(errors)}`);
    }
    if (len < minLengths[t]) {
      failures.push(`${t}: rendered only ${len} chars (expected >= ${minLengths[t]})`);
    }
    console.log(`OK ${t}: ${len} chars, 0 errors`);
  }

  // Modal
  errors.length = 0;
  const homeTab = dom.window.document.querySelector('[data-route="home"]');
  homeTab.click();
  await new Promise((r) => setTimeout(r, 600));
  const recBtn = dom.window.document.getElementById('recordBtn');
  if (recBtn) {
    recBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    const modal = dom.window.document.querySelector('.modal-sheet');
    if (!modal) failures.push('record modal did not open');
    else if (errors.length > 0) failures.push('record modal errors: ' + JSON.stringify(errors));
    else console.log('OK record modal: opened');
  } else {
    failures.push('recordBtn not found on home');
  }

  if (failures.length > 0) {
    console.error('\nQA FAILED:');
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('\nQA PASS');
  process.exit(0);
})();
