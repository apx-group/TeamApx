/* ===== Links Page ===== */

const LINKS_SERVICES = [
  {
    id: 'discord',
    nameKey: 'links.service.discord.name',
    descKey: 'links.service.discord.desc',
    iconColor: '#5865F2',
    iconBg: 'rgba(88,101,242,0.15)',
    iconSvg: `<svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`,
    inputType: 'oauth',
    oauthPath: '/auth/discord',
  },
  {
    id: 'challengermode',
    nameKey: 'links.service.challengermode.name',
    descKey: 'links.service.challengermode.desc',
    iconColor: '#f5a623',
    iconBg: 'rgba(245,166,35,0.15)',
    iconSvg: `<svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>`,
    inputType: 'oauth',
    oauthPath: '/auth/challengermode',
  },
  {
    id: 'tracker',
    nameKey: 'links.service.tracker.name',
    descKey: 'links.service.tracker.desc',
    iconColor: '#e55c5c',
    iconBg: 'rgba(229,92,92,0.15)',
    iconSvg: `<svg viewBox="0 0 24 24"><path d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8-4-4L2 17z"/></svg>`,
    inputType: 'username',
  },
  {
    id: 'ubisoft',
    nameKey: 'links.service.ubisoft.name',
    descKey: 'links.service.ubisoft.desc',
    iconColor: '#0070f3',
    iconBg: 'rgba(0,112,243,0.15)',
    iconSvg: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>`,
    inputType: 'username',
  },
];

// serviceId -> { username, service_id }
let linkedMap = {};
let currentModal = null;

function getLang() {
  return localStorage.getItem('lang') || 'en';
}

function t(key) {
  const lang = getLang();
  return (typeof translations !== 'undefined' && translations[lang]?.[key]) || key;
}

// ── API ──

async function loadLinks() {
  try {
    const res = await fetch('/api/auth/links');
    if (!res.ok) return;
    const data = await res.json();
    linkedMap = {};
    (data.links || []).forEach(l => {
      linkedMap[l.service] = { username: l.username, service_id: l.service_id, avatar_url: l.avatar_url };
    });
  } catch (_) { /* offline / not logged in */ }
}

async function saveLink(service, username) {
  const res = await fetch('/api/auth/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, username }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Save failed');
  }
}

async function removeLink(service) {
  const res = await fetch(`/api/auth/links?service=${encodeURIComponent(service)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Delete failed');
}

// ── Render ──

function renderCards() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  grid.innerHTML = '';

  LINKS_SERVICES.forEach(svc => {
    const linked = linkedMap[svc.id];
    const connected = !!linked;
    const displayUsername = linked?.username || '';

    const card = document.createElement('div');
    card.className = 'link-card';
    card.dataset.serviceId = svc.id;
    card.dataset.search = `${t(svc.nameKey)} ${t(svc.descKey)}`.toLowerCase();

    const avatarURL = linked?.avatar_url || '';
    const connectedUser = connected ? `
      <div class="link-card__user">
        ${avatarURL ? `<img class="link-card__user-avatar" src="${avatarURL}" alt="" loading="lazy">` : ''}
        <span class="link-card__user-name">${displayUsername}</span>
      </div>` : '';

    card.innerHTML = `
      <div class="link-card__icon" style="color:${svc.iconColor};background:${svc.iconBg}">
        ${svc.iconSvg}
      </div>
      <div class="link-card__body">
        <div class="link-card__name">${t(svc.nameKey)}</div>
        <div class="link-card__desc">${connected ? '' : t(svc.descKey)}</div>
        ${connectedUser}
      </div>
      <div class="link-card__action">
        ${connected ? `<span class="link-card__connected-label">${t('links.connected')}</span>` : ''}
        <button class="link-btn ${connected ? 'link-btn--disconnect' : 'link-btn--connect'}"
                data-action="${connected ? 'disconnect' : 'connect'}"
                data-id="${svc.id}">
          ${connected ? t('links.disconnect') : t('links.connect')}
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  applyFilter();

  grid.querySelectorAll('.link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === 'connect') {
        openModal(id);
      } else {
        disconnectService(id, btn);
      }
    });
  });
}

function applyFilter() {
  const query = (document.getElementById('links-search')?.value || '').toLowerCase();
  document.querySelectorAll('.link-card').forEach(card => {
    const match = !query || card.dataset.search.includes(query);
    card.classList.toggle('link-card--hidden', !match);
  });
}

// ── Modal ──

function openModal(serviceId) {
  const svc = LINKS_SERVICES.find(s => s.id === serviceId);
  if (!svc) return;

  currentModal = serviceId;
  const modal = document.getElementById('links-modal');
  const modalTitle = document.getElementById('links-modal-title');
  const modalInput = document.getElementById('links-modal-input');
  const modalInputWrap = document.getElementById('links-modal-input-wrap');
  const confirmBtn = document.getElementById('links-modal-confirm');

  if (svc.inputType === 'oauth') {
    modalTitle.textContent = `${t('links.modal.connect')} ${t(svc.nameKey)}`;
    modalInputWrap.style.display = 'none';
    confirmBtn.textContent = t('links.modal.oauth');
  } else {
    modalTitle.textContent = `${t('links.modal.connect')} ${t(svc.nameKey)}`;
    modalInputWrap.style.display = 'block';
    modalInput.placeholder = t('links.modal.placeholder');
    modalInput.value = '';
    confirmBtn.textContent = t('links.connect');
  }

  modal.classList.add('active');
  if (svc.inputType !== 'oauth') setTimeout(() => modalInput.focus(), 50);
}

function closeModal() {
  document.getElementById('links-modal').classList.remove('active');
  currentModal = null;
}

async function confirmModal() {
  if (!currentModal) return;
  const svc = LINKS_SERVICES.find(s => s.id === currentModal);
  if (!svc) return;

  const confirmBtn = document.getElementById('links-modal-confirm');

  if (svc.inputType === 'oauth') {
    window.location.href = svc.oauthPath || `/auth/${svc.id}`;
    return;
  }

  const val = document.getElementById('links-modal-input').value.trim();
  if (!val) return;

  confirmBtn.disabled = true;
  try {
    await saveLink(currentModal, val);
    linkedMap[currentModal] = { username: val, service_id: '' };
    closeModal();
    renderCards();
  } catch (err) {
    confirmBtn.disabled = false;
    alert(err.message);
  }
}

async function disconnectService(serviceId, btn) {
  btn.disabled = true;
  try {
    await removeLink(serviceId);
    delete linkedMap[serviceId];
    renderCards();
  } catch (_) {
    btn.disabled = false;
  }
}

// ── URL param feedback (after Discord OAuth redirect) ──

function checkOAuthResult() {
  const params = new URLSearchParams(window.location.search);
  const oauthKeys = ['discord', 'cm'];
  let changed = false;
  for (const key of oauthKeys) {
    if (params.get(key) === 'ok') {
      changed = true;
    }
  }
  if (changed || oauthKeys.some(k => params.has(k))) {
    history.replaceState({}, '', window.location.pathname);
    if (changed) loadLinks().then(renderCards);
  }
}

// ── Init ──

document.addEventListener('DOMContentLoaded', async () => {
  await loadLinks();
  renderCards();
  checkOAuthResult();

  document.getElementById('links-search')?.addEventListener('input', applyFilter);

  document.getElementById('links-modal-confirm')?.addEventListener('click', confirmModal);
  document.getElementById('links-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('links-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('links-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Re-render on language toggle
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    setTimeout(renderCards, 50);
  });
});
