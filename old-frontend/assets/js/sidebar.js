(function () {
  var STORAGE_KEY = 'apx-sidebar-open';
  var sidebar = document.querySelector('.account-sidebar');
  var navbar = document.querySelector('.navbar');
  var navContainer = document.querySelector('.nav-container');
  if (!navbar || !navContainer) return;

  // ── Inject profile toggle button (far left in navbar, outside max-width container) ──
  var btn = document.createElement('button');
  btn.className = 'nav-profile-toggle';
  btn.id = 'nav-profile-toggle';
  btn.setAttribute('aria-label', 'Sidebar umschalten');
  btn.innerHTML =
    '<div class="nav-profile-avatar" id="nav-profile-avatar">' +
      '<svg id="nav-profile-icon" viewBox="0 0 24 24" fill="none">' +
        '<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>' +
      '<img id="nav-profile-img" src="" alt="" style="display:none;">' +
      '<span id="nav-profile-initial" style="display:none;"></span>' +
    '</div>' +
    '<span class="nav-profile-name" id="nav-profile-name"></span>';

  // Insert into navbar (before nav-container) so it sits at the true left edge
  navbar.insertBefore(btn, navContainer);
  navbar.classList.add('has-sidebar-toggle');

  // ── Remove the old hamburger user-menu dropdown ──
  var userMenu = document.getElementById('user-menu');
  if (userMenu) userMenu.remove();

  // ── Apply initial sidebar state without animation ──
  if (sidebar) {
    var accountNav = sidebar.querySelector('.account-nav');

    // Hide sidebar-logout by default; auth.js will show it when logged in
    var sidebarLogout = document.getElementById('sidebar-logout');
    if (sidebarLogout) sidebarLogout.style.display = 'none';

    // Inject sidebar-login link at the very top
    if (accountNav) {
      var loginLink = document.createElement('a');
      loginLink.className = 'account-nav-item';
      loginLink.id = 'sidebar-login';
      loginLink.setAttribute('data-i18n', 'user.login');
      loginLink.textContent = 'Login';
      loginLink.style.display = 'none'; // auth.js shows it when logged out
      loginLink.href = '/login/';
      accountNav.insertBefore(loginLink, accountNav.firstChild);
    }

    var isOpen = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!isOpen) {
      sidebar.classList.add('sidebar-collapsed');
    }
    // Enable transition after first two frames (prevents animation on load)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        sidebar.classList.add('sidebar-animate');
      });
    });
  }

  // ── Toggle sidebar on button click ──
  btn.addEventListener('click', function () {
    if (!sidebar) return;
    var collapsed = sidebar.classList.toggle('sidebar-collapsed');
    localStorage.setItem(STORAGE_KEY, collapsed ? 'false' : 'true');
  });

  // ── Populate button with user data ──
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.user) return; // keep default icon
      var user = data.user;
      var imgEl     = document.getElementById('nav-profile-img');
      var initialEl = document.getElementById('nav-profile-initial');
      var iconEl    = document.getElementById('nav-profile-icon');
      var nameEl    = document.getElementById('nav-profile-name');
      var displayName = user.nickname || user.username || '';

      if (nameEl) nameEl.textContent = displayName;

      if (user.avatar_url) {
        if (iconEl)  iconEl.style.display  = 'none';
        if (imgEl)  { imgEl.src = user.avatar_url; imgEl.alt = displayName; imgEl.style.display = 'block'; }
      } else {
        if (iconEl)    iconEl.style.display    = 'none';
        if (initialEl) { initialEl.textContent = (user.username || '?').charAt(0).toUpperCase(); initialEl.style.display = 'flex'; }
      }
    })
    .catch(function () {}); // default icon on error
})();
