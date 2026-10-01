(() => {
  const DRAFT_KEY = 'newspaperBuilderDraft';
  const PUBLISH_KEY = 'newspaperData';
  const TONE_LABELS = { amber: 'Янтарний', teal: 'Бірюзовий', slate: 'Сірий' };

  let state = null;

  // ---------- generic path helpers ----------

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    let node = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (node[k] == null) node[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      node = node[k];
    }
    node[keys[keys.length - 1]] = value;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- templates ----------

  const TEMPLATES = {
    paragraph: () => '',
    teaser: () => ({ tag: '', title: '' }),
    article: () => ({ headline: '', dek: '', byline: '', photoLabel: '', photoTone: 'amber', photoUrl: '', body: [''] }),
    stat: () => ({ value: '', label: '' }),
    birthday: () => ({ name: '', date: '', team: '' }),
    announcement: () => '',
    page: () => ({ kind: 'content', rubric: 'Нова рубрика', layout: 'columns', articles: [TEMPLATES.article()] })
  };

  function blankState() {
    return {
      issue: { masthead: 'ВІСНИК', subtitle: 'Корпоративний дайджест', number: '№ 01', period: '', tagline: '', price: '' },
      pages: [
        { kind: 'cover', headline: '', dek: '', photoLabel: '', photoTone: 'amber', photoUrl: '', teasers: [] },
        TEMPLATES.page(),
        { kind: 'back', contactTitle: 'Зворотний зв’язок', contactText: '', footerNote: '', ctaLabel: 'Поділись з нами', ctaUrl: '' }
      ]
    };
  }

  function normalizePage(page) {
    if (page.kind === 'cover') {
      page.teasers = page.teasers || [];
    } else if (page.kind === 'image') {
      page.imageUrl = page.imageUrl || '';
      page.alt = page.alt || '';
    } else if (page.kind === 'back') {
      page.ctaLabel = page.ctaLabel || 'Поділись з нами';
      page.ctaUrl = page.ctaUrl || '';
    } else if (page.kind === 'content') {
      page.layout = page.layout || 'columns';
      if (page.layout === 'featured' || page.layout === 'columns') {
        page.articles = page.articles && page.articles.length ? page.articles : [TEMPLATES.article()];
      } else if (page.layout === 'stats') {
        page.stats = page.stats || [];
        page.quote = page.quote || { text: '', author: '' };
      } else if (page.layout === 'mixed') {
        page.birthdays = page.birthdays || [];
        page.announcements = page.announcements || [];
      }
    }
  }

  // ---------- persistence ----------

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  }

  async function initState() {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { /* fall through */ }
    }
    try {
      const res = await fetch('data/data.json');
      if (res.ok) return await res.json();
    } catch (e) { /* fall through */ }
    return blankState();
  }

  // ---------- image handling ----------

  function resizeImageFile(file, maxW = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('image decode failed'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('file read failed'));
      reader.readAsDataURL(file);
    });
  }

  // ---------- field templates (HTML) ----------

  function photoFieldHtml(obj, path) {
    const hasPhoto = !!obj.photoUrl;
    const tone = obj.photoTone || 'amber';
    return `
      <div class="photo-field">
        ${hasPhoto
          ? `<img class="photo-field__thumb" src="${obj.photoUrl}" alt="">`
          : `<div class="photo-field__placeholder">без фото</div>`}
        <div class="photo-field__controls">
          <input type="file" accept="image/*" data-photo-path="${path}.photoUrl" data-label-path="${path}.photoLabel">
          <input type="text" placeholder="Підпис під фото" data-path="${path}.photoLabel" value="${esc(obj.photoLabel || '')}">
          <select data-path="${path}.photoTone">
            ${Object.keys(TONE_LABELS).map(t => `<option value="${t}" ${tone === t ? 'selected' : ''}>${TONE_LABELS[t]}</option>`).join('')}
          </select>
          ${hasPhoto ? `<button type="button" class="btn-add" data-remove-photo-path="${path}.photoUrl">✕ прибрати фото</button>` : ''}
        </div>
      </div>`;
  }

  function fullImageFieldHtml(page, path) {
    const hasImage = !!page.imageUrl;
    return `
      <div class="photo-field">
        ${hasImage
          ? `<img class="photo-field__thumb" src="${page.imageUrl}" alt="">`
          : `<div class="photo-field__placeholder">без зображення</div>`}
        <div class="photo-field__controls">
          <input type="file" accept="image/*" data-photo-path="${path}.imageUrl" data-photo-maxw="1600">
          ${hasImage ? `<button type="button" class="btn-add" data-remove-photo-path="${path}.imageUrl">✕ прибрати зображення</button>` : ''}
        </div>
      </div>`;
  }

  function paragraphsHtml(body, path) {
    return `
      <div class="repeater">
        ${(body || ['']).map((p, i) => `
          <div class="repeater__item">
            <textarea data-path="${path}.${i}" rows="2">${esc(p)}</textarea>
            <button type="button" class="btn-remove" data-remove-path="${path}" data-remove-index="${i}" title="Видалити абзац">✕</button>
          </div>`).join('')}
        <button type="button" class="btn-add" data-add-path="${path}" data-add-template="paragraph">+ абзац</button>
      </div>`;
  }

  function articleHtml(article, path, idx) {
    return `
      <div class="article-block">
        <div class="article-block__head">
          <span class="article-block__title">Стаття ${idx + 1}</span>
          <button type="button" class="icon-btn icon-btn--danger" data-remove-path="${path.split('.').slice(0, -1).join('.')}" data-remove-index="${idx}" title="Видалити статтю">✕</button>
        </div>
        <div class="field-row"><label>Заголовок
          <input type="text" data-path="${path}.headline" value="${esc(article.headline)}">
        </label></div>
        <div class="field-grid field-row">
          <label>Підзаголовок (dek)
            <input type="text" data-path="${path}.dek" value="${esc(article.dek || '')}">
          </label>
          <label>Автор / підпис
            <input type="text" data-path="${path}.byline" value="${esc(article.byline || '')}">
          </label>
        </div>
        <div class="field-row">${photoFieldHtml(article, path)}</div>
        <div class="field-row">
          <label>Текст (абзаци)</label>
          ${paragraphsHtml(article.body, `${path}.body`)}
        </div>
      </div>`;
  }

  function articlesRepeaterHtml(page, path) {
    const items = (page.articles || []).map((a, i) => articleHtml(a, `${path}.articles.${i}`, i)).join('');
    return `${items}<button type="button" class="btn-add" data-add-path="${path}.articles" data-add-template="article">+ стаття</button>`;
  }

  function teasersHtml(page, path) {
    const items = (page.teasers || []).map((t, i) => `
      <div class="repeater__item">
        <input type="text" placeholder="Тег (напр. Люди)" data-path="${path}.teasers.${i}.tag" value="${esc(t.tag)}">
        <input type="text" placeholder="Заголовок тизера" data-path="${path}.teasers.${i}.title" value="${esc(t.title)}">
        <button type="button" class="btn-remove" data-remove-path="${path}.teasers" data-remove-index="${i}">✕</button>
      </div>`).join('');
    return `<div class="repeater">${items}<button type="button" class="btn-add" data-add-path="${path}.teasers" data-add-template="teaser">+ тизер</button></div>`;
  }

  function statsHtml(page, path) {
    const items = (page.stats || []).map((s, i) => `
      <div class="repeater__item">
        <input type="text" placeholder="Значення (128)" data-path="${path}.stats.${i}.value" value="${esc(s.value)}">
        <input type="text" placeholder="Підпис" data-path="${path}.stats.${i}.label" value="${esc(s.label)}">
        <button type="button" class="btn-remove" data-remove-path="${path}.stats" data-remove-index="${i}">✕</button>
      </div>`).join('');
    return `<div class="repeater">${items}<button type="button" class="btn-add" data-add-path="${path}.stats" data-add-template="stat">+ показник</button></div>`;
  }

  function birthdaysHtml(page, path) {
    const items = (page.birthdays || []).map((b, i) => `
      <div class="repeater__item row3">
        <input type="text" placeholder="Ім'я" data-path="${path}.birthdays.${i}.name" value="${esc(b.name)}">
        <input type="text" placeholder="Дата" data-path="${path}.birthdays.${i}.date" value="${esc(b.date)}">
        <input type="text" placeholder="Команда" data-path="${path}.birthdays.${i}.team" value="${esc(b.team)}">
        <button type="button" class="btn-remove" data-remove-path="${path}.birthdays" data-remove-index="${i}">✕</button>
      </div>`).join('');
    return `<div class="repeater">${items}<button type="button" class="btn-add" data-add-path="${path}.birthdays" data-add-template="birthday">+ день народження</button></div>`;
  }

  function announcementsHtml(page, path) {
    const items = (page.announcements || []).map((a, i) => `
      <div class="repeater__item">
        <input type="text" data-path="${path}.announcements.${i}" value="${esc(a)}">
        <button type="button" class="btn-remove" data-remove-path="${path}.announcements" data-remove-index="${i}">✕</button>
      </div>`).join('');
    return `<div class="repeater">${items}<button type="button" class="btn-add" data-add-path="${path}.announcements" data-add-template="announcement">+ оголошення</button></div>`;
  }

  // ---------- page card ----------

  function pageCardHtml(page, idx, total) {
    const path = `pages.${idx}`;
    const head = `
      <div class="page-card__head">
        <span class="page-card__label">Сторінка ${idx + 1} з ${total}</span>
        <select data-kind-select data-page="${idx}">
          <option value="cover" ${page.kind === 'cover' ? 'selected' : ''}>Обкладинка</option>
          <option value="content" ${page.kind === 'content' ? 'selected' : ''}>Стаття / рубрика</option>
          <option value="image" ${page.kind === 'image' ? 'selected' : ''}>Готове зображення сторінки</option>
          <option value="back" ${page.kind === 'back' ? 'selected' : ''}>Задня сторінка</option>
        </select>
        <button type="button" class="icon-btn" data-action="move-page" data-dir="-1" data-index="${idx}" title="Вище">↑</button>
        <button type="button" class="icon-btn" data-action="move-page" data-dir="1" data-index="${idx}" title="Нижче">↓</button>
        <button type="button" class="icon-btn icon-btn--danger" data-remove-path="pages" data-remove-index="${idx}" title="Видалити сторінку">✕</button>
      </div>`;

    let body = '';

    if (page.kind === 'cover') {
      body = `
        <div class="field-row"><label>Головний заголовок
          <input type="text" data-path="${path}.headline" value="${esc(page.headline)}">
        </label></div>
        <div class="field-row"><label>Підзаголовок (dek)
          <input type="text" data-path="${path}.dek" value="${esc(page.dek || '')}">
        </label></div>
        <div class="field-row">${photoFieldHtml(page, path)}</div>
        <div class="section-label">Тизери (короткі анонси на обкладинці)</div>
        ${teasersHtml(page, path)}`;
    } else if (page.kind === 'image') {
      body = `
        <div class="field-row">${fullImageFieldHtml(page, path)}</div>
        <div class="field-row"><label>Alt-текст (для доступності, необов'язково)
          <input type="text" data-path="${path}.alt" value="${esc(page.alt || '')}">
        </label></div>`;
    } else if (page.kind === 'back') {
      body = `
        <div class="field-row"><label>Заголовок блоку
          <input type="text" data-path="${path}.contactTitle" value="${esc(page.contactTitle)}">
        </label></div>
        <div class="field-row"><label>Текст
          <textarea rows="3" data-path="${path}.contactText">${esc(page.contactText)}</textarea>
        </label></div>
        <div class="field-row"><label>Підпис унизу сторінки
          <input type="text" data-path="${path}.footerNote" value="${esc(page.footerNote)}">
        </label></div>
        <div class="field-grid field-row">
          <label>Текст кнопки-посилання
            <input type="text" data-path="${path}.ctaLabel" value="${esc(page.ctaLabel || 'Поділись з нами')}">
          </label>
          <label>Куди веде кнопка (URL)
            <input type="text" data-path="${path}.ctaUrl" value="${esc(page.ctaUrl || '')}">
          </label>
        </div>`;
    } else {
      const layout = page.layout || 'columns';
      body = `
        <div class="field-grid field-row">
          <label>Рубрика
            <input type="text" data-path="${path}.rubric" value="${esc(page.rubric)}">
          </label>
          <label>Тип верстки
            <select data-layout-select data-page="${idx}">
              <option value="featured" ${layout === 'featured' ? 'selected' : ''}>Головна стаття + бічна</option>
              <option value="columns" ${layout === 'columns' ? 'selected' : ''}>Кілька статей у колонки</option>
              <option value="stats" ${layout === 'stats' ? 'selected' : ''}>Цитата + цифри</option>
              <option value="mixed" ${layout === 'mixed' ? 'selected' : ''}>Дні народження / оголошення</option>
            </select>
          </label>
        </div>`;

      if (layout === 'featured' || layout === 'columns') {
        body += `<div class="section-label">Статті</div>${articlesRepeaterHtml(page, path)}`;
      } else if (layout === 'stats') {
        body += `
          <div class="section-label">Цитата</div>
          <div class="field-grid field-row">
            <label>Текст цитати
              <input type="text" data-path="${path}.quote.text" value="${esc((page.quote || {}).text || '')}">
            </label>
            <label>Автор цитати
              <input type="text" data-path="${path}.quote.author" value="${esc((page.quote || {}).author || '')}">
            </label>
          </div>
          <div class="section-label">Показники</div>
          ${statsHtml(page, path)}
          <div class="field-row" style="margin-top:10px;"><label>Примітка під показниками
            <textarea rows="2" data-path="${path}.note">${esc(page.note || '')}</textarea>
          </label></div>`;
      } else if (layout === 'mixed') {
        body += `
          <div class="section-label">Дні народження</div>
          ${birthdaysHtml(page, path)}
          <div class="section-label">Оголошення</div>
          ${announcementsHtml(page, path)}
          <div class="field-row" style="margin-top:10px;"><label>Цікавий факт (рамка)
            <textarea rows="2" data-path="${path}.funFact">${esc(page.funFact || '')}</textarea>
          </label></div>`;
      }
    }

    return `<div class="page-card">${head}${body}</div>`;
  }

  // ---------- root render ----------

  function render() {
    const root = document.getElementById('builderRoot');
    const issue = state.issue;

    const issueHtml = `
      <div class="bcard">
        <div class="bcard__title">Випуск</div>
        <div class="field-grid">
          <label>Назва газети (masthead)
            <input type="text" data-path="issue.masthead" value="${esc(issue.masthead)}">
          </label>
          <label>Підзаголовок
            <input type="text" data-path="issue.subtitle" value="${esc(issue.subtitle)}">
          </label>
          <label>Номер випуску
            <input type="text" data-path="issue.number" value="${esc(issue.number)}">
          </label>
          <label>Період
            <input type="text" data-path="issue.period" value="${esc(issue.period)}">
          </label>
          <label>Гасло (tagline)
            <input type="text" data-path="issue.tagline" value="${esc(issue.tagline)}">
          </label>
          <label>Ціна / примітка
            <input type="text" data-path="issue.price" value="${esc(issue.price)}">
          </label>
        </div>
      </div>`;

    const pagesHtml = `
      <div class="bcard">
        <div class="bcard__title">
          Сторінки
          <button type="button" class="btn-add" data-add-path="pages" data-add-template="page">+ сторінка</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${state.pages.map((p, i) => pageCardHtml(p, i, state.pages.length)).join('')}
        </div>
      </div>`;

    root.innerHTML = issueHtml + pagesHtml;
  }

  // ---------- event delegation ----------

  function onInput(e) {
    const el = e.target;
    if (el.dataset.path && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.type !== 'file') {
      setPath(state, el.dataset.path, el.value);
      saveDraft();
    }
  }

  async function onChange(e) {
    const el = e.target;

    if (el.dataset.kindSelect !== undefined) {
      const idx = Number(el.dataset.page);
      state.pages[idx].kind = el.value;
      normalizePage(state.pages[idx]);
      saveDraft();
      render();
      return;
    }

    if (el.dataset.layoutSelect !== undefined) {
      const idx = Number(el.dataset.page);
      state.pages[idx].layout = el.value;
      normalizePage(state.pages[idx]);
      saveDraft();
      render();
      return;
    }

    if (el.dataset.path && el.tagName === 'SELECT') {
      setPath(state, el.dataset.path, el.value);
      saveDraft();
      return;
    }

    if (el.dataset.photoPath) {
      const file = el.files && el.files[0];
      if (!file) return;
      try {
        const maxW = Number(el.dataset.photoMaxw) || 1200;
        const dataUrl = await resizeImageFile(file, maxW);
        setPath(state, el.dataset.photoPath, dataUrl);
        const labelPath = el.dataset.labelPath;
        if (labelPath && !getPath(state, labelPath)) {
          setPath(state, labelPath, file.name.replace(/\.[a-z0-9]+$/i, ''));
        }
        saveDraft();
        render();
      } catch (err) {
        alert('Не вдалося обробити зображення: ' + err.message);
      }
    }
  }

  function onClick(e) {
    const removePhoto = e.target.closest('[data-remove-photo-path]');
    if (removePhoto) {
      setPath(state, removePhoto.dataset.removePhotoPath, '');
      saveDraft();
      render();
      return;
    }

    const remove = e.target.closest('[data-remove-path]');
    if (remove) {
      const arr = getPath(state, remove.dataset.removePath);
      if (Array.isArray(arr)) arr.splice(Number(remove.dataset.removeIndex), 1);
      saveDraft();
      render();
      return;
    }

    const add = e.target.closest('[data-add-path]');
    if (add) {
      let arr = getPath(state, add.dataset.addPath);
      if (!Array.isArray(arr)) {
        arr = [];
        setPath(state, add.dataset.addPath, arr);
      }
      arr.push(TEMPLATES[add.dataset.addTemplate]());
      saveDraft();
      render();
      return;
    }

    const move = e.target.closest('[data-action="move-page"]');
    if (move) {
      const idx = Number(move.dataset.index);
      const dir = Number(move.dataset.dir);
      const target = idx + dir;
      if (target < 0 || target >= state.pages.length) return;
      const tmp = state.pages[idx];
      state.pages[idx] = state.pages[target];
      state.pages[target] = tmp;
      saveDraft();
      render();
    }
  }

  // ---------- top-level actions ----------

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function boot() {
    state = await initState();
    render();

    const root = document.getElementById('builderRoot');
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('click', onClick);

    document.getElementById('loadTemplateBtn').addEventListener('click', async () => {
      if (!confirm('Завантажити поточний data.json? Незбережені зміни в конструкторі буде втрачено.')) return;
      const res = await fetch('data/data.json');
      state = await res.json();
      saveDraft();
      render();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      if (!confirm('Очистити весь випуск і почати з чистого аркуша?')) return;
      state = blankState();
      saveDraft();
      render();
    });

    document.getElementById('saveViewBtn').addEventListener('click', () => {
      localStorage.setItem(PUBLISH_KEY, JSON.stringify(state));
      window.open('index.html', '_blank');
    });

    document.getElementById('downloadBtn').addEventListener('click', () => {
      download('data.json', JSON.stringify(state, null, 2));
    });
  }

  boot();
})();
