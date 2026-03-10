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
        window.location.href = '/login/';
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
      window.location.href = '/login/';
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
        twoFAEnabled = data.two_fa_enabled !== false;
        renderDetail(data);
        updateToggleBtn();
        showView('detail');
        loadUserBadges(username);
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

  // Toggle 2FA
  var twoFAEnabled = true;

  function updateToggleBtn() {
    var btn = document.getElementById('adm-btn-toggle-2fa');
    if (twoFAEnabled) {
      btn.style.background = '#2ecc71';
      btn.style.borderColor = '#2ecc71';
      btn.style.color = '#fff';
    } else {
      btn.style.background = '#ed4245';
      btn.style.borderColor = '#ed4245';
      btn.style.color = '#fff';
    }
  }

  document.getElementById('adm-btn-toggle-2fa').addEventListener('click', function () {
    var titleEl  = document.getElementById('adm-2fa-overlay-title');
    var descEl   = document.getElementById('adm-2fa-overlay-desc');
    var confirmBtn = document.getElementById('adm-2fa-confirm');
    if (twoFAEnabled) {
      titleEl.textContent        = '2FA deaktivieren?';
      descEl.textContent         = 'Die Zwei-Faktor-Authentifizierung für "' + currentUsername + '" wird deaktiviert.';
      confirmBtn.textContent     = 'Deaktivieren';
      confirmBtn.style.background  = '#ed4245';
      confirmBtn.style.borderColor = '#ed4245';
      confirmBtn.style.color       = '#fff';
    } else {
      titleEl.textContent        = '2FA aktivieren?';
      descEl.textContent         = 'Die Zwei-Faktor-Authentifizierung für "' + currentUsername + '" wird aktiviert.';
      confirmBtn.textContent     = 'Aktivieren';
      confirmBtn.style.background  = '#2ecc71';
      confirmBtn.style.borderColor = '#2ecc71';
      confirmBtn.style.color       = '#fff';
    }
    document.getElementById('adm-2fa-overlay').classList.add('active');
  });

  document.getElementById('adm-2fa-cancel').addEventListener('click', function () {
    document.getElementById('adm-2fa-overlay').classList.remove('active');
  });

  document.getElementById('adm-2fa-overlay').addEventListener('click', function (e) {
    if (e.target === document.getElementById('adm-2fa-overlay')) {
      document.getElementById('adm-2fa-overlay').classList.remove('active');
    }
  });

  document.getElementById('adm-2fa-confirm').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    document.getElementById('adm-2fa-overlay').classList.remove('active');

    fetch('/api/admin/users/' + encodeURIComponent(currentUsername) + '/toggle-2fa', {
      method: 'POST',
      credentials: 'same-origin'
    })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        twoFAEnabled = data.two_fa_enabled;
        updateToggleBtn();
        showActionSuccess(twoFAEnabled ? '2FA wurde aktiviert.' : '2FA wurde deaktiviert.');
      })
      .catch(function (r) {
        btn.disabled = false;
        if (r && r.json) {
          r.json().then(function (b) { showActionError(b.error || 'Fehler beim Umschalten.'); });
        } else {
          showActionError('Fehler beim Umschalten.');
        }
      });
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
      document.getElementById('adm-2fa-overlay').classList.remove('active');
      closeBadgeAddModal();
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

  // ── User Badges ──

  var allBadgeDefs = [];

  function loadUserBadges(username) {
    var list = document.getElementById('adm-badges-list');
    list.innerHTML = '<p style="font-size:var(--fs-xs);color:var(--clr-text-muted)">Laden…</p>';

    // Load all badge definitions for the add modal
    fetch('/api/admin/badges', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) { allBadgeDefs = data.badges || []; });

    fetch('/api/admin/user-badges?username=' + encodeURIComponent(username), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) { renderUserBadges(data.badges || []); })
      .catch(function () { list.innerHTML = ''; });
  }

  function renderUserBadges(badges) {
    var list = document.getElementById('adm-badges-list');
    var owned = badges.filter(function (b) { return b.level > 0; });
    if (!owned.length) {
      list.innerHTML = '<p style="font-size:var(--fs-xs);color:var(--clr-text-muted);padding:0.25rem 0">Noch keine Badges.</p>';
      return;
    }
    list.innerHTML = owned.map(function (b) {
      return '<div class="adm-badge-row" data-badge-id="' + b.badge_id + '" data-max="' + b.max_level + '">'
        + '<img class="adm-badge-row__img" src="' + esc(b.image_url) + '" alt="">'
        + '<span class="adm-badge-row__name">' + esc(b.name) + '</span>'
        + '<div class="adm-badge-level">'
        + '<button class="adm-badge-level__btn" data-dir="-1" title="Level verringern">−</button>'
        + '<span class="adm-badge-level__val">Lvl ' + b.level + '</span>'
        + '<button class="adm-badge-level__btn" data-dir="1" title="Level erhöhen">+</button>'
        + '</div>'
        + '<button class="adm-badge-row__remove" title="Entfernen">✕</button>'
        + '</div>';
    }).join('');

    list.querySelectorAll('.adm-badge-row').forEach(function (row) {
      var badgeId = parseInt(row.dataset.badgeId, 10);
      var maxLevel = parseInt(row.dataset.max, 10);
      var lvlVal = row.querySelector('.adm-badge-level__val');
      var currentLevel = parseInt(lvlVal.textContent.replace('Lvl ', ''), 10);

      function updateBtnState() {
        row.querySelectorAll('.adm-badge-level__btn').forEach(function (btn) {
          var dir = parseInt(btn.dataset.dir, 10);
          btn.disabled = (dir === -1 && currentLevel <= 1) || (dir === 1 && currentLevel >= maxLevel);
        });
      }
      updateBtnState();

      row.querySelectorAll('.adm-badge-level__btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dir = parseInt(btn.dataset.dir, 10);
          var newLevel = currentLevel + dir;
          if (newLevel < 1 || newLevel > maxLevel) return;
          btn.disabled = true;
          fetch('/api/admin/user-badges', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername, badge_id: badgeId, level: newLevel })
          })
            .then(function (r) { if (!r.ok) throw r; return r.json(); })
            .then(function () {
              currentLevel = newLevel;
              lvlVal.textContent = 'Lvl ' + currentLevel;
              updateBtnState();
            })
            .catch(function () { btn.disabled = false; updateBtnState(); });
        });
      });

      row.querySelector('.adm-badge-row__remove').addEventListener('click', function () {
        if (!confirm('Badge "' + row.querySelector('.adm-badge-row__name').textContent + '" entfernen?')) return;
        fetch('/api/admin/user-badges?username=' + encodeURIComponent(currentUsername) + '&badge_id=' + badgeId, {
          method: 'DELETE',
          credentials: 'same-origin'
        })
          .then(function (r) { if (!r.ok) throw r; })
          .then(function () { loadUserBadges(currentUsername); })
          .catch(function () {});
      });
    });
  }

  // Badge Add Modal
  var badgeAddModal = document.getElementById('adm-badge-add-modal');

  document.getElementById('adm-badges-add-btn').addEventListener('click', function () {
    // Populate select with available badges
    var select = document.getElementById('adm-badge-add-select');
    var available = allBadgeDefs.filter(function (b) { return b.available; });
    select.innerHTML = available.map(function (b) {
      return '<option value="' + b.id + '">' + esc(b.name) + ' (max Lvl ' + b.max_level + ')</option>';
    }).join('');
    if (!available.length) {
      select.innerHTML = '<option>Keine Badges verfügbar</option>';
    }
    document.getElementById('adm-badge-add-level').value = 1;
    document.getElementById('adm-badge-add-error').style.display = 'none';
    badgeAddModal.classList.add('open');
  });

  function closeBadgeAddModal() { badgeAddModal.classList.remove('open'); }
  document.getElementById('adm-badge-add-close').addEventListener('click', closeBadgeAddModal);
  document.getElementById('adm-badge-add-cancel').addEventListener('click', closeBadgeAddModal);
  badgeAddModal.addEventListener('click', function (e) { if (e.target === badgeAddModal) closeBadgeAddModal(); });

  document.getElementById('adm-badge-add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var select = document.getElementById('adm-badge-add-select');
    var badgeId = parseInt(select.value, 10);
    var level = parseInt(document.getElementById('adm-badge-add-level').value, 10) || 1;
    var errEl = document.getElementById('adm-badge-add-error');
    if (!badgeId) return;
    var btn = this.querySelector('[type="submit"]');
    btn.disabled = true;
    fetch('/api/admin/user-badges', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUsername, badge_id: badgeId, level: level })
    })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function () {
        btn.disabled = false;
        closeBadgeAddModal();
        loadUserBadges(currentUsername);
      })
      .catch(function (r) {
        btn.disabled = false;
        if (r && r.json) r.json().then(function (b) { errEl.textContent = b.error || 'Fehler.'; errEl.style.display = ''; });
        else { errEl.textContent = 'Fehler.'; errEl.style.display = ''; }
      });
  });

})();
