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
        // Prefill email
        const emailInput = document.getElementById('security-email');
        if (emailInput) emailInput.value = user.email || '';

        // Set username hint for deactivate
        const hint = document.getElementById('deactivate-username-hint');
        if (hint) hint.textContent = user.username || '';
    }

    // ---------------------------
    // E-Mail speichern
    // ---------------------------
    document.getElementById('security-email-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const emailInput = document.getElementById('security-email');
        const successEl  = document.getElementById('email-success');
        const btn        = e.target.querySelector('.sec-btn-save');
        const email      = emailInput.value.trim();

        if (!email || !email.includes('@')) {
            alert('Bitte eine gültige E-Mail eingeben.');
            return;
        }

        btn.disabled = true;
        fetch('/api/auth/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
            .then(r => {
                btn.disabled = false;
                if (!r.ok) throw r;
                if (currentUser) currentUser.email = email;
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            })
            .catch(() => {
                btn.disabled = false;
                alert('E-Mail konnte nicht gespeichert werden.');
            });
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
    // Deactivate account
    // ---------------------------
    document.getElementById('deactivate-btn')?.addEventListener('click', () => {
        const input    = document.getElementById('deactivate-username-input').value.trim();
        const expected = currentUser?.username || '';

        if (input !== expected) {
            alert(`Bitte gib "${expected}" ein, um fortzufahren.`);
            return;
        }

        if (!confirm('Konto wirklich deaktivieren?')) return;

        fetch('/api/auth/deactivate', {
            method: 'POST',
            credentials: 'same-origin'
        })
            .then(r => {
                if (!r.ok) throw r;
                window.location.href = '../../index.html';
            })
            .catch(() => alert('Konto konnte nicht deaktiviert werden.'));
    });

    // ---------------------------
    // Delete account – Overlay
    // ---------------------------
    const deleteOverlay = document.getElementById('delete-overlay');

    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
        document.getElementById('delete-confirm-username').value = '';
        document.getElementById('delete-confirm-password').value = '';
        document.getElementById('delete-error').style.display = 'none';
        deleteOverlay.style.display = 'flex';
    });

    document.getElementById('delete-overlay-cancel')?.addEventListener('click', () => {
        deleteOverlay.style.display = 'none';
    });

    deleteOverlay?.addEventListener('click', e => {
        if (e.target === deleteOverlay) deleteOverlay.style.display = 'none';
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

    function showError(el, msg) {
        el.textContent = msg;
        el.style.display = 'block';
    }

})();
