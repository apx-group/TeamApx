// Events loader – reads from JSON files and renders into the timeline
(function () {
  const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const STATUS_LABELS = {
    live:     { de: 'LIVE',          en: 'LIVE' },
    upcoming: { de: 'Anstehend',     en: 'Upcoming' },
    past:     { de: 'Abgeschlossen', en: 'Completed' }
  };

  const TOGGLE_LABELS = {
    show: { de: 'Ältere Events anzeigen', en: 'Show older events' },
    hide: { de: 'Weniger anzeigen',       en: 'Show less' }
  };

  function getLang() {
    return localStorage.getItem('lang') || 'de';
  }

  function buildCard(event, status) {
    const lang = getLang();
    const d = new Date(event.date);
    const day = String(d.getDate()).padStart(2, '0');
    const months = lang === 'de' ? MONTHS_DE : MONTHS_EN;
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    const statusClass = status === 'live' ? 'event-live' : status === 'upcoming' ? 'event-upcoming' : 'event-past';
    const badgeClass = status === 'live' ? 'event-badge-live' : status === 'past' ? 'event-badge-past' : '';
    const label = STATUS_LABELS[status][lang];
    const duration = event.duration[lang] || event.duration.de;
    const description = event.description[lang] || event.description.de;

    const card = document.createElement('div');
    card.className = `event-card ${statusClass}`;
    card.innerHTML =
      `<div class="event-status-badge ${badgeClass}">${label}</div>` +
      `<div class="event-date">` +
        `<span class="event-day">${day}</span>` +
        `<span class="event-month">${month}</span>` +
        `<span class="event-year">${year}</span>` +
      `</div>` +
      `<div class="event-details">` +
        `<h3 class="event-name">${event.name}</h3>` +
        `<span class="event-duration">${duration}</span>` +
        `<p class="event-description">${description}</p>` +
      `</div>`;
    return card;
  }

  function render(activeEvents, pastEvents) {
    const activeContainer = document.getElementById('events-active');
    const pastContainer = document.getElementById('events-past');
    const toggleBtn = document.getElementById('events-toggle');
    if (!activeContainer || !pastContainer || !toggleBtn) return;

    activeContainer.innerHTML = '';
    pastContainer.innerHTML = '';

    activeEvents.forEach(ev => {
      activeContainer.appendChild(buildCard(ev, ev.status));
    });

    pastEvents.forEach(ev => {
      pastContainer.appendChild(buildCard(ev, 'past'));
    });

    if (pastEvents.length > 0) {
      const lang = getLang();
      toggleBtn.textContent = TOGGLE_LABELS.show[lang];
      toggleBtn.style.display = '';
    } else {
      toggleBtn.style.display = 'none';
    }
  }

  // Determine base path (works from index.html and src/pages/*.html)
  function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/src/pages/')) {
      return '../../src/data/';
    }
    return 'src/data/';
  }

  let activeData = [];
  let pastData = [];

  async function loadEvents() {
    const base = getBasePath();
    try {
      const [activeRes, pastRes] = await Promise.all([
        fetch(base + 'events-active.json'),
        fetch(base + 'events-past.json')
      ]);
      activeData = await activeRes.json();
      pastData = await pastRes.json();
    } catch (e) {
      console.warn('Could not load events:', e);
      return;
    }
    render(activeData, pastData);
  }

  // Toggle button
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'events-toggle') {
      const pastContainer = document.getElementById('events-past');
      const isExpanded = pastContainer.classList.toggle('active');
      const lang = getLang();
      e.target.textContent = isExpanded ? TOGGLE_LABELS.hide[lang] : TOGGLE_LABELS.show[lang];
    }
  });

  // Re-render on language change so labels/descriptions switch
  const origSetLanguage = window.setLanguage;
  if (typeof origSetLanguage === 'function') {
    window.setLanguage = function (lang) {
      origSetLanguage(lang);
      render(activeData, pastData);
    };
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEvents);
  } else {
    loadEvents();
  }
})();
