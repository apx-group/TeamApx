/* ===== Links Page ===== */

const LINKS_SERVICES = [
  {
    id: 'discord',
    nameKey: 'links.service.discord.name',
    descKey: 'links.service.discord.desc',
    iconColor: '#5865F2',
    iconBg: 'rgba(88,101,242,0.15)',
    iconSvg: `<img src="../../assets/icons/DISCORD.svg" alt="Discord">`,
    inputType: 'oauth',
    oauthPath: '/auth/discord',
  },
  {
    id: 'challengermode',
    nameKey: 'links.service.challengermode.name',
    descKey: 'links.service.challengermode.desc',
    iconColor: '#f5a623',
    iconBg: 'rgba(245,166,35,0.15)',
    iconSvg: `<img src="../../assets/images/CM.png" alt="Challengermode">`,
    inputType: 'oauth',
    oauthPath: '/auth/challengermode',
  },
  {
    id: 'twitch',
    nameKey: 'links.service.twitch.name',
    descKey: 'links.service.twitch.desc',
    iconColor: '#9146FF',
    iconBg: 'rgba(145,70,255,0.15)',
    iconSvg: `<img src="../../assets/images/TWITCH.png" alt="Twitch">`,
    inputType: 'oauth',
    oauthPath: '/auth/twitch',
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
      <div class="link-card__icon" style="color:${svc.iconColor}">
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

  const svcName = t(svc.nameKey);

  if (svc.inputType === 'oauth') {
    modalTitle.textContent = `${t('links.modal.connect')} ${svcName}`;
    modalInputWrap.style.display = 'none';
    confirmBtn.textContent = `${t('links.modal.oauthPrefix')} ${svcName}`;
  } else {
    modalTitle.textContent = `${t('links.modal.connect')} ${svcName}`;
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

// ── URL param feedback (after OAuth redirect) ──

function checkOAuthResult() {
  const params = new URLSearchParams(window.location.search);
  const oauthKeys = ['discord', 'cm', 'twitch'];
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
