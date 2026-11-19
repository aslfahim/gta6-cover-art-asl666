// Panel state and pointer control: each panel holds its own photo, zoom and pan offset.
// Dragging on the canvas pans the photo under the cursor; scrolling zooms it; clicking selects it.
import { panelLayout } from './cover.js';

/** Fresh state: three empty panels and the default caption. */
export function freshState() {
  return {
    panels: [
      { img: null, zoom: 1, ox: 0, oy: 0 },
      { img: null, zoom: 1, ox: 0, oy: 0 },
      { img: null, zoom: 1, ox: 0, oy: 0 },
    ],
    caption: { text: 'HIGHWAY RUN', sizePct: 100, color: '#f5f7fa', style: 'chrome', shadow: true },
    size: 'square',
    selected: 1,
  };
}

/** Which panel rectangle contains canvas point (px, py), or -1. */
export function hitPanel(canvas, px, py) {
  const rects = panelLayout(canvas.width, canvas.height);
  return rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
}

function canvasPoint(canvas, event) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - r.left) / r.width) * canvas.width,
    y: ((event.clientY - r.top) / r.height) * canvas.height,
  };
}

/**
 * Wires drag-to-pan and scroll-to-zoom on the canvas.
 * onChange() is called after every move so the caller can redraw.
 */
export function wireCanvasControls(canvas, state, onChange) {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(canvas, event);
    const i = hitPanel(canvas, p.x, p.y);
    if (i === -1) return;
    state.selected = i;
    const panel = state.panels[i];
    drag = { i, x: p.x, y: p.y, ox: panel.ox, oy: panel.oy, moved: false };
    canvas.setPointerCapture(event.pointerId);
    onChange();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = canvasPoint(canvas, event);
    const rects = panelLayout(canvas.width, canvas.height);
    const rect = rects[drag.i];
    const panel = state.panels[drag.i];
    panel.ox = drag.ox + (p.x - drag.x) / rect.w;
    panel.oy = drag.oy + (p.y - drag.y) / rect.h;
    // Keep the photo from sliding out of its panel entirely.
    panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
    panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
    if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 4) drag.moved = true;
    onChange();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    const p = canvasPoint(canvas, event);
    const i = hitPanel(canvas, p.x, p.y);
    if (i === -1) return;
    event.preventDefault();
    const panel = state.panels[i];
    state.selected = i;
    panel.zoom = Math.max(1, Math.min(4, panel.zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
    onChange();
  }, { passive: false });
}

/** Loads an image from a File, a URL, or an image already loaded, resolving once it can be drawn. */
export function loadImage(source) {
  if (source instanceof HTMLImageElement) return Promise.resolve(source);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = source instanceof File ? URL.createObjectURL(source) : source;
  });
}
