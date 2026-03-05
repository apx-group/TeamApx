(function () {
    let currentUser = null;

    // ---------------------------
    // Auth check
    // ---------------------------
    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => {
            if (!data.user) {
                window.location.href = 'login.html';
                return;
            }
            currentUser = data.user;
            initSecurity(data.user);
        })
        .catch(() => {
            window.location.href = 'login.html';
        });

    function initSecurity(user) {
        // Prefill username
        const usernameInput = document.getElementById('security-username');
        if (usernameInput) usernameInput.value = user.username || '';

        // Prefill email
        const emailInput = document.getElementById('security-email');
        if (emailInput) emailInput.value = user.email || '';

    }

    // ---------------------------
    // Username ändern
    // ---------------------------
    document.getElementById('security-username-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const usernameInput = document.getElementById('security-username');
        const successEl     = document.getElementById('username-success');
        const errorEl       = document.getElementById('username-error');
        const btn           = e.target.querySelector('.sec-btn-save');
        const username      = usernameInput.value.trim();

        errorEl.style.display = 'none';

        const usernameRe = /^[a-zA-Z0-9._-]{3,30}$/;
        if (!usernameRe.test(username)) {
            showError(errorEl, 'Benutzername: nur Buchstaben, Zahlen, . _ - (3–30 Zeichen)');
            return;
        }

        btn.disabled = true;
        fetch('/api/auth/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        })
            .then(r => {
                btn.disabled = false;
                if (!r.ok) throw r;
                if (currentUser) currentUser.username = username;
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            })
            .catch(r => {
                btn.disabled = false;
                if (r && r.json) {
                    r.json().then(b => showError(errorEl, b.error || 'Benutzername konnte nicht gespeichert werden.'));
                } else {
                    showError(errorEl, 'Benutzername konnte nicht gespeichert werden.');
                }
            });
    });

    // ---------------------------
    // E-Mail ändern (zweistufig)
    // ---------------------------
    const emailForm      = document.getElementById('security-email-form');
    const emailVerifyStep = document.getElementById('email-verify-step');

    emailForm?.addEventListener('submit', e => {
        e.preventDefault();
        const emailInput = document.getElementById('security-email');
        const btn        = e.target.querySelector('.sec-btn-save');
        const email      = emailInput.value.trim();

        if (!email || !email.includes('@')) {
            alert('Bitte eine gültige E-Mail eingeben.');
            return;
        }

        btn.disabled = true;
        fetch('/api/auth/change-email', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
            .then(r => { if (!r.ok) throw r; return r.json(); })
            .then(data => {
                btn.disabled = false;
                if (data.pending) {
                    emailForm.style.display = 'none';
                    const display = document.getElementById('email-verify-display');
                    if (display) display.textContent = email;
                    emailVerifyStep.style.display = 'block';
                    document.getElementById('email-verify-code')?.focus();
                }
            })
            .catch(r => {
                btn.disabled = false;
                if (r.json) {
                    r.json().then(b => alert(b.error || 'E-Mail konnte nicht geändert werden.'));
                } else {
                    alert('E-Mail konnte nicht geändert werden.');
                }
            });
    });

    document.getElementById('email-verify-btn')?.addEventListener('click', () => {
        const codeInput  = document.getElementById('email-verify-code');
        const errorEl    = document.getElementById('email-verify-error');
        const codeErrEl  = document.getElementById('email-verify-code-error');
        const successEl  = document.getElementById('email-success');
        const verifyBtn  = document.getElementById('email-verify-btn');
        const code       = codeInput.value.trim();

        errorEl.style.display = 'none';
        codeErrEl.textContent = '';

        if (!/^[0-9]{6}$/.test(code)) {
            codeErrEl.textContent = 'Bitte den 6-stelligen Code eingeben.';
            return;
        }

        verifyBtn.disabled = true;
        fetch('/api/auth/verify-email-change', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        })
            .then(r => { if (!r.ok) throw r; return r.json(); })
            .then(data => {
                verifyBtn.disabled = false;
                if (currentUser && data.email) currentUser.email = data.email;
                emailVerifyStep.style.display = 'none';
                emailForm.style.display = 'block';
                codeInput.value = '';
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            })
            .catch(r => {
                verifyBtn.disabled = false;
                if (r.json) {
                    r.json().then(b => {
                        errorEl.textContent = b.error || 'Ungültiger Code.';
                        errorEl.style.display = 'block';
                    });
                } else {
                    errorEl.textContent = 'Ungültiger Code.';
                    errorEl.style.display = 'block';
                }
            });
    });

    document.getElementById('email-verify-code')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('email-verify-btn')?.click();
    });

    document.getElementById('email-verify-cancel')?.addEventListener('click', () => {
        emailVerifyStep.style.display = 'none';
        emailForm.style.display = 'block';
        document.getElementById('email-verify-code').value = '';
        document.getElementById('email-verify-error').style.display = 'none';
    });

    // ---------------------------
    // Passwort ändern
    // ---------------------------
    document.getElementById('security-password-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const oldPw     = document.getElementById('sec-pw-old').value;
        const newPw     = document.getElementById('sec-pw-new').value;
        const confirmPw = document.getElementById('sec-pw-confirm').value;
        const successEl = document.getElementById('password-success');
        const errorEl   = document.getElementById('password-error');
        const btn       = e.target.querySelector('.sec-btn-save');

        errorEl.style.display = 'none';

        if (!oldPw || !newPw || !confirmPw) {
            showError(errorEl, 'Bitte alle Felder ausfüllen.');
            return;
        }
        if (newPw !== confirmPw) {
            showError(errorEl, 'Die neuen Passwörter stimmen nicht überein.');
            return;
        }
        if (newPw.length < 8) {
            showError(errorEl, 'Das neue Passwort muss mindestens 8 Zeichen lang sein.');
            return;
        }

        btn.disabled = true;
        fetch('/api/auth/password', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
        })
            .then(r => {
                btn.disabled = false;
                if (r.status === 401) { showError(errorEl, 'Das aktuelle Passwort ist falsch.'); throw null; }
                if (!r.ok) throw r;
                e.target.reset();
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            })
            .catch(err => {
                btn.disabled = false;
                if (err) showError(errorEl, 'Passwort konnte nicht geändert werden.');
            });
    });

    // ---------------------------
    // Deactivate account – Overlay
    // ---------------------------
    var deactivateOverlay = document.getElementById('deactivate-overlay');

    document.getElementById('deactivate-btn')?.addEventListener('click', () => {
        deactivateOverlay.classList.add('active');
    });

    document.getElementById('deactivate-overlay-cancel')?.addEventListener('click', () => {
        deactivateOverlay.classList.remove('active');
    });

    deactivateOverlay?.addEventListener('click', e => {
        if (e.target === deactivateOverlay) deactivateOverlay.classList.remove('active');
    });

    document.getElementById('deactivate-overlay-confirm')?.addEventListener('click', () => {
        fetch('/api/auth/deactivate', {
            method: 'POST',
            credentials: 'same-origin'
        })
            .then(r => {
                if (!r.ok) throw r;
                window.location.href = '../../index.html';
            })
            .catch(() => {
                deactivateOverlay.classList.remove('active');
                alert('Konto konnte nicht deaktiviert werden.');
            });
    });

    // ---------------------------
    // Delete account – Overlay
    // ---------------------------
    var deleteOverlay = document.getElementById('delete-overlay');

    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
        document.getElementById('delete-confirm-username').value = '';
        document.getElementById('delete-confirm-password').value = '';
        document.getElementById('delete-error').style.display = 'none';
        deleteOverlay.classList.add('active');
    });

    document.getElementById('delete-overlay-cancel')?.addEventListener('click', () => {
        deleteOverlay.classList.remove('active');
    });

    deleteOverlay?.addEventListener('click', e => {
        if (e.target === deleteOverlay) deleteOverlay.classList.remove('active');
    });

    document.getElementById('delete-confirm-btn')?.addEventListener('click', () => {
        const username  = document.getElementById('delete-confirm-username').value.trim();
        const password  = document.getElementById('delete-confirm-password').value;
        const errorEl   = document.getElementById('delete-error');
        const btn       = document.getElementById('delete-confirm-btn');

        errorEl.style.display = 'none';

        if (!username || !password) {
            showError(errorEl, 'Bitte alle Felder ausfüllen.');
            return;
        }
        if (username !== (currentUser?.username || '')) {
            showError(errorEl, 'Benutzername stimmt nicht überein.');
            return;
        }

        btn.disabled = true;
        fetch('/api/auth/delete', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(r => {
                btn.disabled = false;
                if (r.status === 401) { showError(errorEl, 'Passwort ist falsch.'); throw null; }
                if (!r.ok) throw r;
                window.location.href = '../../index.html';
            })
            .catch(err => {
                btn.disabled = false;
                if (err) showError(errorEl, 'Account konnte nicht gelöscht werden.');
            });
    });

    // Escape closes both overlays
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            deactivateOverlay?.classList.remove('active');
            deleteOverlay?.classList.remove('active');
        }
    });

    function showError(el, msg) {
        el.textContent = msg;
        el.style.display = 'block';
    }

})();
