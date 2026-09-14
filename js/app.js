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
            <span>${esc(issue.period)}</span>
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
        “${esc(page.quote.text)}”
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
          <div class="rubric__title">${esc(page.rubric)}</div>
          <div class="rubric__meta">${esc(issue.number)}</div>
        </div>
        ${builder(page)}
        ${footer(issue, pageNum, totalPages)}
      </div>`;
  }

  function buildBack(page, issue) {
    return `
      <div class="page page--back" data-density="hard">
        <div class="back-box">
          <div class="box-title">${esc(page.contactTitle)}</div>
          <p>${esc(page.contactText)}</p>
        </div>
        <div class="back-footer">${esc(page.footerNote)}</div>
      </div>`;
  }

  function buildImage(page) {
    return `
      <div class="page page--image"${page.hard ? ' data-density="hard"' : ''}>
        <img src="${esc(page.imageUrl)}" alt="${esc(page.alt || '')}">
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

    const pageFlip = new St.PageFlip(bookEl, {
      width: 560,
      height: 791,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 700,
      minHeight: 424,
      maxHeight: 990,
      showCover: true,
      maxShadowOpacity: 0.5,
      mobileScrollSupport: true,
      usePortrait: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('#book .page'));

    const indicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const fitBtn = document.getElementById('fitBtn');
    const soundBtn = document.getElementById('soundBtn');

    function updateIndicator() {
      indicator.textContent = `${pageFlip.getCurrentPageIndex() + 1} / ${pageFlip.getPageCount()}`;
    }
    updateIndicator();

    // Button/programmatic flips pass through a "flipping" state we can hook
    // for an instant sound cue. Manual drag-to-flip never emits "flipping"
    // (it goes user_fold -> read directly), so "flip" is the only reliable
    // signal there — but it also fires after "flipping" on the button path,
    // so a flag prevents double-playing the same flip.
    let soundPlayedForThisFlip = false;

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
