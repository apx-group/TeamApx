(function () {
    // Elements
    const loginEl = document.getElementById('profile-login');
    const contentEl = document.getElementById('profile-content');

    const bannerWrapper = document.getElementById('profile-banner-wrapper');
    const bannerImg = document.getElementById('profile-banner-img');
    const bannerInput = document.getElementById('profile-banner-input');

    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarInput = document.getElementById('profile-avatar-input');

    const displayName = document.getElementById('profile-display-name');
    const form = document.getElementById('profile-form');
    const successEl = document.getElementById('profile-save-success');

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    // ---------------------------
    // Auth check
    // ---------------------------
    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => {
            if (!data.user) {
                loginEl.style.display = 'block';
                return;
            }
            initProfile(data.user);
        })
        .catch(() => {
            loginEl.style.display = 'block';
        });

    function initProfile(user) {
        contentEl.style.display = 'block';

        // Profile data
        displayName.textContent = user.username || '';
        form.username.value = user.username || '';
        form.email.value = user.email || '';

        if (user.banner_url) {
            bannerImg.src = user.banner_url;
            bannerImg.style.display = 'block';
            bannerWrapper.classList.remove('empty');
        }

        if (user.avatar_url) {
            avatarImg.src = user.avatar_url;
        }
    }

    // ---------------------------
    // Banner upload (min 680x240)
    // ---------------------------
    bannerInput?.addEventListener('change', () => {
        const file = bannerInput.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('Banner ist größer als 10 MB');
            bannerInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                if (img.width < 680 || img.height < 240) {
                    alert('Banner zu klein (min. 680×240px)');
                    bannerInput.value = '';
                    return;
                }
                bannerImg.src = e.target.result;
                bannerImg.style.display = 'block';
                bannerWrapper.classList.remove('empty');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ---------------------------
    // Avatar upload (1:1)
    // ---------------------------
    avatarInput?.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('Profilbild ist größer als 10 MB');
            avatarInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                if (img.width !== img.height) {
                    alert('Profilbild muss quadratisch sein (1:1)');
                    avatarInput.value = '';
                    return;
                }
                avatarImg.src = e.target.result;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ---------------------------
    // Save profile
    // ---------------------------
    form?.addEventListener('submit', e => {
        e.preventDefault();
        successEl.style.display = 'none';

        const btn = form.querySelector('.btn-submit');
        btn.disabled = true;

        const formData = new FormData();
        formData.append('username', form.username.value.trim());
        formData.append('email', form.email.value.trim());

        if (bannerInput.files[0]) {
            formData.append('banner', bannerInput.files[0]);
        }
        if (avatarInput.files[0]) {
            formData.append('avatar', avatarInput.files[0]);
        }

        fetch('/api/auth/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            body: formData
        })
            .then(r => {
                btn.disabled = false;
                if (!r.ok) throw r;
                displayName.textContent = form.username.value.trim();
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            })
            .catch(() => {
                btn.disabled = false;
                alert('Profil konnte nicht gespeichert werden');
            });
    });

})();
