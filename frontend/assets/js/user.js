/* ===== Public User Profile ===== */

const USER_SERVICE_META = {
  discord: {
    label: 'Discord',
    color: '#5865F2',
    bg: 'rgba(88,101,242,0.15)',
    img: '../../assets/icons/DISCORD.svg',
  },
  challengermode: {
    label: 'Challengermode',
    color: '#f5a623',
    bg: 'rgba(245,166,35,0.15)',
    img: '../../assets/images/CM.png',
  },
  tracker: {
    label: 'Tracker Network',
    color: '#e55c5c',
    bg: 'rgba(229,92,92,0.15)',
    svg: `<svg viewBox="0 0 24 24"><path d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8-4-4L2 17z"/></svg>`,
  },
  ubisoft: {
    label: 'Ubisoft Connect',
    color: '#0070f3',
    bg: 'rgba(0,112,243,0.15)',
    svg: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>`,
  },
};

function getLang() {
  return localStorage.getItem('lang') || 'en';
}

function t(key) {
  const lang = getLang();
  return (typeof translations !== 'undefined' && translations[lang]?.[key]) || key;
}

// ── Search ──

let searchTimer = null;

async function runSearch(query) {
  const results = document.getElementById('user-search-results');
  if (!results) return;

  if (!query.trim()) {
    results.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderSearchResults(data.users || []);
  } catch (_) {}
}

function renderSearchResults(users) {
  const results = document.getElementById('user-search-results');
  if (!results) return;

  if (!users.length) {
    results.innerHTML = `<p class="user-search-empty">${t('userprofile.search.noresults')}</p>`;
    return;
  }

  results.innerHTML = users.map(u => {
    const displayName = u.nickname || u.username;
    const handle = u.nickname ? `@${u.username}` : '';
    const avatarHtml = u.avatar_url
      ? `<img class="user-result-card__avatar" src="${u.avatar_url}" alt="" loading="lazy">`
      : `<span class="user-result-card__initial">${(displayName[0] || '?').toUpperCase()}</span>`;

    return `
      <a class="user-result-card" href="/user/?u=${encodeURIComponent(u.username)}">
        ${avatarHtml}
        <div class="user-result-card__info">
          <span class="user-result-card__name">${escHtml(displayName)}</span>
          ${handle ? `<span class="user-result-card__username">${escHtml(handle)}</span>` : ''}
        </div>
      </a>`;
  }).join('');
}

// ── Profile ──

async function loadProfile(username) {
  const res = await fetch(`/api/user?u=${encodeURIComponent(username)}`);
  if (res.status === 404) {
    showView('notfound');
    return;
  }
  if (!res.ok) {
    showView('notfound');
    return;
  }
  const data = await res.json();
  renderProfile(data);
  showView('profile');
}

function renderProfile(data) {
  // Banner
  const bannerWrap = document.getElementById('pub-banner-wrap');
  const bannerImg = document.getElementById('pub-banner');
  if (data.banner_url) {
    bannerImg.src = data.banner_url;
    bannerImg.style.display = 'block';
  } else {
    bannerWrap.style.background = 'var(--clr-bg-card)';
  }

  // Avatar
  const avatarImg = document.getElementById('pub-avatar');
  const avatarInitial = document.getElementById('pub-avatar-initial');
  const displayName = data.nickname || data.username;

  if (data.avatar_url) {
    avatarImg.src = data.avatar_url;
    avatarImg.style.display = 'block';
    avatarInitial.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarInitial.textContent = (displayName[0] || '?').toUpperCase();
    avatarInitial.style.display = 'flex';
  }

  // Name + handle
  document.getElementById('pub-name').textContent = displayName.toUpperCase();
  const handleEl = document.getElementById('pub-handle');
  if (data.nickname && data.username) {
    handleEl.textContent = `@${data.username}`;
  } else {
    handleEl.style.display = 'none';
  }

  // Page title
  document.title = `${displayName} – Team Apx`;

  // Links
  const links = (data.links || []).filter(l => l.username);
  if (links.length) {
    const linksSection = document.getElementById('pub-links-section');
    const linksContainer = document.getElementById('pub-links');
    linksSection.style.display = '';
    linksContainer.innerHTML = links.map(l => {
      const meta = USER_SERVICE_META[l.service] || { label: l.service, color: '#888', bg: 'rgba(136,136,136,0.15)', svg: '' };
      const iconHtml = meta.img
        ? `<span class="pubprofile__link-icon"><img src="${meta.img}" alt="${meta.label}"></span>`
        : `<span class="pubprofile__link-icon" style="color:${meta.color}">${meta.svg || ''}</span>`;
      return `
        <div class="pubprofile__link-chip">
          ${iconHtml}
          <span class="pubprofile__link-label">${escHtml(l.username)}</span>
        </div>`;
    }).join('');
  }
}

// ── Helpers ──

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showView(view) {
  document.getElementById('user-search-view').style.display = view === 'search' ? '' : 'none';
  document.getElementById('user-profile-view').style.display = view === 'profile' ? '' : 'none';
  document.getElementById('user-notfound-view').style.display = view === 'notfound' ? '' : 'none';
}

// ── Init ──

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('u');

  if (username) {
    loadProfile(username);
  } else {
    showView('search');

    const input = document.getElementById('user-search-input');
    input?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(input.value), 250);
    });
  }

  // Placeholder translation
  const input = document.getElementById('user-search-input');
  if (input) {
    const ph = t('userprofile.search.placeholder');
    if (ph !== 'userprofile.search.placeholder') input.placeholder = ph;
  }

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    setTimeout(() => {
      const inp = document.getElementById('user-search-input');
      if (inp) {
        const ph = t('userprofile.search.placeholder');
        if (ph !== 'userprofile.search.placeholder') inp.placeholder = ph;
      }
    }, 50);
  });
});
