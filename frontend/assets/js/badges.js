(function () {
  // Load user's badges from API
  fetch('/api/badges', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.badges) {
        showPlaceholder('Bitte einloggen um deine Badges zu sehen.');
        return;
      }
      renderAll(data.badges);
    })
    .catch(function () {
      showPlaceholder('Badges konnten nicht geladen werden.');
    });

  function showPlaceholder(msg) {
    var el = document.getElementById('badges-container');
    if (el) el.innerHTML = '<p class="settings-placeholder">' + esc(msg) + '</p>';
  }

  function renderAll(badges) {
    var container = document.getElementById('badges-container');
    if (!badges.length) {
      container.innerHTML = '<p class="settings-placeholder" style="color:var(--clr-text-muted)">Noch keine Badges verfügbar.</p>';
      return;
    }

    // Group by category
    var groups = {};
    var order = [];
    badges.forEach(function (b) {
      // Only show: owned (level>0) OR available+unowned
      if (b.level === 0 && !b.available) return;
      var cat = b.category || 'Sonstige';
      if (!groups[cat]) { groups[cat] = []; order.push(cat); }
      groups[cat].push(b);
    });

    if (!order.length) {
      container.innerHTML = '<p class="settings-placeholder" style="color:var(--clr-text-muted)">Noch keine Badges verfügbar.</p>';
      return;
    }

    var html = '';
    order.forEach(function (cat) {
      html += '<p class="badges-section-title">' + esc(cat) + '</p>';
      html += '<div class="badges-grid">';
      groups[cat].forEach(function (b) {
        html += buildCard(b);
      });
      html += '</div>';
    });
    container.innerHTML = html;

    // Re-attach click listeners for overlay
    container.querySelectorAll('.badge-card').forEach(function (card) {
      card.addEventListener('click', function () { openOverlay(card); });
    });
  }

  function buildCard(b) {
    var isLocked = b.level === 0;
    var lines = '';
    for (var i = 0; i < b.max_level; i++) { lines += '<span class="badge-line"></span>'; }
    return '<div class="badge-card' + (isLocked ? ' badge-locked' : '') + '"'
      + ' data-name="' + esc(b.name) + '"'
      + ' data-img="' + esc(b.image_url) + '"'
      + ' data-level="' + b.level + '"'
      + ' data-max="' + b.max_level + '"'
      + ' data-desc="' + esc(b.description) + '"'
      + ' data-info="' + esc(b.info) + '">'
      + '<div class="badge-lines badge-lines--left" data-level="' + b.level + '">' + lines + '</div>'
      + '<div class="badge-center">'
      + '<img src="' + esc(b.image_url) + '" alt="' + esc(b.name) + '" class="badge-img">'
      + '<span class="badge-name">' + esc(b.name) + '</span>'
      + '<span class="badge-lvl">' + (isLocked ? 'Gesperrt' : 'Level ' + b.level) + '</span>'
      + '</div>'
      + '<div class="badge-lines badge-lines--right" data-level="' + b.level + '">' + lines + '</div>'
      + '</div>';
  }

  // ── Overlay ──

  var overlay = document.getElementById('badge-overlay');

  function openOverlay(card) {
    var name   = card.dataset.name;
    var img    = card.dataset.img;
    var level  = parseInt(card.dataset.level, 10);
    var max    = parseInt(card.dataset.max, 10);
    var desc   = card.dataset.desc || '';
    var info   = card.dataset.info || '';
    var locked = card.classList.contains('badge-locked');

    var titleEl = document.getElementById('overlay-title');
    titleEl.innerHTML = '';
    var nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    titleEl.appendChild(nameSpan);
    if (desc) {
      var descSpan = document.createElement('span');
      descSpan.className = 'overlay-title-desc';
      descSpan.textContent = ' – ' + desc;
      titleEl.appendChild(descSpan);
    }

    document.getElementById('overlay-subtitle').textContent =
      locked ? 'Gesperrt' : 'Level ' + level + ' / ' + max;

    buildTimeline(img, level, max, locked);

    var infoEl = document.getElementById('overlay-info');
    infoEl.textContent = info;
    infoEl.style.display = info ? '' : 'none';

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function buildTimeline(img, currentLevel, max, locked) {
    var container = document.getElementById('overlay-timeline');
    container.innerHTML = '';
    for (var i = 1; i <= max; i++) {
      var isAchieved = !locked && i <= currentLevel;
      var isCurrent  = !locked && i === currentLevel;
      var node = document.createElement('div');
      node.className = 'timeline-node' + (isAchieved ? ' achieved' : '') + (isCurrent ? ' current' : '');
      var dot = document.createElement('div');
      dot.className = 'tl-dot';
      var image = document.createElement('img');
      image.src = img;
      image.alt = 'Level ' + i;
      dot.appendChild(image);
      var label = document.createElement('span');
      label.className = 'tl-label';
      label.textContent = 'Level ' + i;
      node.appendChild(dot);
      node.appendChild(label);
      container.appendChild(node);
      if (i < max) {
        var connector = document.createElement('div');
        connector.className = 'tl-connector' + (isAchieved ? ' achieved' : '');
        container.appendChild(connector);
      }
    }
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('overlay-close').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlay(); });

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
