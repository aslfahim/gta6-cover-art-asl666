// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo loaded;
// ?shot=cover hides the controls and shows the exported cover alone, at the export size named
// by &size= (square, portrait or landscape). window.__shotReady is set once painted.
import { EXPORT_SIZES } from './cover.js';

export async function runShot(shot, query, load, applySize) {
  const size = EXPORT_SIZES[query.get('size')] ? query.get('size') : 'landscape';
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    applySize(size);
  } else if (shot === 'editor') {
    applySize(query.get('size') ?? 'landscape');
  }
  await load(`samples/${query.get('photo') ?? 'pier'}.jpg`, query.get('caption') ?? 'HIGHWAY RUN');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
