// Draws the Highway Run cover: three photo panels with horizontal motion blur and speed lines,
// an orange-to-teal dusk grade, a low sun, and big chrome caption lettering with speed streaks.
// A panel is { img, zoom, ox, oy }; ox/oy pan the photo as a fraction of the panel size.
// Caption is { text, sizePct, color, style, shadow }.

export const PANEL_NAMES = ['Rear-view mirror', 'Road ahead', 'Driver'];
export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  landscape: { w: 1920, h: 1080 },
};

/** Returns the three panel rectangles for a cover of width w and height h. */
export function panelLayout(w, h) {
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.014));
  if (w >= h) {
    // Landscape: three vertical columns, the middle road panel widest.
    const side = Math.round((w - g * 4) * 0.27);
    const mid = w - g * 4 - side * 2;
    return [
      { x: g, y: g, w: side, h: h - g * 2 },
      { x: g * 2 + side, y: g, w: mid, h: h - g * 2 },
      { x: g * 3 + side + mid, y: g, w: side, h: h - g * 2 },
    ];
  }
  // Square and portrait: three horizontal bands, the middle road band tallest.
  const band = Math.round((h - g * 4) * 0.25);
  const mid = h - g * 4 - band * 2;
  return [
    { x: g, y: g, w: w - g * 2, h: band },
    { x: g, y: g * 2 + band, w: w - g * 2, h: mid },
    { x: g, y: g * 3 + band + mid, w: w - g * 2, h: band },
  ];
}

/** Small deterministic pseudo-random stream, so speed lines are stable between redraws. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawPhotoBlurred(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + ox * rect.w;
  const cy = rect.y + rect.h / 2 + oy * rect.h;
  // Several offset passes smear the photo sideways: the motion blur of a fast drive.
  const passes = 7;
  for (let i = 0; i < passes; i++) {
    const off = (i - (passes - 1) / 2) * rect.w * 0.022;
    ctx.globalAlpha = i === 3 ? 0.52 : 0.08;
    ctx.drawImage(img, cx - pw / 2 + off, cy - ph / 2, pw, ph);
  }
  ctx.globalAlpha = 1;
}

function drawSpeedLines(ctx, rect, seed) {
  const rnd = seeded(seed);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#ffffff';
  for (let i = 0; i < 14; i++) {
    const y = rect.y + rnd() * rect.h;
    const len = rect.w * (0.08 + rnd() * 0.3);
    const x = rect.x + rnd() * (rect.w - len);
    ctx.lineWidth = 1 + rnd() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDuskGrade(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, 'rgba(255, 122, 24, 0.22)');
  g.addColorStop(0.5, 'rgba(255, 45, 120, 0.10)');
  g.addColorStop(1, 'rgba(14, 116, 144, 0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function drawSun(ctx, rect) {
  // A small low sun tucked into the upper corner of the road panel, clear of faces.
  const r = Math.min(rect.w, rect.h) * 0.08;
  const cx = rect.x + rect.w * 0.86;
  const cy = rect.y + rect.h * 0.15;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
  glow.addColorStop(0, 'rgba(255, 150, 60, 0.55)');
  glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, '#ffe08a');
  disc.addColorStop(0.6, '#ff9a3d');
  disc.addColorStop(1, '#ff2d78');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function emptyPanel(ctx, rect, index) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#3a2340');
  g.addColorStop(1, '#12222e');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 ${Math.round(Math.min(rect.w, rect.h) * 0.09)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(PANEL_NAMES[index], rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

function drawCaption(ctx, w, h, caption) {
  const text = (caption.text || '').trim().toUpperCase();
  if (!text) return;
  const base = Math.min(w, h) * 0.115 * (caption.sizePct / 100);
  let size = base;
  ctx.font = `900 italic ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && size > 14) {
    size -= 3;
    ctx.font = `900 italic ${size}px system-ui, sans-serif`;
  }
  const x = w / 2;
  const y = h - h * 0.055;
  // Speed streaks behind the words.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  const streakY = y - size * 0.45;
  for (let i = 0; i < 3; i++) {
    const sw = w * (0.28 - i * 0.07);
    ctx.fillRect(x - sw / 2, streakY + i * size * 0.22, sw, Math.max(2, size * 0.045));
  }
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -0.06, 1, 0, 0); // lean the letters forward, like speed
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (caption.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.07;
  }
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = 'rgba(10, 6, 16, 0.9)';
  ctx.strokeText(text, 0, 0);
  if (caption.style === 'chrome') {
    const grad = ctx.createLinearGradient(0, -size, 0, size * 0.15);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.42, '#d7e0ec');
    grad.addColorStop(0.55, '#7d8ea3');
    grad.addColorStop(0.68, '#f2f6fb');
    grad.addColorStop(1, '#c8d2de');
    ctx.fillStyle = grad;
  } else if (caption.style === 'neon') {
    const grad = ctx.createLinearGradient(0, -size, 0, size * 0.15);
    grad.addColorStop(0, '#ffe08a');
    grad.addColorStop(0.5, '#ff7a18');
    grad.addColorStop(1, '#ff2d78');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = caption.color || '#ffffff';
  }
  ctx.fillText(text, 0, 0);
  // A thin bright edge on chrome lettering.
  if (caption.style === 'chrome') {
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = size * 0.02;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, 0, 0);
  }
  ctx.restore();
}

/** Draws the whole cover onto `canvas` from `state` ({ panels, caption }). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#0c0a12';
  ctx.fillRect(0, 0, w, h);
  const rects = panelLayout(w, h);
  state.panels.forEach((panel, i) => {
    const rect = rects[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.img) {
      drawPhotoBlurred(ctx, panel.img, rect, panel.zoom, panel.ox, panel.oy);
      drawSpeedLines(ctx, rect, 1000 + i * 77);
    } else {
      emptyPanel(ctx, rect, i);
    }
    if (i === 1 && panel.img) drawSun(ctx, rect);
    drawDuskGrade(ctx, rect);
    ctx.restore();
    ctx.strokeStyle = '#0c0a12';
    ctx.lineWidth = Math.max(4, Math.min(w, h) * 0.012);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  drawCaption(ctx, w, h, state.caption);
}
