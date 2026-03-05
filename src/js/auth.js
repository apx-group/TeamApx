(function () {
  const dropdown = document.getElementById('user-dropdown');
  const toggleBtn = document.getElementById('user-menu-toggle');
  const guestSection = document.getElementById('dropdown-guest');
  const authSection = document.getElementById('dropdown-auth');
  const usernameEl = document.getElementById('dropdown-username');
  const logoutBtn = document.getElementById('dropdown-logout');
  const profileLink = document.getElementById('dropdown-profile');
  const adminAppsLink = document.getElementById('dropdown-applications');
  const adminTeamLink = document.getElementById('dropdown-team');
  const myAppLink = document.getElementById('dropdown-my-application');

  // Toggle dropdown
  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target) && e.target !== toggleBtn) {
        dropdown.classList.remove('open');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dropdown.classList.remove('open');
    });
  }

  // Auth state check
  function checkAuth() {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.user) {
          showLoggedIn(data.user);
        } else {
          showLoggedOut();
        }
      })
      .catch(function () { showLoggedOut(); });
  }

  function showLoggedIn(user) {
    if (guestSection) guestSection.style.display = 'none';
    if (authSection) authSection.style.display = 'block';
    if (usernameEl) usernameEl.textContent = user.username;
    if (profileLink) profileLink.style.display = 'block';
    if (adminAppsLink) adminAppsLink.style.display = user.is_admin ? 'block' : 'none';
    if (adminTeamLink) adminTeamLink.style.display = user.is_admin ? 'block' : 'none';
    if (myAppLink) myAppLink.style.display = 'block';
  }

  function showLoggedOut() {
    if (guestSection) guestSection.style.display = 'block';
    if (authSection) authSection.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (adminAppsLink) adminAppsLink.style.display = 'none';
    if (adminTeamLink) adminTeamLink.style.display = 'none';
    if (myAppLink) myAppLink.style.display = 'none';
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      }).then(function () {
        window.location.href = '/';
      });
    });
  }

  // Login form
  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var errorEl = document.getElementById('login-error');
      errorEl.hidden = true;
      loginForm.querySelectorAll('.form-field').forEach(function (f) { f.classList.remove('error'); });

      var login = loginForm.querySelector('[name="login"]').value.trim();
      var password = loginForm.querySelector('[name="password"]').value;

      var valid = true;
      if (!login) { setFieldError(loginForm, 'login', 'Pflichtfeld'); valid = false; }
      if (!password) { setFieldError(loginForm, 'password', 'Pflichtfeld'); valid = false; }
      if (!valid) return;

      var btn = loginForm.querySelector('.btn-submit');
      btn.disabled = true;

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ login: login, password: password })
      })
        .then(function (r) {
          if (!r.ok) throw r;
          return r.json();
        })
        .then(function () {
          window.location.href = loginForm.dataset.redirect || '/';
        })
        .catch(function (r) {
          btn.disabled = false;
          if (r.json) {
            r.json().then(function (body) {
              errorEl.textContent = body.error || 'Login fehlgeschlagen.';
              errorEl.hidden = false;
            }).catch(function () {
              errorEl.textContent = 'Login fehlgeschlagen.';
              errorEl.hidden = false;
            });
          } else {
            errorEl.textContent = 'Login fehlgeschlagen.';
            errorEl.hidden = false;
          }
        });
    });
  }

  // Register form (Schritt 1: Daten eingeben → Code senden)
  var registerForm = document.getElementById('register-form');
  var verifyStep = document.getElementById('verify-step');
  var pendingEmail = '';

  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var errorEl = document.getElementById('register-error');
      errorEl.hidden = true;
      registerForm.querySelectorAll('.form-field').forEach(function (f) { f.classList.remove('error'); });

      var username = registerForm.querySelector('[name="username"]').value.trim();
      var nicknameEl = registerForm.querySelector('[name="nickname"]');
      var nickname = (nicknameEl ? nicknameEl.value.trim() : '') || username;
      var email = registerForm.querySelector('[name="email"]').value.trim();
      var password = registerForm.querySelector('[name="password"]').value;
      var confirm = registerForm.querySelector('[name="confirm_password"]').value;

      var usernameRe = /^[a-zA-Z0-9._-]{3,30}$/;
      var valid = true;
      if (!username) { setFieldError(registerForm, 'username', 'Pflichtfeld'); valid = false; }
      else if (!usernameRe.test(username)) { setFieldError(registerForm, 'username', 'Nur Buchstaben, Zahlen, . _ - (3–30 Zeichen)'); valid = false; }
      if (!email) { setFieldError(registerForm, 'email', 'Pflichtfeld'); valid = false; }
      if (!password || password.length < 8) {
        setFieldError(registerForm, 'password', 'Mindestens 8 Zeichen');
        valid = false;
      }
      if (password !== confirm) {
        setFieldError(registerForm, 'confirm_password', 'Passwörter stimmen nicht überein');
        valid = false;
      }
      if (!valid) return;

      var btn = registerForm.querySelector('.btn-submit');
      btn.disabled = true;

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username,
          nickname: nickname,
          email: email,
          password: password,
          confirm_password: confirm
        })
      })
        .then(function (r) {
          if (!r.ok) throw r;
          return r.json();
        })
        .then(function (data) {
          btn.disabled = false;
          if (data.pending) {
            // Schritt 2 anzeigen
            pendingEmail = email;
            registerForm.style.display = 'none';
            if (verifyStep) {
              verifyStep.style.display = 'block';
              var emailDisplay = document.getElementById('verify-email-display');
              if (emailDisplay) emailDisplay.textContent = email;
              var codeInput = document.getElementById('verify-code');
              if (codeInput) codeInput.focus();
            }
          } else {
            window.location.href = '/';
          }
        })
        .catch(function (r) {
          btn.disabled = false;
          if (r.json) {
            r.json().then(function (body) {
              errorEl.textContent = body.error || 'Registrierung fehlgeschlagen.';
              errorEl.hidden = false;
            }).catch(function () {
              errorEl.textContent = 'Registrierung fehlgeschlagen.';
              errorEl.hidden = false;
            });
          } else {
            errorEl.textContent = 'Registrierung fehlgeschlagen.';
            errorEl.hidden = false;
          }
        });
    });
  }

  // Schritt 2: Code bestätigen
  var verifyBtn = document.getElementById('verify-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', function () {
      var codeInput = document.getElementById('verify-code');
      var errorEl = document.getElementById('verify-error');
      var codeErrorEl = document.getElementById('verify-code-error');
      errorEl.hidden = true;
      if (codeErrorEl) { codeErrorEl.textContent = ''; codeInput.closest('.form-field').classList.remove('error'); }

      var code = codeInput ? codeInput.value.trim() : '';
      if (!/^[0-9]{6}$/.test(code)) {
        if (codeErrorEl) { codeErrorEl.textContent = 'Bitte gib den 6-stelligen Code ein.'; codeInput.closest('.form-field').classList.add('error'); }
        return;
      }

      verifyBtn.disabled = true;

      fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: pendingEmail, code: code })
      })
        .then(function (r) {
          if (!r.ok) throw r;
          return r.json();
        })
        .then(function () {
          window.location.href = '/';
        })
        .catch(function (r) {
          verifyBtn.disabled = false;
          if (r.json) {
            r.json().then(function (body) {
              errorEl.textContent = body.error || 'Ungültiger Code.';
              errorEl.hidden = false;
            }).catch(function () {
              errorEl.textContent = 'Ungültiger Code.';
              errorEl.hidden = false;
            });
          } else {
            errorEl.textContent = 'Ungültiger Code.';
            errorEl.hidden = false;
          }
        });
    });

    // Code bei Enter bestätigen
    var codeInput = document.getElementById('verify-code');
    if (codeInput) {
      codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') verifyBtn.click();
      });
    }
  }

  // "Erneut senden" – zeigt das Registrierungsformular wieder
  var resendBtn = document.getElementById('resend-code-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (verifyStep) verifyStep.style.display = 'none';
      if (registerForm) {
        registerForm.style.display = 'block';
        var errorEl = document.getElementById('register-error');
        if (errorEl) { errorEl.hidden = true; }
      }
    });
  }

  function setFieldError(form, name, msg) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) return;
    var wrapper = input.closest('.form-field');
    var errSpan = wrapper.querySelector('.form-error');
    wrapper.classList.add('error');
    if (errSpan) errSpan.textContent = msg;
  }

  // Check auth on load
  if (toggleBtn) {
    checkAuth();
  }

  // Redirect unauthenticated users away from protected pages
  var protectedPages = ['settings.html', 'security.html', 'profile.html', 'links.html', 'badges.html'];
  var currentPage = window.location.pathname.split('/').pop();
  if (protectedPages.indexOf(currentPage) !== -1) {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.user) {
          window.location.href = '/src/pages/login.html';
        }
      })
      .catch(function () {
        window.location.href = '/src/pages/login.html';
      });
  }
})();
