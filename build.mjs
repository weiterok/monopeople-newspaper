import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

function toDataUri(relPath) {
  const abs = path.join(root, relPath);
  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(abs);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function embedImages(node) {
  if (Array.isArray(node)) {
    node.forEach(embedImages);
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const val = node[key];
      if ((key === 'imageUrl' || key === 'photoUrl') && typeof val === 'string' && val && !val.startsWith('data:')) {
        node[key] = toDataUri(val);
      } else {
        embedImages(val);
      }
    }
  }
}

function safeJson(value) {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
}

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/data.json'), 'utf8'));
embedImages(data);

const audioDataUri = toDataUri('audio/flip.mp3');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const pageFlipLib = fs.readFileSync(path.join(root, 'js/page-flip.vendor.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

const title = data.issue?.masthead ? `${data.issue.masthead} — ${data.issue.subtitle || ''}`.trim() : 'Газета';

const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${title}</title>
<style>
${css}
</style>
</head>
<body>

  <header class="toolbar">
    <div class="toolbar__title">${title}</div>
    <div class="toolbar__actions">
      <button id="prevBtn" class="toolbar__btn" title="Попередня сторінка">‹</button>
      <span id="pageIndicator" class="toolbar__indicator">— / —</span>
      <button id="nextBtn" class="toolbar__btn" title="Наступна сторінка">›</button>
      <span class="toolbar__sep"></span>
      <button id="fitBtn" class="toolbar__btn toolbar__btn--wide" title="Перейти на обкладинку"><span class="btn-icon">⇤</span><span class="btn-label"> На обкладинку</span></button>
      <button id="soundBtn" class="toolbar__btn" title="Звук перегортання">🔊</button>
    </div>
  </header>

  <div id="draftBanner" class="draft-banner" hidden></div>

  <main id="stage" class="stage">
    <div id="book" class="book"></div>
  </main>

  <p class="hint">Клікай по краю сторінки або тягни її, щоб перегорнути.</p>

  <script>
${pageFlipLib}
  </script>
  <script>
window.__EMBEDDED_DATA__ = ${safeJson(data)};
window.__EMBEDDED_AUDIO__ = ${safeJson(audioDataUri)};
  </script>
  <script>
${appJs}
  </script>
</body>
</html>
`;

const outPath = path.join(root, 'MONOPEOPLE.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Written:', outPath, `(${(html.length / 1024 / 1024).toFixed(2)} MB)`);
