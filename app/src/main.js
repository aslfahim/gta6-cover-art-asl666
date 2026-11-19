// Wires the Highway Run editor: photo upload (file picker and drag-drop), per-panel crop
// controls, caption editing, export-size switching and PNG export. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).
import { drawCover, EXPORT_SIZES, PANEL_NAMES } from './cover.js';
import { freshState, hitPanel, loadImage, wireCanvasControls } from './panels.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const status = document.getElementById('status');
const panelList = document.getElementById('panel-list');
const state = freshState();
let lastPhoto = null;

function redraw() {
  drawCover(canvas, state);
}

/** Rebuilds the per-panel cards (name, own upload, zoom slider) under the photo group. */
function renderPanelList() {
  panelList.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card' + (state.selected === i ? ' selected' : '');
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = `${i + 1}. ${PANEL_NAMES[i]}`;
    const mini = document.createElement('button');
    mini.type = 'button';
    mini.className = 'mini';
    mini.textContent = panel.img ? 'Change photo' : 'Add photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    mini.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      await setPanelPhoto(i, file.files[0]);
    });
    row.append(name, mini, file);
    const zoomRow = document.createElement('div');
    zoomRow.className = 'row';
    const zoomLabel = document.createElement('span');
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '100';
    zoom.max = '400';
    zoom.value = String(Math.round(panel.zoom * 100));
    zoom.setAttribute('aria-label', `Zoom for ${PANEL_NAMES[i]}`);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value) / 100;
      redraw();
    });
    zoomRow.append(zoomLabel, zoom);
    card.append(row, zoomRow);
    card.addEventListener('click', (event) => {
      if (event.target === zoom || event.target === mini) return;
      state.selected = i;
      renderPanelList();
      redraw();
    });
    panelList.append(card);
  });
}

async function setPanelPhoto(i, fileOrUrl) {
  const img = await loadImage(fileOrUrl);
  state.panels[i].img = img;
  state.panels[i].zoom = 1;
  state.panels[i].ox = 0;
  state.panels[i].oy = 0;
  if (fileOrUrl instanceof File) lastPhoto = img;
  state.selected = i;
  renderPanelList();
  redraw();
}

async function setAllPanelsPhoto(fileOrUrl) {
  const img = await loadImage(fileOrUrl);
  // Stagger each panel's crop so the three panels show different slices of one photo:
  // the first panel the left/top of it, the last the right/bottom.
  const landscape = canvas.width >= canvas.height;
  state.panels.forEach((panel, i) => {
    panel.img = img;
    panel.zoom = 1;
    const off = (i - 1) * 0.18;
    panel.ox = landscape ? -off : 0;
    panel.oy = landscape ? 0 : -off;
  });
  if (fileOrUrl instanceof File) lastPhoto = img;
  renderPanelList();
  redraw();
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  // First photo fills every empty panel; extra photos fill the panels in order.
  if (state.panels.every((p) => !p.img)) {
    await setAllPanelsPhoto(files[0]);
    for (let i = 1; i < files.length && i < 3; i++) await setPanelPhoto(i, files[i]);
  } else {
    for (let i = 0; i < files.length; i++) await setPanelPhoto(state.selected, files[i]);
  }
  status.textContent = 'Photo loaded — drag on a panel to position it.';
});

document.getElementById('fill-all').addEventListener('click', async () => {
  if (!lastPhoto) {
    status.textContent = 'Add a photo first, then fill all panels with it.';
    return;
  }
  await setAllPanelsPhoto(lastPhoto);
  status.textContent = 'All three panels now use the same photo.';
});

// Caption controls.
captionInput.addEventListener('input', () => {
  state.caption.text = captionInput.value;
  redraw();
});
document.getElementById('caption-size').addEventListener('input', (e) => {
  state.caption.sizePct = Number(e.target.value);
  document.getElementById('caption-size-val').textContent = `${e.target.value}%`;
  redraw();
});
document.getElementById('caption-color').addEventListener('input', (e) => {
  state.caption.color = e.target.value;
  redraw();
});
document.getElementById('caption-style').addEventListener('change', (e) => {
  state.caption.style = e.target.value;
  redraw();
});
document.getElementById('caption-shadow').addEventListener('change', (e) => {
  state.caption.shadow = e.target.checked;
  redraw();
});

// Export-size switching changes the preview canvas itself, so what you see is what exports.
function applySize(name) {
  const size = EXPORT_SIZES[name] ?? EXPORT_SIZES.square;
  state.size = name;
  canvas.width = size.w;
  canvas.height = size.h;
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === name);
  });
  redraw();
}
document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => applySize(b.dataset.size));
});

// Drag a photo file straight onto the preview to fill the panel under the cursor.
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  canvas.classList.add('drop-target');
});
canvas.addEventListener('dragleave', () => canvas.classList.remove('drop-target'));
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  canvas.classList.remove('drop-target');
  const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  const rect = canvas.getBoundingClientRect();
  const i = hitPanel(canvas,
    ((e.clientX - rect.left) / rect.width) * canvas.width,
    ((e.clientY - rect.top) / rect.height) * canvas.height);
  if (i === -1) await setAllPanelsPhoto(file);
  else await setPanelPhoto(i, file);
  status.textContent = 'Photo loaded — drag on a panel to position it.';
});

// Export: render the cover at the chosen size and download it as a PNG.
document.getElementById('export').addEventListener('click', () => {
  const size = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `highway-run-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved highway-run-${size.w}x${size.h}.png`;
  }, 'image/png');
});

wireCanvasControls(canvas, state, () => { renderPanelList(); redraw(); });

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (sample, text) => {
    await setAllPanelsPhoto(sample);
    captionInput.value = text;
    state.caption.text = text;
    redraw();
  }, applySize);
} else {
  renderPanelList();
  redraw();
}
