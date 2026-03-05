(function () {
  var MASTER_KEY = 'apx-admin-verified';

  var gateView   = document.getElementById('admin-gate-view');
  var searchView = document.getElementById('admin-search-view');
  var detailView = document.getElementById('admin-detail-view');

  // ── View helpers ──

  function showView(name) {
    gateView.style.display   = name === 'gate'   ? '' : 'none';
    searchView.style.display = name === 'search' ? '' : 'none';
    detailView.style.display = name === 'detail' ? '' : 'none';
  }

  // ── Admin guard + init ──

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.user || !data.user.is_admin) {
        window.location.href = '../pages/login.html';
        return;
      }
      if (sessionStorage.getItem(MASTER_KEY) === 'true') {
        showView('search');
        initSearch();
      } else {
        showView('gate');
        initGate();
      }
    })
    .catch(function () {
      window.location.href = '../pages/login.html';
    });

  // ── Masterpassword Gate ──

  function initGate() {
    var form  = document.getElementById('admin-gate-form');
    var errEl = document.getElementById('admin-gate-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw  = document.getElementById('admin-masterpw').value;
      var btn = form.querySelector('button[type="submit"]');
      errEl.style.display = 'none';
      btn.disabled = true;

      fetch('/api/admin/verify-master', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      })
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function () {
          sessionStorage.setItem(MASTER_KEY, 'true');
          showView('search');
          initSearch();
        })
        .catch(function (r) {
          btn.disabled = false;
          if (r && r.json) {
            r.json().then(function (b) {
              errEl.textContent = b.error || 'Falsches Masterpassword.';
              errEl.style.display = 'block';
            });
          } else {
            errEl.textContent = 'Falsches Masterpassword.';
            errEl.style.display = 'block';
          }
        });
    });
  }

  // ── User Search ──

  var searchTimer = null;

  function initSearch() {
    var input = document.getElementById('admin-search-input');
    if (!input) return;
    input.focus();
    input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var q = input.value.trim();
      if (!q) {
        document.getElementById('admin-search-results').innerHTML = '';
        return;
      }
      searchTimer = setTimeout(function () { runSearch(q); }, 250);
    });
  }

  function runSearch(q) {
    fetch('/api/users/search?q=' + encodeURIComponent(q), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) { renderSearchResults(data.users || []); })
      .catch(function () {});
  }

  function renderSearchResults(users) {
    var el = document.getElementById('admin-search-results');
    if (!users.length) {
      el.innerHTML = '<p class="user-search-empty">Keine Nutzer gefunden.</p>';
      return;
    }
    el.innerHTML = users.map(function (u) {
      var name   = u.nickname || u.username;
      var handle = u.nickname ? '@' + u.username : '';
      var avatar = u.avatar_url
        ? '<img class="user-result-card__avatar" src="' + esc(u.avatar_url) + '" alt="">'
        : '<span class="user-result-card__initial">' + esc((name[0] || '?').toUpperCase()) + '</span>';
      return '<button type="button" class="user-result-card admin-result-card" data-username="' + esc(u.username) + '">'
        + avatar
        + '<div class="user-result-card__info">'
        + '<span class="user-result-card__name">' + esc(name) + '</span>'
        + (handle ? '<span class="user-result-card__username">' + esc(handle) + '</span>' : '')
        + '</div>'
        + '</button>';
    }).join('');

    el.querySelectorAll('.admin-result-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectUser(btn.dataset.username);
      });
    });
  }

  // ── User Detail ──

  var currentUsername = '';

  function selectUser(username) {
    currentUsername = username;
    clearActionFeedback();

    fetch('/api/user?u=' + encodeURIComponent(username), { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (data) {
        renderDetail(data);
        showView('detail');
      })
      .catch(function () {
        alert('Nutzer konnte nicht geladen werden.');
      });
  }

  function renderDetail(data) {
    var displayName = data.nickname || data.username;

    // Banner
    var bannerWrap = document.getElementById('adm-banner-wrap');
    var bannerImg  = document.getElementById('adm-banner');
    if (data.banner_url) {
      bannerImg.src = data.banner_url;
      bannerImg.style.display = 'block';
      bannerWrap.style.background = '';
    } else {
      bannerImg.style.display = 'none';
      bannerWrap.style.background = 'var(--clr-bg-card)';
    }

    // Avatar
    var avatarImg     = document.getElementById('adm-avatar');
    var avatarInitial = document.getElementById('adm-avatar-initial');
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
    document.getElementById('adm-name').textContent = displayName.toUpperCase();
    var handleEl = document.getElementById('adm-handle');
    if (data.nickname && data.username) {
      handleEl.textContent = '@' + data.username;
      handleEl.style.display = '';
    } else {
      handleEl.style.display = 'none';
    }

    // Raw username + email (admin-only info)
    var rawEl = document.getElementById('adm-username-raw');
    rawEl.textContent = data.username || '';

    var emailEl = document.getElementById('adm-email');
    if (data.email) {
      emailEl.textContent = data.email;
      emailEl.style.display = '';
    } else {
      emailEl.style.display = 'none';
    }
  }

  // Back button
  document.getElementById('admin-back-btn').addEventListener('click', function () {
    currentUsername = '';
    showView('search');
  });

  // ── Admin Actions ──

  function showActionSuccess(msg) {
    var el = document.getElementById('adm-action-success');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('adm-action-error').style.display = 'none';
    setTimeout(function () { el.style.display = 'none'; }, 3000);
  }

  function showActionError(msg) {
    var el = document.getElementById('adm-action-error');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('adm-action-success').style.display = 'none';
  }

  function clearActionFeedback() {
    document.getElementById('adm-action-success').style.display = 'none';
    document.getElementById('adm-action-error').style.display = 'none';
  }

  // Reset password – placeholder
  document.getElementById('adm-btn-reset-pw').addEventListener('click', function () {
    showActionSuccess('Wird bald verfügbar sein.');
  });

  // Change email – placeholder
  document.getElementById('adm-btn-change-email').addEventListener('click', function () {
    showActionSuccess('Wird bald verfügbar sein.');
  });

  // Disable 2FA – placeholder
  document.getElementById('adm-btn-disable-2fa').addEventListener('click', function () {
    showActionSuccess('Wird bald verfügbar sein.');
  });

  // ── Deactivate / Delete Overlays ──

  var deactivateOverlay = document.getElementById('adm-deactivate-overlay');
  var deleteOverlay     = document.getElementById('adm-delete-overlay');

  function openOverlay(overlay) { overlay.classList.add('active'); }
  function closeOverlay(overlay) { overlay.classList.remove('active'); }

  deactivateOverlay.addEventListener('click', function (e) {
    if (e.target === deactivateOverlay) closeOverlay(deactivateOverlay);
  });
  deleteOverlay.addEventListener('click', function (e) {
    if (e.target === deleteOverlay) closeOverlay(deleteOverlay);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeOverlay(deactivateOverlay);
      closeOverlay(deleteOverlay);
    }
  });

  document.getElementById('adm-deactivate-cancel').addEventListener('click', function () {
    closeOverlay(deactivateOverlay);
  });
  document.getElementById('adm-delete-cancel').addEventListener('click', function () {
    closeOverlay(deleteOverlay);
  });

  // Deactivate account
  document.getElementById('adm-btn-deactivate').addEventListener('click', function () {
    if (!currentUsername) return;
    document.getElementById('adm-deactivate-overlay-desc').textContent =
      'Konto von "' + currentUsername + '" wird deaktiviert. Der Nutzer wird ausgeloggt und kann sich nicht mehr einloggen.';
    openOverlay(deactivateOverlay);
  });

  document.getElementById('adm-deactivate-confirm').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    closeOverlay(deactivateOverlay);

    fetch('/api/admin/users/' + encodeURIComponent(currentUsername) + '/deactivate', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(function (r) { if (!r.ok) throw r; })
      .then(function () {
        btn.disabled = false;
        showActionSuccess('Konto wurde deaktiviert.');
      })
      .catch(function (r) {
        btn.disabled = false;
        if (r && r.json) {
          r.json().then(function (b) { showActionError(b.error || 'Fehler beim Deaktivieren.'); });
        } else {
          showActionError('Fehler beim Deaktivieren.');
        }
      });
  });

  // Delete account
  document.getElementById('adm-btn-delete').addEventListener('click', function () {
    if (!currentUsername) return;
    document.getElementById('adm-delete-overlay-desc').textContent =
      'Konto von "' + currentUsername + '" wird dauerhaft gelöscht. Diese Aktion kann NICHT rückgängig gemacht werden.';
    openOverlay(deleteOverlay);
  });

  document.getElementById('adm-delete-confirm').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    closeOverlay(deleteOverlay);

    fetch('/api/admin/users/' + encodeURIComponent(currentUsername), {
      method: 'DELETE',
      credentials: 'same-origin'
    })
      .then(function (r) { if (!r.ok) throw r; })
      .then(function () {
        btn.disabled = false;
        showActionSuccess('Konto wurde gelöscht.');
        setTimeout(function () {
          currentUsername = '';
          showView('search');
          document.getElementById('admin-search-results').innerHTML = '';
          document.getElementById('admin-search-input').value = '';
        }, 1500);
      })
      .catch(function (r) {
        btn.disabled = false;
        if (r && r.json) {
          r.json().then(function (b) { showActionError(b.error || 'Fehler beim Löschen.'); });
        } else {
          showActionError('Fehler beim Löschen.');
        }
      });
  });

  // ── Escape HTML helper ──

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
