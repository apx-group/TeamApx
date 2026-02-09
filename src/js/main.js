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

// Player Modal
const playerModal = document.getElementById('player-modal');
const modalClose = document.getElementById('player-modal-close');

if (playerModal) {
  document.querySelectorAll('.team-card[data-player]').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('modal-img').src = card.dataset.img;
      document.getElementById('modal-img').alt = card.dataset.name;
      document.getElementById('modal-name').textContent = card.dataset.name;
      document.getElementById('modal-game').textContent = card.dataset.game;
      document.getElementById('modal-attacker').textContent = card.dataset.attacker;
      document.getElementById('modal-defender').textContent = card.dataset.defender;
      document.getElementById('modal-playstyle').textContent = card.dataset.playstyle;
      document.getElementById('modal-tracker').href = card.dataset.tracker;
      document.getElementById('modal-twitter').href = card.dataset.twitter;
      document.getElementById('modal-challengermode').href = card.dataset.challengermode;
      playerModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  modalClose.addEventListener('click', () => {
    playerModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  playerModal.addEventListener('click', (e) => {
    if (e.target === playerModal) {
      playerModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && playerModal.classList.contains('active')) {
      playerModal.classList.remove('active');
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
