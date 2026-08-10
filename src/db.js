const DB_NAME = 'nuttracker';
const DB_VERSION = 2;

const STORES = {
  entries: 'entries',
  settings: 'settings',
  actresses: 'actresses',
  customOptions: 'customOptions',
};

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.entries)) {
        const store = db.createObjectStore(STORES.entries, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('byAt', 'at', { unique: false });
        store.createIndex('byCategory', 'category', { unique: false });
        store.createIndex('byActressId', 'actressId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.actresses)) {
        const store = db.createObjectStore(STORES.actresses, { keyPath: 'id' });
        store.createIndex('byName', 'name', { unique: false });
      }
      if (e.oldVersion < 2 && !db.objectStoreNames.contains(STORES.customOptions)) {
        const store = db.createObjectStore(STORES.customOptions, { keyPath: 'key' });
        store.createIndex('byKey', 'key', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDb().then((db) => {
    const t = db.transaction(storeName, mode);
    return { store: t.objectStore(storeName), tx: t };
  });
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addEntry(entry) {
  const { store, tx: t } = await tx(STORES.entries, 'readwrite');
  const id = await reqToPromise(store.add(entry));
  await txDone(t);
  return id;
}

export async function updateEntry(entry) {
  const { store, tx: t } = await tx(STORES.entries, 'readwrite');
  await reqToPromise(store.put(entry));
  await txDone(t);
}

export async function deleteEntry(id) {
  const { store, tx: t } = await tx(STORES.entries, 'readwrite');
  await reqToPromise(store.delete(id));
  await txDone(t);
}

export async function getEntry(id) {
  const { store } = await tx(STORES.entries);
  return reqToPromise(store.get(id));
}

export async function getAllEntries() {
  const { store } = await tx(STORES.entries);
  return reqToPromise(store.getAll());
}

export async function getEntriesByActress(actressId) {
  const { store } = await tx(STORES.entries);
  const idx = store.index('byActressId');
  return reqToPromise(idx.getAll(actressId));
}

export async function getEntriesInRange(fromTs, toTs) {
  const all = await getAllEntries();
  return all.filter((e) => e.at >= fromTs && e.at < toTs);
}

export async function getSetting(key, fallback = null) {
  const { store } = await tx(STORES.settings);
  const row = await reqToPromise(store.get(key));
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  const { store, tx: t } = await tx(STORES.settings, 'readwrite');
  await reqToPromise(store.put({ key, value }));
  await txDone(t);
}

export async function upsertActress(actress) {
  const { store, tx: t } = await tx(STORES.actresses, 'readwrite');
  await reqToPromise(store.put(actress));
  await txDone(t);
}

export async function getActress(id) {
  const { store } = await tx(STORES.actresses);
  return reqToPromise(store.get(id));
}

export async function getActressByName(name) {
  const all = await listActresses();
  const lower = String(name).toLowerCase();
  return all.find((a) => a.name && a.name.toLowerCase() === lower) || null;
}

export async function listActresses() {
  const { store } = await tx(STORES.actresses);
  return reqToPromise(store.getAll());
}

export async function exportAll() {
  const [entries, settings, actresses] = await Promise.all([
    getAllEntries(),
    reqToPromise((await tx(STORES.settings)).store.getAll()),
    listActresses(),
  ]);
  return { entries, settings, actresses, exportedAt: new Date().toISOString() };
}

export async function importAll(data) {
  if (!data || typeof data !== 'object') return;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const t = db.transaction(
      [STORES.entries, STORES.settings, STORES.actresses],
      'readwrite',
    );
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    if (Array.isArray(data.entries)) {
      const s = t.objectStore(STORES.entries);
      data.entries.forEach((e) => s.put(e));
    }
    if (Array.isArray(data.settings)) {
      const s = t.objectStore(STORES.settings);
      data.settings.forEach((row) => s.put(row));
    }
    if (Array.isArray(data.actresses)) {
      const s = t.objectStore(STORES.actresses);
      data.actresses.forEach((a) => s.put(a));
    }
  });
}

export async function clearAll() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const t = db.transaction(
      [STORES.entries, STORES.settings, STORES.actresses, STORES.customOptions],
      'readwrite',
    );
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.objectStore(STORES.entries).clear();
    t.objectStore(STORES.settings).clear();
    t.objectStore(STORES.actresses).clear();
    t.objectStore(STORES.customOptions).clear();
  });
}

export async function getCustomOptions(key, fallback = []) {
  const { store } = await tx(STORES.customOptions);
  const row = await reqToPromise(store.get(key));
  return row ? row.values : fallback;
}

export async function setCustomOptions(key, values) {
  const { store, tx: t } = await tx(STORES.customOptions, 'readwrite');
  await reqToPromise(store.put({ key, values }));
  await txDone(t);
}

export async function addCustomOption(key, value) {
  const values = await getCustomOptions(key, []);
  if (values.includes(value)) return values;
  const next = [...values, value];
  await setCustomOptions(key, next);
  return next;
}

function txDone(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const __STORES = STORES;
