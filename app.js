const UPDATE_FEED_CANDIDATES = [
  '/api/updates.json',
  '/api/updates-alt.json',
  './updates.json',
  './updates.json',
  'https://janbudyta2-tech.github.io/ultraclientupdates/updates.json',
  'https://janbudyta2-tech.github.io/ultraclientupdates/updates.json',
];

const state = {
  activeTab: 'home',
};

const tabButtons = Array.from(document.querySelectorAll('.tab'));
const panels = Array.from(document.querySelectorAll('.panel'));
const statusEl = document.getElementById('downloadStatus');
const listEl = document.getElementById('downloadList');
const refreshBtn = document.getElementById('refreshUpdates');

function setTab(tabId) {
  state.activeTab = tabId;

  tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });
}

function setStatus(message, tone = 'neutral') {
  statusEl.classList.remove('ok', 'warn');
  if (tone === 'ok') statusEl.classList.add('ok');
  if (tone === 'warn') statusEl.classList.add('warn');
  statusEl.textContent = message;
}

function normalizeExeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  return `https://janbudyta2-tech.github.io/ultraclientupdates/${rawUrl.replace(/^\/+/, '')}`;
}

function collectDownloads(payload) {
  const out = [];
  const seen = new Set();

  const pushItem = (entry) => {
    const rawUrl = entry?.url || entry?.downloadUrl || entry?.file || '';
    if (!rawUrl || !/\.exe(\?.*)?$/i.test(rawUrl)) {
      return;
    }

    const url = normalizeExeUrl(rawUrl);
    const key = url.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    out.push({
      name: entry?.name || decodeURIComponent(rawUrl.split('/').pop()) || 'UltraClient setup.exe',
      url,
    });
  };

  const files = Array.isArray(payload?.files) ? payload.files : [];
  files.forEach(pushItem);

  const items = Array.isArray(payload?.items) ? payload.items : [];
  items.forEach(pushItem);

  return out;
}

function renderDownloads(downloads) {
  if (!downloads.length) {
    listEl.innerHTML = '<div class="status warn">Brak plikow setup do pobrania.</div>';
    return;
  }

  listEl.innerHTML = downloads.map((item) => `
    <article class="download-item">
      <div>
        <div class="download-name">${item.name}</div>
      </div>
      <a class="download-btn" href="${item.url}">Pobierz</a>
    </article>
  `).join('');
}

async function fetchFeed() {
  const errors = [];

  for (const candidate of UPDATE_FEED_CANDIDATES) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) {
        errors.push(`${candidate} -> HTTP ${response.status}`);
        continue;
      }
      return {
        url: candidate,
        payload: await response.json(),
      };
    } catch (error) {
      errors.push(`${candidate} -> ${error.message}`);
    }
  }

  throw new Error(errors.join(' | ') || 'Brak odpowiedzi feedu aktualizacji');
}

async function loadDownloads() {
  setStatus('Ladowanie listy setupow...');
  try {
    const { url, payload } = await fetchFeed();
    const downloads = collectDownloads(payload);
    renderDownloads(downloads);

    if (downloads.length) {
      const version = payload?.latestVersion ? `v${payload.latestVersion}` : 'brak wersji';
      setStatus(`Feed online: ${version} (${url})`, 'ok');
    } else {
      setStatus('Feed jest online, ale nie zawiera setup.exe', 'warn');
    }
  } catch (error) {
    renderDownloads([]);
    setStatus(`Blad pobierania feedu: ${error.message}`, 'warn');
  }
}

for (const btn of tabButtons) {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
}

refreshBtn.addEventListener('click', loadDownloads);

setTab('home');
loadDownloads();

