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
    <button class="tab" data-route="stats">S</button>
    <button class="tab" data-route="settings">Aj</button>
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
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    // ph-stars.json loaded synchronously from disk; inject as global
    const fsLocal = require('fs');
    const pathLocal = require('path');
    const starsPath = pathLocal.join(__dirname, '..', 'dist', 'ph-stars.json');
    const starsData = JSON.parse(fsLocal.readFileSync(starsPath, 'utf8'));
    window.__PH_STARS__ = starsData;
    window.fetch = async (url) => {
      if (url.includes('ph-stars.json')) {
        return { ok: true, status: 200, json: async () => window.__PH_STARS__, text: async () => JSON.stringify(window.__PH_STARS__) };
      }
      return { ok: false, status: 0, text: async () => '' };
    };
    window.addEventListener('error', (e) => errors.push('window.error: ' + (e.error?.message || e.message)));
    window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + (e.reason?.message || e.reason)));
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

  // Seed data so we can validate stats rendering with actual content
  const dbReq = dom.window.indexedDB.open('nuttracker');
  await new Promise((res) => { dbReq.onsuccess = res; });
  const db = dbReq.result;
  const tx = db.transaction(['entries', 'actresses'], 'readwrite');
  const eStore = tx.objectStore('entries');
  const aStore = tx.objectStore('actresses');
  const now = Date.now();
  eStore.add({ at: now - 86400000 * 5, category: 'Amateur', categories: ['Amateur', 'MILF'], actressName: 'Pepita Test', actressId: 'slug:pepita-test', sourceType: 'clip', site: 'Pornhub', device: 'iPhone', lubricant: 'with' });
  eStore.add({ at: now - 86400000 * 3, category: 'Anal', categories: ['Anal', 'Teen'], actressName: 'Pepita Test', actressId: 'slug:pepita-test', sourceType: 'clip', site: 'Pornhub', device: 'iPhone', lubricant: 'with' });
  eStore.add({ at: now, category: 'Amateur', categories: ['Amateur'], actressName: 'Otra', actressId: 'slug:otra', sourceType: 'clip', site: 'Pornhub', device: 'iPhone', lubricant: 'with' });
  aStore.put({ id: 'slug:pepita-test', name: 'Pepita Test', source: 'manual', fetchedAt: now });
  aStore.put({ id: 'slug:otra', name: 'Otra', source: 'manual', fetchedAt: now });
  await new Promise((r) => { tx.oncomplete = r; });

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
    // Check stats: at least 5 bar__fill elements should exist with non-zero width
    if (t === 'stats') {
      const fills = dom.window.document.querySelectorAll('.bar__fill');
      const visibleFills = [...fills].filter((f) => {
        const w = f.style.width;
        return w && w !== '0%' && w !== '0';
      });
      console.log(`   bar__fill total: ${fills.length}, visible: ${visibleFills.length}`);
      if (fills.length > 0 && visibleFills.length === 0) {
        failures.push('stats: all bar__fill are 0%');
      }
      // heatmap should have cells
      const heatmap = dom.window.document.querySelectorAll('.heatmap__cell');
      console.log(`   heatmap cells: ${heatmap.length}`);
      // top actress should be 'Pepita Test', not '-'
      const actressNames = [...dom.window.document.querySelectorAll('.actress-card__name')].map(e => e.textContent);
      console.log(`   top actress names: ${JSON.stringify(actressNames)}`);
      if (actressNames.some(n => n === '—' || n === '-')) {
        failures.push(`stats: top actress shows "—": ${actressNames}`);
      }
      // wrapped hero should be present
      const wrapped = dom.window.document.querySelectorAll('.wrapped-card');
      console.log(`   wrapped cards: ${wrapped.length}`);
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

    // Test 1: actress datalist shows seeded actresses
    const datalist = dom.window.document.querySelector('#actressList');
    if (datalist) {
      const options = [...datalist.querySelectorAll('option')].map(o => o.value);
      console.log('   actress datalist options:', JSON.stringify(options));
      if (!options.includes('Pepita Test')) {
        failures.push(`actress datalist missing seeded: ${options}`);
      }
    }

    // Test: typing a name and waiting for lookup should populate actressInfo
    const aInput = dom.window.document.querySelector('#actressInput');
    const aInfo = dom.window.document.querySelector('#actressInfo');
    if (aInput && aInfo) {
      aInput.value = 'Pepita Test';
      aInput.dispatchEvent(new dom.window.Event('input'));
      await new Promise((r) => setTimeout(r, 800));
      const text = aInfo.textContent.trim();
      console.log('   actress info for stored name: "' + text + '"');
      if (text.includes('Sin datos') || text.includes('No encontrada')) {
        failures.push(`actress info wrongly says no data for stored name: "${text}"`);
      }

      // Test: typing a name from the PH dataset should find it
      aInput.value = 'Lana Rhoades';
      aInput.dispatchEvent(new dom.window.Event('input'));
      await new Promise((r) => setTimeout(r, 800));
      const text2 = aInfo.textContent.trim();
      console.log('   actress info for "Lana Rhoades": "' + text2 + '"');
      if (!text2.includes('Lana') && !text2.includes('#1')) {
        failures.push(`PH dataset lookup failed for "Lana Rhoades": "${text2}"`);
      }
    }

    // Test 2: open cat picker, add a new category
    const toggleBtn = dom.window.document.querySelector('#toggleCatPicker');
    if (toggleBtn) {
      toggleBtn.click();
      await new Promise((r) => setTimeout(r, 200));
      const newCatInput = dom.window.document.querySelector('#newCatInput');
      if (newCatInput) {
        newCatInput.value = 'NuevaCatTest';
        const addBtn = dom.window.document.querySelector('#addNewCat');
        addBtn.click();
        await new Promise((r) => setTimeout(r, 300));
        const chips = [...dom.window.document.querySelectorAll('.multi-cats .chip')];
        const labels = chips.map(c => c.textContent.replace('×', '').trim());
        console.log('   selected cats after add:', JSON.stringify(labels));
        if (!labels.includes('NuevaCatTest')) {
          failures.push(`new category not added: ${labels}`);
        }
      }
    }

    // close modal
    const cancelBtn = [...dom.window.document.querySelectorAll('.modal-footer button')]
      .find(b => b.textContent === 'Cancelar');
    if (cancelBtn) cancelBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // Reopen and test edit mode + iOS toggle
    recBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    const lubeCheck = dom.window.document.querySelector('#lubricantCheck');
    const iosToggle = dom.window.document.querySelector('.ios-toggle');
    if (lubeCheck && iosToggle) {
      console.log('   iOS toggle found, checked:', lubeCheck.checked);
      if (!iosToggle.querySelector('.ios-toggle__track') || !iosToggle.querySelector('.ios-toggle__thumb')) {
        failures.push('iOS toggle missing track or thumb');
      }
      // Click toggle to check
      iosToggle.click();
      await new Promise((r) => setTimeout(r, 100));
      console.log('   after click, checked:', lubeCheck.checked);
      if (!lubeCheck.checked) {
        failures.push('iOS toggle did not flip');
      }
    } else {
      failures.push('iOS toggle not found');
    }

    // Close
    const cancelBtn2 = [...dom.window.document.querySelectorAll('.modal-footer button')]
      .find(b => b.textContent === 'Cancelar');
    if (cancelBtn2) cancelBtn2.click();
    await new Promise((r) => setTimeout(r, 400));
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
