import { getAllEntries, listActresses, exportAll, importAll, clearAll, getSetting, setSetting } from '../db.js';
import { toggleTheme, loadTheme } from '../services/theme.js';
import { toast, confirmDialog } from '../ui/modal.js';
import { getOptions } from '../services/options.js';

export async function renderSettings(main) {
  const theme = await loadTheme();
  const entries = await getAllEntries();
  const actresses = await listActresses();
  const defaultDevice = await getSetting('defaultDevice', 'iPad');
  const devices = await getOptions('device');

  main.innerHTML = `
    <div class="screen">
      <h2>Ajustes</h2>
      <p class="muted">Datos, privacidad y preferencias.</p>

      <div class="install-hint">
        <b>Instala la app:</b> en Safari pulsa <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.
        En Android, el navegador ofrece el banner automáticamente.
      </div>

      <div class="section-head"><h3>Registro</h3></div>
      <div class="settings-group">
        <div class="switch-row">
          <div>
            <span>Modo simple</span>
            <small>El botón del inicio registra directo sin abrir nada.</small>
          </div>
          <button class="toggle ${(await getSetting('simpleMode', false)) ? 'is-on' : ''}" id="simpleModeToggle" aria-label="Modo simple"></button>
        </div>
        <div class="settings-row">
          <div>
            <span>Dispositivo por defecto</span>
            <small>Se usa en modo simple y al abrir el modal.</small>
          </div>
          <select id="defaultDevice" style="max-width: 140px;">
            <option value="">— ninguno —</option>
            ${devices.map((d) => `<option value="${d}" ${d === defaultDevice ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="section-head"><h3>Datos</h3></div>
      <div class="settings-group">
        <div class="settings-row">
          <span>Registros totales</span>
          <small>${entries.length}</small>
        </div>
        <div class="settings-row">
          <span>Actrices en caché</span>
          <small>${actresses.length}</small>
        </div>
        <div class="settings-row">
          <span>Almacenamiento</span>
          <small>Local · IndexedDB</small>
        </div>
      </div>

      <div class="section-head"><h3>Copia de seguridad</h3></div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn" id="exportBtn">Exportar JSON</button>
        <button class="btn" id="importBtn">Importar JSON</button>
        <input type="file" id="importFile" accept="application/json" hidden />
      </div>

      <div class="section-head" style="margin-top: 24px;"><h3>Zona peligrosa</h3></div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn--danger" id="wipeBtn">Borrar todos los datos</button>
      </div>

      <p class="subtle" style="margin-top: 24px;">
        NutTracker no envía datos a ningún servidor. Todo vive en tu dispositivo.
      </p>
    </div>
  `;

  document.getElementById('defaultDevice').addEventListener('change', async (e) => {
    await setSetting('defaultDevice', e.target.value);
    toast('Dispositivo por defecto guardado');
  });

  document.getElementById('simpleModeToggle').addEventListener('click', async () => {
    const current = await getSetting('simpleMode', false);
    await setSetting('simpleMode', !current);
    document.getElementById('simpleModeToggle').classList.toggle('is-on', !current);
    toast(!current ? 'Modo simple activado' : 'Modo normal');
  });

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuttracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exportado');
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      await importAll(data);
      toast('Importado. Recargando...');
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      toast('Archivo inválido');
    } finally {
      e.target.value = '';
    }
  });

  document.getElementById('wipeBtn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Borrar todo',
      message: 'Se eliminarán todos los registros, actrices y ajustes. ¿Seguro?',
      confirmText: 'Sí, borrar todo',
      danger: true,
    });
    if (ok) {
      await clearAll();
      toast('Borrado');
      setTimeout(() => location.reload(), 600);
    }
  });
}

export default { renderSettings };
