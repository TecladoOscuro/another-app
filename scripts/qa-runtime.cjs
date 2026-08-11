// Runtime QA: ejecuta el dist en jsdom y valida que no hay errores y que cada pantalla renderiza contenido.
// Uso fake-indexeddb para IDB y sirvo el dataset estático desde disco.
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

const minLengths = {
  home: 200,
  calendar: 200,
  stats: 1000,
  settings: 200,
};

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.indexedDB = fakeIDB.indexedDB;
    window.IDBKeyRange = fakeIDB.IDBKeyRange;
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const fsLocal = require('fs');
    const pathLocal = require('path');
    const starsData = JSON.parse(fsLocal.readFileSync(pathLocal.join(distDir, 'ph-stars.json'), 'utf8'));
    window.__PH_STARS__ = starsData;
    let enrichedData = [];
    const enrPath = pathLocal.join(distDir, 'ph-stars-enriched.json');
    if (fsLocal.existsSync(enrPath)) {
      enrichedData = JSON.parse(fsLocal.readFileSync(enrPath, 'utf8'));
    }
    window.__PH_STARS_E__ = enrichedData;
    window.fetch = async (url) => {
      if (url.includes('ph-stars.json')) return { ok: true, status: 200, json: async () => window.__PH_STARS__, text: async () => JSON.stringify(window.__PH_STARS__) };
      if (url.includes('ph-stars-enriched.json')) return { ok: true, status: 200, json: async () => window.__PH_STARS_E__, text: async () => JSON.stringify(window.__PH_STARS_E__) };
      return { ok: false, status: 0, text: async () => '' };
    };
    window.addEventListener('error', (e) => errors.push('window.error: ' + (e.error?.stack || e.error?.message || e.message)));
    window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + (e.reason?.stack || e.reason?.message || e.reason)));
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

(async () => {
  // Espera inicial (más larga para que el dataset cargue)
  await new Promise((r) => setTimeout(r, 5000));

  const failures = [];

  // Seed data
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
  eStore.add({ at: now, category: 'MILF', categories: ['MILF', 'Blonde', 'Big Tits'], actressName: 'Mia Malkova', actressId: 'slug:mia-malkova', sourceType: 'clip', site: 'Pornhub', device: 'iPad', lubricant: 'with' });
  aStore.put({ id: 'slug:pepita-test', name: 'Pepita Test', source: 'manual', fetchedAt: now });
  aStore.put({ id: 'slug:otra', name: 'Otra', source: 'manual', fetchedAt: now });
  aStore.put({ id: 'slug:mia-malkova', name: 'Mia Malkova', source: 'ph-dataset', rank: '5', born: '1992-07-01', ethnicity: 'Caucasian', hair: 'Brunette', height: '163 cm', weight: '52 kg', cup: 'C', bust: '32', waist: '58', hip: '85', fetchedAt: now });
  await new Promise((r) => { tx.oncomplete = r; });

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
    // jsdom no calcula dvh, así que el scroll test es solo informativo
    if (t === 'home' || t === 'stats') {
      const m = dom.window.document.getElementById('appMain');
      console.log(`   scroll: ${m.scrollHeight}px / ${m.clientHeight}px`);
    }
    if (t === 'stats') {
      const fills = dom.window.document.querySelectorAll('.row-item__bar span');
      const visible = [...fills].filter((f) => f.style.width && f.style.width !== '0%');
      console.log(`   bar__fill visible: ${visible.length}/${fills.length}`);
    }
    console.log(`OK ${t}: ${len} chars, 0 errors`);
  }

  // Modal: test record creation with actress + auto-categories
  errors.length = 0;
  const homeTab = dom.window.document.querySelector('[data-route="home"]');
  homeTab.click();
  await new Promise((r) => setTimeout(r, 600));
  const recBtn = dom.window.document.getElementById('recordBtn');
  if (!recBtn) {
    failures.push('recordBtn not found on home');
  } else {
    recBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
    const modal = dom.window.document.querySelector('.modal-sheet');
    if (!modal) failures.push('record modal did not open');
    else if (errors.length > 0) failures.push('record modal errors: ' + JSON.stringify(errors));
    else {
      console.log('OK record modal: opened');

      // Test: typing Alexis Texas should find Blonde + MILF
      const aInput = dom.window.document.querySelector('#actressInput');
      const aInfo = dom.window.document.querySelector('#actressInfo');
      if (aInput && aInfo) {
        aInput.value = 'Alexis Texas';
        aInput.dispatchEvent(new dom.window.Event('input'));
        await new Promise((r) => setTimeout(r, 2000));
        const text = aInfo.textContent.replace(/\s+/g, ' ').trim();
        console.log('   actress info for "Alexis Texas": "' + text.slice(0, 250) + '"');
        if (!text.includes('Blonde')) {
          failures.push(`Alexis Texas should show "Blonde" auto-category: "${text}"`);
        }
        if (!text.includes('MILF')) {
          failures.push(`Alexis Texas should show "MILF" auto-category: "${text}"`);
        }
      }

      // Test: open cat picker, add a new category
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
          const labels = chips.map((c) => c.textContent.replace('×', '').trim());
          console.log('   selected cats after add:', JSON.stringify(labels));
          if (!labels.includes('NuevaCatTest')) {
            failures.push(`new category not added: ${labels}`);
          }
        }
      }

      // Test: iOS toggle
      const lubeCheck = dom.window.document.querySelector('#lubricantCheck');
      const iosToggle = dom.window.document.querySelector('.ios-toggle');
      if (lubeCheck && iosToggle) {
        console.log('   iOS toggle found, checked:', lubeCheck.checked);
        if (!iosToggle.querySelector('.ios-toggle__track') || !iosToggle.querySelector('.ios-toggle__thumb')) {
          failures.push('iOS toggle missing track or thumb');
        }
        iosToggle.click();
        await new Promise((r) => setTimeout(r, 100));
        if (!lubeCheck.checked) {
          failures.push('iOS toggle did not flip');
        } else {
          console.log('   iOS toggle works');
        }
      } else {
        failures.push('iOS toggle not found');
      }
    }

    // Stats: check Mia Malkova appears
    errors.length = 0;
    const cancelBtn = [...dom.window.document.querySelectorAll('.modal-footer button')].find((b) => b.textContent === 'Cancelar');
    if (cancelBtn) cancelBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    const homeTab2 = dom.window.document.querySelector('[data-route="home"]');
    homeTab2.click();
    await new Promise((r) => setTimeout(r, 400));
    const statsTab = dom.window.document.querySelector('[data-route="stats"]');
    statsTab.click();
    await new Promise((r) => setTimeout(r, 1500));
    const names = [...dom.window.document.querySelectorAll('.row-item__title')].map((e) => e.textContent);
    console.log('   stats actress names:', JSON.stringify(names.filter((n) => /Mia|Pepita|Otra/.test(n))));
    if (names.some((n) => /^slug:/.test(n))) {
      failures.push(`stats shows raw slug: ${names}`);
    }
  }

  if (failures.length > 0) {
    console.error('\nQA FAILED:');
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('\nQA PASS');
  process.exit(0);
})();
