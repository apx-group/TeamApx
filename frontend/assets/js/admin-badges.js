(function () {
  // Admin guard
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.user || !data.user.is_admin) {
        window.location.href = '/login/';
        return;
      }
      loadBadges();
    })
    .catch(function () { window.location.href = '/login/'; });

  var allBadges = [];

  function loadBadges() {
    fetch('/api/admin/badges', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allBadges = data.badges || [];
        renderBadges(allBadges);
      })
      .catch(function () {});
  }

  function renderBadges(badges) {
    var container = document.getElementById('admin-badges-container');
    if (!badges.length) {
      container.innerHTML = '<p style="color:var(--clr-text-muted);font-size:var(--fs-sm)">Noch keine Badges vorhanden. Erstelle den ersten Badge!</p>';
      return;
    }
    container.innerHTML = badges.map(function (b) {
      var availClass = b.available ? 'admin-badge-avail-on' : 'admin-badge-avail-off';
      var availLabel = b.available ? '✓ Verfügbar' : '✗ Deaktiviert';
      return '<div class="admin-badge-card" data-id="' + b.id + '">'
        + '<div class="admin-badge-card__header">'
        + '<img class="admin-badge-card__img" src="' + esc(b.image_url) + '" alt="">'
        + '<div>'
        + '<div class="admin-badge-card__title">' + esc(b.name) + '</div>'
        + '<div class="admin-badge-card__meta">ID ' + b.id + ' · Level 1–' + b.max_level + (b.category ? ' · ' + esc(b.category) : '') + '</div>'
        + '</div></div>'
        + (b.description ? '<div class="admin-badge-card__meta">' + esc(b.description) + '</div>' : '')
        + '<div class="admin-badge-card__actions">'
        + '<button class="admin-action-btn ' + availClass + '" data-action="toggle" data-id="' + b.id + '">' + availLabel + '</button>'
        + '<button class="admin-action-btn" data-action="edit" data-id="' + b.id + '">Bearbeiten</button>'
        + '<button class="admin-action-btn admin-action-btn--danger" data-action="delete" data-id="' + b.id + '">Löschen</button>'
        + '</div></div>';
    }).join('');

    container.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.id, 10);
        var badge = allBadges.find(function (b) { return b.id === id; });
        if (!badge) return;
        if (btn.dataset.action === 'toggle') toggleAvailable(badge, btn);
        if (btn.dataset.action === 'edit') openModal(badge);
        if (btn.dataset.action === 'delete') deleteBadge(badge);
      });
    });
  }

  function toggleAvailable(badge, btn) {
    var updated = Object.assign({}, badge, { available: !badge.available });
    btn.disabled = true;
    fetch('/api/admin/badges', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function () { loadBadges(); })
      .catch(function () { btn.disabled = false; });
  }

  function deleteBadge(badge) {
    if (!confirm('Badge "' + badge.name + '" wirklich löschen? Alle Nutzer verlieren diesen Badge.')) return;
    fetch('/api/admin/badges', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: badge.id })
    })
      .then(function (r) { if (!r.ok) throw r; })
      .then(function () { loadBadges(); })
      .catch(function () {});
  }

  // ── Modal ──
  var modal = document.getElementById('admin-badge-modal');
  var modalForm = document.getElementById('badge-modal-form');
  var modalErr = document.getElementById('badge-modal-error');

  function setLevelSelector(val) {
    document.getElementById('badge-modal-maxlevel').value = val;
    modalForm.querySelectorAll('.badge-lvl-btn').forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.val, 10) === val);
    });
  }

  // Attach level button listeners once
  modalForm.querySelectorAll('.badge-lvl-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLevelSelector(parseInt(btn.dataset.val, 10));
    });
  });

  // ── Badge image upload + crop ──
  var badgeImgInput   = document.getElementById('badge-img-input');
  var badgeImgPreview = document.getElementById('badge-img-preview');
  var cropOverlay     = document.getElementById('badge-crop-overlay');
  var cropImgEl       = document.getElementById('badge-crop-img');
  var cropFrame       = document.getElementById('badge-crop-frame');
  var cropContainer   = document.getElementById('badge-crop-container');
  var cropCancelBtn   = document.getElementById('badge-crop-cancel');
  var cropSaveBtn     = document.getElementById('badge-crop-save');

  var crop = { x: 0, y: 0, size: 0, dragging: false,
               startMouseX: 0, startMouseY: 0,
               startFrameX: 0, startFrameY: 0,
               naturalW: 0, naturalH: 0 };

  var pendingBadgeImageFile = null;

  badgeImgPreview.addEventListener('click', function () { badgeImgInput.click(); });

  badgeImgInput.addEventListener('change', function () {
    var file = badgeImgInput.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Bild ist größer als 10 MB'); badgeImgInput.value = ''; return; }
    var url = URL.createObjectURL(file);
    cropImgEl.onload = function () {
      crop.naturalW = cropImgEl.naturalWidth;
      crop.naturalH = cropImgEl.naturalHeight;
      cropOverlay.style.display = 'flex';
      requestAnimationFrame(initCropFrame);
    };
    cropImgEl.src = url;
  });

  function getRenderedRect() {
    var cw = cropContainer.clientWidth;
    var ch = cropContainer.clientHeight;
    var imgRatio  = crop.naturalW / crop.naturalH;
    var contRatio = cw / ch;
    var rw, rh, ox, oy;
    if (imgRatio > contRatio) {
      rw = cw; rh = cw / imgRatio; ox = 0; oy = (ch - rh) / 2;
    } else {
      rh = ch; rw = ch * imgRatio; ox = (cw - rw) / 2; oy = 0;
    }
    return { rw: rw, rh: rh, ox: ox, oy: oy };
  }

  function initCropFrame() {
    var r = getRenderedRect();
    var size = Math.min(r.rw, r.rh);
    crop.size = size;
    crop.x = r.ox + (r.rw - size) / 2;
    crop.y = r.oy + (r.rh - size) / 2;
    applyFrame();
  }

  function applyFrame() {
    cropFrame.style.left   = crop.x + 'px';
    cropFrame.style.top    = crop.y + 'px';
    cropFrame.style.width  = crop.size + 'px';
    cropFrame.style.height = crop.size + 'px';
  }

  cropFrame.addEventListener('mousedown', function (e) {
    crop.dragging = true;
    crop.startMouseX = e.clientX; crop.startMouseY = e.clientY;
    crop.startFrameX = crop.x;   crop.startFrameY = crop.y;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!crop.dragging) return;
    moveCropBy(e.clientX - crop.startMouseX, e.clientY - crop.startMouseY);
  });
  document.addEventListener('mouseup', function () { crop.dragging = false; });

  cropFrame.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    crop.dragging = true;
    crop.startMouseX = t.clientX; crop.startMouseY = t.clientY;
    crop.startFrameX = crop.x;   crop.startFrameY = crop.y;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', function (e) {
    if (!crop.dragging) return;
    var t = e.touches[0];
    moveCropBy(t.clientX - crop.startMouseX, t.clientY - crop.startMouseY);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function () { crop.dragging = false; });

  function moveCropBy(dx, dy) {
    var r = getRenderedRect();
    crop.x = Math.max(r.ox, Math.min(r.ox + r.rw - crop.size, crop.startFrameX + dx));
    crop.y = Math.max(r.oy, Math.min(r.oy + r.rh - crop.size, crop.startFrameY + dy));
    applyFrame();
  }

  window.addEventListener('resize', function () {
    if (cropOverlay.style.display !== 'none') requestAnimationFrame(initCropFrame);
  });

  cropCancelBtn.addEventListener('click', function () {
    closeCropOverlay();
    badgeImgInput.value = '';
    pendingBadgeImageFile = null;
  });

  cropSaveBtn.addEventListener('click', function () {
    var r = getRenderedRect();
    var scale  = crop.naturalW / r.rw;
    var srcX   = Math.round((crop.x - r.ox) * scale);
    var srcY   = Math.round((crop.y - r.oy) * scale);
    var srcSize = Math.round(crop.size * scale);
    var outSize = Math.min(srcSize, 512);
    var canvas = document.createElement('canvas');
    canvas.width = outSize; canvas.height = outSize;
    canvas.getContext('2d').drawImage(cropImgEl, srcX, srcY, srcSize, srcSize, 0, 0, outSize, outSize);
    canvas.toBlob(function (blob) {
      pendingBadgeImageFile = new File([blob], 'badge.jpg', { type: 'image/jpeg' });
      badgeImgPreview.src = URL.createObjectURL(pendingBadgeImageFile);
      closeCropOverlay();
    }, 'image/jpeg', 0.92);
  });

  function closeCropOverlay() {
    cropOverlay.style.display = 'none';
    URL.revokeObjectURL(cropImgEl.src);
    cropImgEl.src = '';
  }

  function openModal(badge) {
    var isEdit = !!badge;
    document.getElementById('badge-modal-title').textContent = isEdit ? 'Badge bearbeiten' : 'Neuen Badge erstellen';
    document.getElementById('badge-modal-id').value = isEdit ? badge.id : '';
    document.getElementById('badge-modal-name').value = isEdit ? badge.name : '';
    document.getElementById('badge-modal-desc').value = isEdit ? badge.description : '';
    document.getElementById('badge-modal-info').value = isEdit ? badge.info : '';
    document.getElementById('badge-modal-category').value = isEdit ? badge.category : '';
    var imgUrl = isEdit ? badge.image_url : '/assets/icons/APX.png';
    document.getElementById('badge-modal-image').value = imgUrl;
    badgeImgPreview.src = imgUrl;
    pendingBadgeImageFile = null;
    badgeImgInput.value = '';
    setLevelSelector(isEdit ? badge.max_level : 3);
    var availWrap = document.getElementById('badge-modal-available-wrap');
    if (availWrap) availWrap.style.display = isEdit ? '' : 'none';
    if (isEdit) document.getElementById('badge-modal-available').checked = badge.available;
    document.getElementById('badge-modal-submit').textContent = isEdit ? 'Speichern' : 'Erstellen';
    modalErr.style.display = 'none';
    modal.classList.add('open');
  }

  function closeModal() { modal.classList.remove('open'); }

  document.getElementById('create-badge-btn').addEventListener('click', function () { openModal(null); });
  document.getElementById('badge-modal-close').addEventListener('click', closeModal);
  document.getElementById('badge-modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  modalForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('badge-modal-id').value;
    var isEdit = !!id;
    var payload = {
      name:        document.getElementById('badge-modal-name').value.trim(),
      description: document.getElementById('badge-modal-desc').value.trim(),
      info:        document.getElementById('badge-modal-info').value.trim(),
      category:    document.getElementById('badge-modal-category').value.trim(),
      image_url:   document.getElementById('badge-modal-image').value.trim() || '/assets/icons/APX.png',
      max_level:   parseInt(document.getElementById('badge-modal-maxlevel').value, 10) || 3,
    };
    if (!payload.name) { modalErr.textContent = 'Name ist erforderlich.'; modalErr.style.display = ''; return; }
    if (isEdit) {
      payload.id = parseInt(id, 10);
      payload.available = document.getElementById('badge-modal-available').checked;
    }
    var btn = document.getElementById('badge-modal-submit');
    btn.disabled = true;

    // If a new image was cropped, upload it first
    function doSave(imageUrl) {
      payload.image_url = imageUrl;
      fetch('/api/admin/badges', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function () { btn.disabled = false; closeModal(); loadBadges(); })
        .catch(function (r) {
          btn.disabled = false;
          if (r && r.json) r.json().then(function (b) { modalErr.textContent = b.error || 'Fehler.'; modalErr.style.display = ''; });
          else { modalErr.textContent = 'Fehler.'; modalErr.style.display = ''; }
        });
    }

    if (pendingBadgeImageFile) {
      var fd = new FormData();
      fd.append('image', pendingBadgeImageFile);
      fetch('/api/admin/badges/image', { method: 'POST', credentials: 'same-origin', body: fd })
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function (data) { doSave(data.image_url); })
        .catch(function () {
          btn.disabled = false;
          modalErr.textContent = 'Bild-Upload fehlgeschlagen.';
          modalErr.style.display = '';
        });
    } else {
      doSave(payload.image_url);
    }
  });

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
