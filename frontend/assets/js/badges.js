(function () {
  var container = document.getElementById('badges-container');
  if (container) {
    container.addEventListener('click', function (e) {
      var card = e.target.closest('.badge-card');
      if (!card || !container.contains(card)) return;
      openOverlay(card);
    });
  }

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
    if (container) container.innerHTML = '<p class="settings-placeholder">' + esc(msg) + '</p>';
  }

  function renderAll(badges) {
    if (!container) return;
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
  }

  // ── Card building ──

  function linesStyle(n) {
    if (n <= 0) return { h: 0, gap: 0 };
    var H = Math.min(200, Math.max(80, n * 21));
    var h = Math.max(3, Math.min(16, Math.floor(H / (n * 1.35))));
    var gap = Math.max(1, Math.min(5, Math.floor(h * 0.35)));
    return { h: h, gap: gap };
  }

  function buildLines(level, maxLevel, side) {
    var ls = linesStyle(maxLevel);
    var html = '<div class="badge-lines badge-lines--' + side + '" style="gap:' + ls.gap + 'px">';
    for (var i = 1; i <= maxLevel; i++) {
      var active = level > 0 && i >= (maxLevel - level + 1);
      html += '<span class="badge-line' + (active ? ' badge-line--active' : '') + '" style="height:' + ls.h + 'px"></span>';
    }
    html += '</div>';
    return html;
  }

  function buildCard(b) {
    var isLocked  = b.level === 0;
    var hasLevels = b.max_level > 0;
    var lvlText   = isLocked ? 'Gesperrt' : (hasLevels ? 'Level ' + b.level : '');
    return '<div class="badge-card' + (isLocked ? ' badge-locked' : '') + '"'
      + ' data-name="' + esc(b.name) + '"'
      + ' data-img="'  + esc(b.image_url) + '"'
      + ' data-level="' + b.level + '"'
      + ' data-max="'  + b.max_level + '"'
      + ' data-desc="' + esc(b.description) + '"'
      + ' data-info="' + esc(b.info) + '">'
      + (hasLevels ? buildLines(b.level, b.max_level, 'left') : '')
      + '<div class="badge-center">'
      + '<img src="' + esc(b.image_url) + '" alt="' + esc(b.name) + '" class="badge-img">'
      + '<span class="badge-name">' + esc(b.name) + '</span>'
      + (lvlText ? '<span class="badge-lvl">' + lvlText + '</span>' : '')
      + '</div>'
      + (hasLevels ? buildLines(b.level, b.max_level, 'right') : '')
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
      locked ? 'Gesperrt' : (max > 0 ? 'Level ' + level + ' / ' + max : '');

    var timelineEl = document.getElementById('overlay-timeline');
    if (timelineEl) {
      if (max === 0) {
        timelineEl.style.display = 'none';
      } else {
        timelineEl.style.display = '';
        buildTimeline(img, level, max, locked);
      }
    }

    var infoEl = document.getElementById('overlay-info');
    infoEl.textContent = info;
    infoEl.style.display = info ? '' : 'none';

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function buildTimeline(img, currentLevel, max, locked) {
    var container = document.getElementById('overlay-timeline');
    container.innerHTML = '';
    if (max === 0) return;
    for (var i = 1; i <= max; i++) {
      var isAchieved = !locked && i <= currentLevel;
      var isCurrent  = !locked && i === currentLevel;
      var node = document.createElement('div');
      node.className = 'timeline-node' + (isAchieved ? ' achieved' : '') + (isCurrent ? ' current' : '');
      var dot = document.createElement('div');
      dot.className = 'tl-dot';
      var image = document.createElement('img');
      image.loading = 'lazy';
      image.decoding = 'async';
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
        connector.className = 'tl-connector' + (!locked && i < currentLevel ? ' achieved' : '');
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



