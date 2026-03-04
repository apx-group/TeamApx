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

    // Avatar crop overlay
    const cropOverlay   = document.getElementById('crop-overlay');
    const cropImgEl     = document.getElementById('crop-img');
    const cropFrame     = document.getElementById('crop-frame');
    const cropContainer = document.getElementById('crop-container');
    const cropCancelBtn = document.getElementById('crop-cancel');
    const cropSaveBtn   = document.getElementById('crop-save');

    // Banner crop overlay
    const bannerCropOverlay   = document.getElementById('banner-crop-overlay');
    const bannerCropImgEl     = document.getElementById('banner-crop-img');
    const bannerCropFrame     = document.getElementById('banner-crop-frame');
    const bannerCropContainer = document.getElementById('banner-crop-container');
    const bannerCropCancelBtn = document.getElementById('banner-crop-cancel');
    const bannerCropSaveBtn   = document.getElementById('banner-crop-save');

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const BANNER_RATIO  = 17 / 6;

    let croppedAvatarFile = null;
    let croppedBannerFile = null;

    // Avatar crop state
    const crop = {
        x: 0, y: 0, size: 0,
        dragging: false,
        startMouseX: 0, startMouseY: 0,
        startFrameX: 0, startFrameY: 0,
        naturalW: 0, naturalH: 0,
    };

    // Banner crop state
    const bannerCrop = {
        x: 0, y: 0, w: 0, h: 0,
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
    // Banner upload → crop overlay
    // ---------------------------
    bannerInput?.addEventListener('change', () => {
        const file = bannerInput.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('Banner ist größer als 10 MB');
            bannerInput.value = '';
            return;
        }

        const url = URL.createObjectURL(file);
        bannerCropImgEl.onload = () => {
            bannerCrop.naturalW = bannerCropImgEl.naturalWidth;
            bannerCrop.naturalH = bannerCropImgEl.naturalHeight;
            if (bannerCrop.naturalW < 680 || bannerCrop.naturalH < 240) {
                alert('Banner zu klein (min. 680×240px)');
                bannerInput.value = '';
                URL.revokeObjectURL(url);
                return;
            }
            bannerCropOverlay.style.display = 'flex';
            requestAnimationFrame(initBannerCropFrame);
        };
        bannerCropImgEl.src = url;
    });

    // Returns the rendered image rect inside the banner crop container
    function getBannerRenderedRect() {
        const cw = bannerCropContainer.clientWidth;
        const ch = bannerCropContainer.clientHeight;
        const imgRatio  = bannerCrop.naturalW / bannerCrop.naturalH;
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

    function initBannerCropFrame() {
        const { rw, rh, ox, oy } = getBannerRenderedRect();
        let fw, fh;
        if (rw / rh > BANNER_RATIO) {
            fh = rh;
            fw = fh * BANNER_RATIO;
        } else {
            fw = rw;
            fh = fw / BANNER_RATIO;
        }
        bannerCrop.w = fw;
        bannerCrop.h = fh;
        bannerCrop.x = ox + (rw - fw) / 2;
        bannerCrop.y = oy + (rh - fh) / 2;
        applyBannerFrame();
    }

    function applyBannerFrame() {
        bannerCropFrame.style.left   = bannerCrop.x + 'px';
        bannerCropFrame.style.top    = bannerCrop.y + 'px';
        bannerCropFrame.style.width  = bannerCrop.w + 'px';
        bannerCropFrame.style.height = bannerCrop.h + 'px';
    }

    // Drag – mouse (banner)
    bannerCropFrame.addEventListener('mousedown', e => {
        bannerCrop.dragging    = true;
        bannerCrop.startMouseX = e.clientX;
        bannerCrop.startMouseY = e.clientY;
        bannerCrop.startFrameX = bannerCrop.x;
        bannerCrop.startFrameY = bannerCrop.y;
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!bannerCrop.dragging) return;
        moveBannerCropBy(e.clientX - bannerCrop.startMouseX, e.clientY - bannerCrop.startMouseY);
    });

    document.addEventListener('mouseup', () => { bannerCrop.dragging = false; });

    // Drag – touch (banner)
    bannerCropFrame.addEventListener('touchstart', e => {
        const t = e.touches[0];
        bannerCrop.dragging    = true;
        bannerCrop.startMouseX = t.clientX;
        bannerCrop.startMouseY = t.clientY;
        bannerCrop.startFrameX = bannerCrop.x;
        bannerCrop.startFrameY = bannerCrop.y;
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', e => {
        if (!bannerCrop.dragging) return;
        const t = e.touches[0];
        moveBannerCropBy(t.clientX - bannerCrop.startMouseX, t.clientY - bannerCrop.startMouseY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => { bannerCrop.dragging = false; });

    function moveBannerCropBy(dx, dy) {
        const { rw, rh, ox, oy } = getBannerRenderedRect();
        bannerCrop.x = Math.max(ox, Math.min(ox + rw - bannerCrop.w, bannerCrop.startFrameX + dx));
        bannerCrop.y = Math.max(oy, Math.min(oy + rh - bannerCrop.h, bannerCrop.startFrameY + dy));
        applyBannerFrame();
    }

    window.addEventListener('resize', () => {
        if (bannerCropOverlay.style.display !== 'none') {
            requestAnimationFrame(initBannerCropFrame);
        }
    });

    // Cancel banner crop
    bannerCropCancelBtn.addEventListener('click', () => {
        closeBannerCropOverlay();
        bannerInput.value = '';
        croppedBannerFile = null;
    });

    // Save banner crop
    bannerCropSaveBtn.addEventListener('click', () => {
        const { rw, rh, ox, oy } = getBannerRenderedRect();
        const scale = bannerCrop.naturalW / rw;

        const srcX = Math.round((bannerCrop.x - ox) * scale);
        const srcY = Math.round((bannerCrop.y - oy) * scale);
        const srcW = Math.round(bannerCrop.w * scale);
        const srcH = Math.round(bannerCrop.h * scale);

        const outW = Math.min(srcW, 1360);
        const outH = Math.round(outW / BANNER_RATIO);

        const canvas = document.createElement('canvas');
        canvas.width  = outW;
        canvas.height = outH;
        canvas.getContext('2d').drawImage(
            bannerCropImgEl,
            srcX, srcY, srcW, srcH,
            0,    0,    outW, outH
        );

        canvas.toBlob(blob => {
            croppedBannerFile = new File([blob], 'banner.jpg', { type: 'image/jpeg' });
            const previewURL = URL.createObjectURL(croppedBannerFile);
            bannerImg.src = previewURL;
            bannerImg.style.display = 'block';
            bannerWrapper.classList.remove('empty');
            closeBannerCropOverlay();
        }, 'image/jpeg', 0.92);
    });

    function closeBannerCropOverlay() {
        bannerCropOverlay.style.display = 'none';
        URL.revokeObjectURL(bannerCropImgEl.src);
        bannerCropImgEl.src = '';
    }

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

    // Returns the rendered image rect inside the avatar crop container
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

    // Drag – mouse (avatar)
    cropFrame.addEventListener('mousedown', e => {
        crop.dragging    = true;
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

    // Drag – touch (avatar)
    cropFrame.addEventListener('touchstart', e => {
        const t = e.touches[0];
        crop.dragging    = true;
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

    window.addEventListener('resize', () => {
        if (cropOverlay.style.display !== 'none') {
            requestAnimationFrame(initCropFrame);
        }
    });

    // Cancel crop (avatar)
    cropCancelBtn.addEventListener('click', () => {
        closeCropOverlay();
        avatarInput.value = '';
        croppedAvatarFile = null;
    });

    // Save crop (avatar)
    cropSaveBtn.addEventListener('click', () => {
        const { rw, rh, ox, oy } = getRenderedRect();
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

        if (croppedBannerFile) {
            formData.append('banner', croppedBannerFile);
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
