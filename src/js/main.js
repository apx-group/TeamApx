// Mobile Navigation Toggle
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close mobile menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });
}

// Navbar background on scroll
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Player Comparison Modal
const compareModal = document.getElementById('player-compare');
const compareClose = document.getElementById('player-compare-close');

if (compareModal) {
  const subPlaceholder = document.getElementById('compare-sub-placeholder');
  const subImg = document.getElementById('compare-sub-img');
  const subName = document.getElementById('compare-sub-name');
  const subAtk = document.getElementById('compare-sub-atk');
  const subDef = document.getElementById('compare-sub-def');
  const compareKd = document.getElementById('compare-kd');
  const compareSubKd = document.getElementById('compare-sub-kd');
  const compareKost = document.getElementById('compare-kost');
  const compareSubKost = document.getElementById('compare-sub-kost');
  const compareRating = document.getElementById('compare-rating');
  const compareSubRating = document.getElementById('compare-sub-rating');

  function closeCompare() {
    compareModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  compareClose.addEventListener('click', closeCompare);
  compareModal.addEventListener('click', (e) => { if (e.target === compareModal) closeCompare(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && compareModal.classList.contains('active')) closeCompare(); });

  // ── Stats helpers ──
  function calcKD(kills, deaths) {
    if (deaths === 0) return kills > 0 ? kills.toFixed(2) : '0.00';
    return (kills / deaths).toFixed(2);
  }

  function calcRating(kills, deaths, rounds) {
    const AVG_KILL_W = 1.025, AVG_DEATH_W = -0.767;
    const r = rounds > 0 ? rounds : Math.max((kills + deaths) / 2, 1);
    return (((kills * AVG_KILL_W) + (deaths * AVG_DEATH_W)) / r + 1.0).toFixed(2);
  }

  function calcKost(kostPoints, rounds) {
    if (rounds <= 0) return '0%';
    return (kostPoints / rounds * 100).toFixed(0) + '%';
  }

  function setVal(el, text, muted) {
    el.textContent = text;
    if (muted) el.classList.add('compare-muted');
    else el.classList.remove('compare-muted');
  }

  function openCompare(player, sub) {
    const imgSrc = 'assets/images/' + player.name + '.png';
    document.getElementById('compare-player-img').src = imgSrc;
    document.getElementById('compare-player-img').alt = player.name;
    document.getElementById('compare-player-name').textContent = player.name;
    document.getElementById('compare-atk').textContent = player.atk_role;
    document.getElementById('compare-def').textContent = player.def_role;

    // Main player stats
    setVal(compareKd, calcKD(player.kills, player.deaths), false);
    setVal(compareKost, calcKost(player.kost_points, player.rounds), player.rounds <= 0);
    setVal(compareRating, calcRating(player.kills, player.deaths, player.rounds), false);

    if (sub) {
      const subImgSrc = 'assets/images/' + sub.name + '.png';
      subPlaceholder.style.display = 'none';
      subImg.style.display = '';
      subImg.src = subImgSrc;
      subImg.alt = sub.name;
      setVal(subName, sub.name, false);
      setVal(subAtk, sub.atk_role, false);
      setVal(subDef, sub.def_role, false);
      setVal(compareSubKd, calcKD(sub.kills, sub.deaths), false);
      setVal(compareSubKost, calcKost(sub.kost_points, sub.rounds), sub.rounds <= 0);
      setVal(compareSubRating, calcRating(sub.kills, sub.deaths, sub.rounds), false);
    } else {
      subPlaceholder.style.display = '';
      subImg.style.display = 'none';
      setVal(subName, '---', true);
      setVal(subAtk, '---', true);
      setVal(subDef, '---', true);
      setVal(compareSubKd, '---', true);
      setVal(compareSubKost, '---', true);
      setVal(compareSubRating, '---', true);
    }

    compareModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ── Load team from API ──
  const teamGrid = document.getElementById('team-grid');

  if (teamGrid) {
    fetch('/api/team')
      .then(r => r.json())
      .then(data => {
        const members = data.members || [];
        const byId = {};
        members.forEach(m => { byId[m.id] = m; });

        // IDs 1-5 = main roster (cards), IDs 6-10 = subs (right side in compare)
        for (let i = 1; i <= 5; i++) {
          const player = byId[i];
          if (!player) continue;
          const sub = byId[i + 5] || null;

          const card = document.createElement('div');
          card.className = 'team-card';

          const imgSrc = 'assets/images/' + player.name + '.png';
          const kost = calcKost(player.kost_points, player.rounds);
          card.innerHTML =
            '<div class="team-card-img">' +
              '<img src="' + imgSrc + '" alt="' + player.name + '">' +
            '</div>' +
            '<div class="team-card-info">' +
              '<span class="team-card-role">' + player.atk_role + ' | ' + player.def_role + '</span>' +
              '<h3 class="team-card-name">' + player.name + '</h3>' +
              '<span class="team-card-kost">KOST ' + kost + '</span>' +
            '</div>';

          card.addEventListener('click', openCompare.bind(null, player, sub));
          teamGrid.appendChild(card);
        }
      })
      .catch(() => {});
  }
}

// Hero video rotation
const heroVideo = document.getElementById('hero-video');
if (heroVideo) {
  const heroClips = [
    'assets/videos/bg-01.mp4',
    'assets/videos/bg-02.mp4',
    'assets/videos/bg-03.mp4',
    'assets/videos/bg-04.mp4',
    'assets/videos/bg-05.mp4',
  ];
  let lastClip = -1;

  function playRandomClip() {
    let index;
    do {
      index = Math.floor(Math.random() * heroClips.length);
    } while (heroClips.length > 1 && index === lastClip);
    lastClip = index;
    heroVideo.src = heroClips[index];
    heroVideo.play();
  }

  heroVideo.addEventListener('ended', playRandomClip);
  playRandomClip();
}

// Active nav link highlighting based on scroll position
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 100;

  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav-link[href="#${id}"]`);

    if (link) {
      if (scrollY >= top && scrollY < top + height) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }
  });
});
