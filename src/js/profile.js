(function () {
    // Elements
    const loginEl      = document.getElementById('profile-login');
    const contentEl    = document.getElementById('profile-content');

    const bannerWrapper = document.getElementById('profile-banner-wrapper');
    const bannerImg     = document.getElementById('profile-banner-img');
    const bannerInput   = document.getElementById('profile-banner-input');

    const avatarImg     = document.getElementById('profile-avatar-img');
    const avatarInitial = document.getElementById('profile-avatar-initial');
    const avatarInput   = document.getElementById('profile-avatar-input');

    const displayName = document.getElementById('profile-display-name');
    const form        = document.getElementById('profile-form');
    const successEl   = document.getElementById('profile-save-success');

    // Crop overlay
    const cropOverlay    = document.getElementById('crop-overlay');
    const cropImgEl      = document.getElementById('crop-img');
    const cropFrame      = document.getElementById('crop-frame');
    const cropContainer  = document.getElementById('crop-container');
    const cropCancelBtn  = document.getElementById('crop-cancel');
    const cropSaveBtn    = document.getElementById('crop-save');

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    let croppedAvatarFile = null; // final cropped File ready for upload

    // Crop state
    const crop = {
        x: 0, y: 0, size: 0,
        dragging: false,
        startMouseX: 0, startMouseY: 0,
        startFrameX: 0, startFrameY: 0,
        naturalW: 0, naturalH: 0,
    };

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

        displayName.textContent = user.nickname || user.username || '';
        form.nickname.value = user.nickname || '';
        form.username.value = user.username || '';

        if (user.banner_url) {
            bannerImg.src = user.banner_url;
            bannerImg.style.display = 'block';
            bannerWrapper.classList.remove('empty');
        }

        avatarInitial.textContent = (user.username || '?').charAt(0).toUpperCase();
        if (user.avatar_url) {
            avatarImg.src = user.avatar_url;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            avatarInitial.style.display = 'flex';
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
    // Avatar upload → crop overlay
    // ---------------------------
    avatarInput?.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('Profilbild ist größer als 10 MB');
            avatarInput.value = '';
            return;
        }

        const url = URL.createObjectURL(file);
        cropImgEl.onload = () => {
            crop.naturalW = cropImgEl.naturalWidth;
            crop.naturalH = cropImgEl.naturalHeight;
            cropOverlay.style.display = 'flex';
            requestAnimationFrame(initCropFrame);
        };
        cropImgEl.src = url;
    });

    // Returns the rendered image rect inside the container (accounts for letterboxing from object-fit: contain)
    function getRenderedRect() {
        const cw = cropContainer.clientWidth;
        const ch = cropContainer.clientHeight;
        const imgRatio  = crop.naturalW / crop.naturalH;
        const contRatio = cw / ch;
        let rw, rh, ox, oy;
        if (imgRatio > contRatio) {
            rw = cw;      rh = cw / imgRatio;
            ox = 0;       oy = (ch - rh) / 2;
        } else {
            rh = ch;      rw = ch * imgRatio;
            ox = (cw - rw) / 2; oy = 0;
        }
        return { rw, rh, ox, oy };
    }

    function initCropFrame() {
        const { rw, rh, ox, oy } = getRenderedRect();
        const size = Math.min(rw, rh);
        crop.size = size;
        crop.x = ox + (rw - size) / 2;
        crop.y = oy + (rh - size) / 2;
        applyFrame();
    }

    function applyFrame() {
        cropFrame.style.left   = crop.x + 'px';
        cropFrame.style.top    = crop.y + 'px';
        cropFrame.style.width  = crop.size + 'px';
        cropFrame.style.height = crop.size + 'px';
    }

    // Drag – mouse
    cropFrame.addEventListener('mousedown', e => {
        crop.dragging   = true;
        crop.startMouseX = e.clientX;
        crop.startMouseY = e.clientY;
        crop.startFrameX = crop.x;
        crop.startFrameY = crop.y;
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!crop.dragging) return;
        moveCropBy(e.clientX - crop.startMouseX, e.clientY - crop.startMouseY);
    });

    document.addEventListener('mouseup', () => { crop.dragging = false; });

    // Drag – touch
    cropFrame.addEventListener('touchstart', e => {
        const t = e.touches[0];
        crop.dragging   = true;
        crop.startMouseX = t.clientX;
        crop.startMouseY = t.clientY;
        crop.startFrameX = crop.x;
        crop.startFrameY = crop.y;
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', e => {
        if (!crop.dragging) return;
        const t = e.touches[0];
        moveCropBy(t.clientX - crop.startMouseX, t.clientY - crop.startMouseY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => { crop.dragging = false; });

    function moveCropBy(dx, dy) {
        const { rw, rh, ox, oy } = getRenderedRect();
        crop.x = Math.max(ox, Math.min(ox + rw - crop.size, crop.startFrameX + dx));
        crop.y = Math.max(oy, Math.min(oy + rh - crop.size, crop.startFrameY + dy));
        applyFrame();
    }

    // Resize when crop overlay is open
    window.addEventListener('resize', () => {
        if (cropOverlay.style.display !== 'none') {
            requestAnimationFrame(initCropFrame);
        }
    });

    // Cancel crop
    cropCancelBtn.addEventListener('click', () => {
        closeCropOverlay();
        avatarInput.value = '';
        croppedAvatarFile = null;
    });

    // Save crop
    cropSaveBtn.addEventListener('click', () => {
        const { rw, rh, ox, oy } = getRenderedRect();

        // One uniform scale factor (object-fit: contain preserves ratio)
        const scale = crop.naturalW / rw;

        const srcX    = Math.round((crop.x - ox) * scale);
        const srcY    = Math.round((crop.y - oy) * scale);
        const srcSize = Math.round(crop.size * scale);

        const outSize = Math.min(srcSize, 600);
        const canvas  = document.createElement('canvas');
        canvas.width  = outSize;
        canvas.height = outSize;
        canvas.getContext('2d').drawImage(
            cropImgEl,
            srcX, srcY, srcSize, srcSize,
            0,    0,    outSize,  outSize
        );

        canvas.toBlob(blob => {
            croppedAvatarFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

            const previewURL = URL.createObjectURL(croppedAvatarFile);
            avatarImg.src = previewURL;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';

            closeCropOverlay();
        }, 'image/jpeg', 0.92);
    });

    function closeCropOverlay() {
        cropOverlay.style.display = 'none';
        URL.revokeObjectURL(cropImgEl.src);
        cropImgEl.src = '';
    }

    // ---------------------------
    // Save profile
    // ---------------------------
    form?.addEventListener('submit', e => {
        e.preventDefault();
        successEl.style.display = 'none';

        const btn = form.querySelector('.btn-submit');

        const username = form.username.value.trim();
        const usernameRe = /^[a-zA-Z0-9._-]{3,30}$/;
        if (!usernameRe.test(username)) {
            alert('Benutzername: nur Buchstaben, Zahlen, . _ - (3–30 Zeichen)');
            return;
        }

        btn.disabled = true;

        const formData = new FormData();
        const nickname = form.nickname.value.trim() || username;
        formData.append('username', username);
        formData.append('nickname', nickname);

        if (bannerInput.files[0]) {
            formData.append('banner', bannerInput.files[0]);
        }
        if (croppedAvatarFile) {
            formData.append('avatar', croppedAvatarFile);
        }

        fetch('/api/auth/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            body: formData
        })
            .then(r => {
                btn.disabled = false;
                if (!r.ok) throw r;
                const nick = form.nickname.value.trim();
                displayName.textContent = nick || form.username.value.trim();
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            })
            .catch(() => {
                btn.disabled = false;
                alert('Profil konnte nicht gespeichert werden');
            });
    });

})();
