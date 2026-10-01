(() => {
  const TONES = ['amber', 'teal', 'slate'];

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toneClass(tone) {
    return TONES.includes(tone) ? `photo--${tone}` : `photo--${TONES[0]}`;
  }

  function photoBlock(label, tone, extraClass = '', imageUrl = '') {
    const img = imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(label || '')}">` : '';
    return `
      <div class="photo ${imageUrl ? 'photo--image' : toneClass(tone)} ${extraClass}">
        ${img}
        <div class="photo__label">${esc(label || 'Фото до матеріалу')}</div>
      </div>`;
  }

  function bodyParagraphs(body) {
    return (body || []).map(p => `<p>${esc(p)}</p>`).join('');
  }

  function footer(issue, pageNum, totalPages) {
    return `
      <div class="page__footer">
        <span>${esc(issue.masthead)} · ${esc(issue.period)}</span>
        <span>${pageNum} / ${totalPages}</span>
      </div>`;
  }

  const RUBRIC_HAND_SVG = `
    <svg class="rubric__hand" viewBox="0 0 140 70" aria-hidden="true">
      <path d="M6 58 C 26 64, 52 46, 70 24 C 76 16, 90 6, 102 10 C 114 14, 112 28, 102 34 L 58 56 C 42 65, 20 66, 6 58 Z"
        fill="#ffffff" stroke="#141b3d" stroke-width="1.5"/>
    </svg>`;

  // Deterministic pseudo-barcode derived from the issue number/period, so a
  // given issue always renders the same bars/digits instead of jittering on
  // every re-render (resize re-builds the whole #book innerHTML).
  function seededDigits(seed, len) {
    let h = 0;
    for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let out = '';
    for (let i = 0; i < len; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      out += h % 10;
    }
    return out;
  }

  function barcodeBlock(issue) {
    const seed = `${issue.masthead}${issue.number}${issue.period}`;
    const digits = seededDigits(seed, 12);
    let h = 0;
    const bars = Array.from({ length: 34 }, (_, i) => {
      h = (h * 1103515245 + 12345 + i) >>> 0;
      const w = 1 + (h % 3);
      const gap = h % 5 === 0;
      return `<span style="width:${w}px;${gap ? 'background:transparent;' : ''}"></span>`;
    }).join('');
    return `
      <div class="barcode">
        ${bars}
        <span class="barcode__digits">${esc(digits)}</span>
      </div>`;
  }

  // ---------- page builders ----------

  function buildCover(page, issue) {
    const teasers = (page.teasers || []).map(t => `
      <div class="teaser">
        <div class="teaser__tag">${esc(t.tag)}</div>
        <div class="teaser__title">${esc(t.title)}</div>
      </div>`).join('');

    return `
      <div class="page page--cover" data-density="hard">
        <div class="masthead">
          <div class="masthead__rule">
            <span>${esc(issue.number)}</span>
            <span>${esc(issue.price)}</span>
          </div>
          <div class="masthead__title">${esc(issue.masthead)}</div>
          <div class="masthead__subtitle">${esc(issue.subtitle)} — ${esc(issue.tagline)}</div>
        </div>
        <div class="cover-hero">
          ${photoBlock(page.photoLabel, page.photoTone, '', page.photoUrl)}
          <div class="headline">${esc(page.headline)}</div>
          <div class="dek">${esc(page.dek)}</div>
        </div>
        <div class="teasers">${teasers}</div>
        <div class="cover-footer-row">
          <span class="issue-date">${esc(issue.period)}</span>
          ${barcodeBlock(issue)}
        </div>
      </div>`;
  }

  function buildArticle(article, { withPhoto = true, variant = '' } = {}) {
    return `
      <div class="article article--${variant || 'default'}">
        ${withPhoto && article.photoLabel ? photoBlock(article.photoLabel, article.photoTone, '', article.photoUrl) : ''}
        <div class="headline">${esc(article.headline)}</div>
        ${article.dek ? `<div class="dek">${esc(article.dek)}</div>` : ''}
        ${article.byline ? `<div class="byline">${esc(article.byline)}</div>` : ''}
        <div class="body-text">${bodyParagraphs(article.body)}</div>
      </div>`;
  }

  function buildFeatured(page) {
    const [main, ...rest] = page.articles || [];
    const mainHtml = main ? buildArticle(main, { variant: 'main' }) : '';
    const sideHtml = rest.map(a => buildArticle(a, { variant: 'side' })).join('');
    return `<div class="layout layout--featured">${mainHtml}${sideHtml}</div>`;
  }

  function buildColumns(page) {
    const items = (page.articles || []).map(a => buildArticle(a)).join('');
    return `<div class="layout layout--columns"><div class="articles-grid">${items}</div></div>`;
  }

  function buildStats(page) {
    const cards = (page.stats || []).map(s => `
      <div class="stat-card">
        <div class="stat-card__value">${esc(s.value)}</div>
        <div class="stat-card__label">${esc(s.label)}</div>
      </div>`).join('');

    const quote = page.quote ? `
      <div class="pullquote">
        ${esc(page.quote.text)}
        <span class="pullquote__author">${esc(page.quote.author)}</span>
      </div>` : '';

    return `
      <div class="layout layout--stats">
        ${quote}
        <div class="stats-grid">${cards}</div>
        ${page.note ? `<div class="note">${esc(page.note)}</div>` : ''}
      </div>`;
  }

  function buildMixed(page) {
    const bdays = (page.birthdays || []).map(b => `
      <li>
        <span class="bd-name">${esc(b.name)}</span>
        <span class="bd-meta">${esc(b.date)}<br>${esc(b.team)}</span>
      </li>`).join('');

    const announce = (page.announcements || []).map(a => `<li>${esc(a)}</li>`).join('');

    return `
      <div class="layout layout--mixed">
        <div class="mixed-grid">
          <div>
            <div class="box-title">Дні народження</div>
            <ul class="birthday-list">${bdays}</ul>
          </div>
          <div>
            <div class="box-title">Оголошення</div>
            <ul class="announce-list">${announce}</ul>
            ${page.funFact ? `<div class="funfact">${esc(page.funFact)}</div>` : ''}
          </div>
        </div>
      </div>`;
  }

  const LAYOUT_BUILDERS = {
    featured: buildFeatured,
    columns: buildColumns,
    stats: buildStats,
    mixed: buildMixed
  };

  function buildContent(page, issue, pageNum, totalPages) {
    const builder = LAYOUT_BUILDERS[page.layout] || buildColumns;
    return `
      <div class="page page--content">
        <div class="rubric">
          <div class="rubric__pill-wrap">
            <div class="rubric__pill">${esc(page.rubric)}</div>
            ${RUBRIC_HAND_SVG}
          </div>
          <div class="rubric__rules"></div>
        </div>
        ${builder(page)}
        ${footer(issue, pageNum, totalPages)}
      </div>`;
  }

  function buildBack(page, issue) {
    const ctaLabel = page.ctaLabel || 'Поділись з нами';
    const ctaUrl = page.ctaUrl || '#';
    return `
      <div class="page page--back" data-density="hard">
        <div class="back-box">
          <div class="box-title">${esc(page.contactTitle)}</div>
          <p>${esc(page.contactText)}</p>
          <a class="cta-pill" href="${esc(ctaUrl)}" target="_blank" rel="noopener">
            <span>${esc(ctaLabel)}</span>
            <span class="cta-pill__arrow">›</span>
          </a>
        </div>
        <div class="back-footer">${esc(page.footerNote)}</div>
      </div>`;
  }

  function overlayLinkBlock(link) {
    if (!link || !link.url) return '';
    const top = link.top ?? 0;
    const left = link.left ?? 0;
    const width = link.width ?? 20;
    const height = link.height ?? 10;
    return `
      <a class="image-overlay-link" href="${esc(link.url)}" target="_blank" rel="noopener"
        aria-label="${esc(link.label || 'Поділитись з нами')}"
        style="top:${top}%; left:${left}%; width:${width}%; height:${height}%;"></a>`;
  }

  // Scanned/pre-rendered issue pages are flat raster images, so any button
  // drawn into the artwork (e.g. the "Поділись з нами" CTA on the back
  // page) is just pixels, not a real link. overlayLink places an invisible,
  // click-through anchor over the artwork's own button coordinates so the
  // printed design stays pixel-perfect while the arrow stays clickable.
  function buildImage(page) {
    return `
      <div class="page page--image"${page.hard ? ' data-density="hard"' : ''}>
        <img src="${esc(page.imageUrl)}" alt="${esc(page.alt || '')}">
        ${overlayLinkBlock(page.overlayLink)}
      </div>`;
  }

  function buildPage(page, issue, pageNum, totalPages) {
    if (page.kind === 'cover') return buildCover(page, issue);
    if (page.kind === 'back') return buildBack(page, issue);
    if (page.kind === 'image') return buildImage(page);
    return buildContent(page, issue, pageNum, totalPages);
  }

  // ---------- flip sound ----------

  let audioCtx = null;
  let flipBuffer = null;
  let soundOn = true;

  function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function unlockAudio() {
    const ctx = ensureAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }

  async function loadFlipSound() {
    try {
      const ctx = ensureAudioCtx();
      const res = await fetch(window.__EMBEDDED_AUDIO__ || 'audio/flip.mp3');
      const arrayBuffer = await res.arrayBuffer();
      flipBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      flipBuffer = null;
    }
  }

  function playFlipSound() {
    if (!soundOn || !flipBuffer || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => playFlipSound());
      return;
    }
    if (audioCtx.state !== 'running') return;
    const source = audioCtx.createBufferSource();
    source.buffer = flipBuffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.8;
    source.connect(gain).connect(audioCtx.destination);
    source.start();
  }

  // ---------- data source ----------

  const STORAGE_KEY = 'newspaperData';

  async function loadData() {
    if (window.__EMBEDDED_DATA__) {
      return { data: window.__EMBEDDED_DATA__, fromDraft: false };
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { data: JSON.parse(stored), fromDraft: true };
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    const res = await fetch('data/data.json');
    return { data: await res.json(), fromDraft: false };
  }

  // ---------- boot ----------

  async function boot() {
    loadFlipSound();

    const { data, fromDraft } = await loadData();
    const { issue, pages } = data;

    if (fromDraft) {
      const banner = document.getElementById('draftBanner');
      banner.hidden = false;
      document.getElementById('resetDraftBtn').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      });
    }
    const total = pages.length;

    const bookEl = document.getElementById('book');
    bookEl.innerHTML = pages
      .map((p, i) => buildPage(p, issue, i + 1, total))
      .join('');

    const PAGE_ASPECT = 560 / 791; // width / height, matches the A4-ish page shape

    // "stretch" mode only clamps to a static min/max box chosen once at
    // construction time — it has no idea how tall the actual viewport is.
    // On a wide-but-short window that made it grow to a fixed max height
    // that simply didn't fit, forcing a vertical scrollbar. We compute the
    // box ourselves from the real available space (both width AND height)
    // every time, and feed that in as a tight min==max bound instead.
    function computeBookSize() {
      // Measured from siblings, not from #stage itself: #stage's own
      // height depends on #book's content (the raw .page divs, ~791px
      // each, stacked before PageFlip takes over and positions them
      // absolutely) — measuring #stage directly is circular and always
      // reports a wildly inflated height on first load.
      const stage = document.getElementById('stage');
      const cs = getComputedStyle(stage);
      const toolbar = document.querySelector('.toolbar');
      const banner = document.getElementById('draftBanner');
      const hint = document.querySelector('.hint');

      const chromeH = toolbar.offsetHeight
        + (banner && !banner.hidden ? banner.offsetHeight : 0)
        + (hint ? hint.offsetHeight : 0)
        + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

      const availW = window.innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availH = window.innerHeight - chromeH;

      const isSpread = availW >= 560; // roughly matches PageFlip's own portrait threshold
      const widthByW = isSpread ? availW / 2 : availW;
      const widthByH = availH * PAGE_ASPECT;

      let pageW = Math.max(220, Math.min(700, widthByW, widthByH));
      let pageH = pageW / PAGE_ASPECT;
      return { width: Math.round(pageW), height: Math.round(pageH) };
    }

    let pageFlip = null;
    let soundPlayedForThisFlip = false;

    function attachHandlers() {
      pageFlip.on('flip', () => {
        updateIndicator();
        if (!soundPlayedForThisFlip) playFlipSound();
        soundPlayedForThisFlip = false;
      });
      pageFlip.on('changeState', (e) => {
        if (e.data === 'flipping') {
          soundPlayedForThisFlip = true;
          playFlipSound();
        } else if (e.data === 'read') {
          soundPlayedForThisFlip = false;
        }
      });
    }

    function createPageFlip(startIndex) {
      const size = computeBookSize();
      pageFlip = new St.PageFlip(bookEl, {
        width: size.width,
        height: size.height,
        size: 'stretch',
        minWidth: size.width,
        maxWidth: size.width,
        minHeight: size.height,
        maxHeight: size.height,
        showCover: true,
        maxShadowOpacity: 0.5,
        mobileScrollSupport: true,
        usePortrait: true
      });
      pageFlip.loadFromHTML(document.querySelectorAll('#book .page'));
      attachHandlers();
      if (startIndex) pageFlip.turnToPage(startIndex);
      updateIndicator();
    }

    const indicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const fitBtn = document.getElementById('fitBtn');
    const soundBtn = document.getElementById('soundBtn');

    function updateIndicator() {
      indicator.textContent = `${pageFlip.getCurrentPageIndex() + 1} / ${pageFlip.getPageCount()}`;
    }

    createPageFlip();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const keepIndex = pageFlip.getCurrentPageIndex();
        pageFlip.destroy();
        bookEl.innerHTML = pages.map((p, i) => buildPage(p, issue, i + 1, total)).join('');
        createPageFlip(keepIndex);
      }, 250);
    });

    document.addEventListener('pointerdown', unlockAudio, { once: true });

    prevBtn.addEventListener('click', () => pageFlip.flipPrev());
    nextBtn.addEventListener('click', () => pageFlip.flipNext());
    fitBtn.addEventListener('click', () => pageFlip.turnToPage(0));
    soundBtn.addEventListener('click', () => {
      unlockAudio();
      soundOn = !soundOn;
      soundBtn.textContent = soundOn ? '🔊' : '🔇';
    });
  }

  boot();
})();
