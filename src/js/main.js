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

  document.querySelectorAll('.team-card[data-player]').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('compare-player-img').src = card.dataset.img;
      document.getElementById('compare-player-img').alt = card.dataset.name;
      document.getElementById('compare-player-name').textContent = card.dataset.name;
      document.getElementById('compare-atk').textContent = card.dataset.attacker;
      document.getElementById('compare-def').textContent = card.dataset.defender;

      if (card.dataset.subName) {
        subPlaceholder.style.display = 'none';
        subImg.style.display = '';
        subImg.src = card.dataset.subImg;
        subImg.alt = card.dataset.subName;
        subName.textContent = card.dataset.subName;
        subName.classList.remove('compare-muted');
        subAtk.textContent = card.dataset.subAttacker;
        subAtk.classList.remove('compare-muted');
        subDef.textContent = card.dataset.subDefender;
        subDef.classList.remove('compare-muted');
      } else {
        subPlaceholder.style.display = '';
        subImg.style.display = 'none';
        subName.textContent = '---';
        subName.classList.add('compare-muted');
        subAtk.textContent = '---';
        subAtk.classList.add('compare-muted');
        subDef.textContent = '---';
        subDef.classList.add('compare-muted');
      }

      compareModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  compareClose.addEventListener('click', () => {
    compareModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  compareModal.addEventListener('click', (e) => {
    if (e.target === compareModal) {
      compareModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && compareModal.classList.contains('active')) {
      compareModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
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
