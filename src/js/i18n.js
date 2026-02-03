const translations = {
  de: {
    // Navbar
    "nav.home": "Home",
    "nav.potw": "Weekly Performance",
    "nav.about": "Über uns",
    "nav.team": "Team",
    "nav.socials": "Socials",
    "nav.apply": "Jetzt bewerben",

    // Player of the Week
    "potw.title": 'Spieler der <span class="accent">Woche</span>',
    "potw.stat.role": "Rolle",

    // Hero
    "hero.subtitle": "Compete. Dominate. Rise.",
    "hero.btn.more": "Mehr erfahren",
    "hero.btn.apply": "Jetzt bewerben",

    // About
    "about.title": 'Über <span class="accent">uns</span>',
    "about.text1": "Team Apx ist ein kompetitives E-Sport Team mit dem Ziel, in den größten Turnieren anzutreten und uns stetig zu verbessern. Wir stehen für Teamwork, Disziplin und den unbedingten Willen zu gewinnen.",
    "about.text2": "Gegründet aus Leidenschaft für kompetitives Gaming, sind wir heute ein wachsendes Team mit Spielern aus verschiedenen Bereichen des E-Sports.",
    "about.stat.players": "Spieler",
    "about.stat.tournaments": "Turniere",
    "about.stat.founded": "Gegründet",

    // Team
    "team.title": 'Unser <span class="accent">Team</span>',

    // Events
    "nav.events": "Events",
    "events.title": 'Unsere <span class="accent">Events</span>',
    "events.subtitle": "Aktuelle und kommende Turniere im Überblick.",

    // Socials
    "socials.title": 'Folge <span class="accent">uns</span>',
    "socials.subtitle": "Bleib auf dem Laufenden und werde Teil unserer Community.",

    // CTA
    "cta.title": 'Werde Teil von <span class="accent">Team Apx</span>',
    "cta.text": "Du bist motiviert, ehrgeizig und willst auf dem nächsten Level spielen? Dann bewirb dich jetzt!",
    "cta.btn": "Zur Bewerbung",

    // Modal
    "modal.attacker": "Attacker",
    "modal.defender": "Defender",
    "modal.playstyle": "Playstyle",

    // Footer
    "footer.copy": "\u00a9 2026 Team Apx. Alle Rechte vorbehalten.",
    "footer.about": "Über uns",
    "footer.apply": "Bewerben",
    "footer.impressum": "Impressum",
    "footer.privacy": "Datenschutz",

    // Apply page
    "apply.title": 'Bewirb dich <span class="accent">jetzt</span>',
    "apply.subtitle": "Fülle das Formular aus und wir melden uns bei dir.",

    "apply.legend.personal": "Persönliche Infos",
    "apply.label.name": "Name / Nickname *",
    "apply.placeholder.name": "Dein Name oder Nickname",
    "apply.label.age": "Alter *",
    "apply.placeholder.age": "Dein Alter",
    "apply.label.discord": "Discord-Tag *",
    "apply.placeholder.discord": "z.B. username",

    "apply.legend.gaming": "Gaming",
    "apply.label.game": "Spiel *",
    "apply.option.selectgame": "Wähle ein Spiel",
    "apply.option.other": "Anderes",
    "apply.label.rank": "Aktueller Rang",
    "apply.placeholder.rank": "z.B. Diamond, Champion",
    "apply.label.attackerRole": "Attacker Rolle",
    "apply.placeholder.attackerRole": "Bis zu 3 wählen",
    "apply.label.defenderRole": "Defender Rolle",
    "apply.placeholder.defenderRole": "Bis zu 3 wählen",
    "apply.label.experience": "Erfahrung *",
    "apply.option.howmuch": "Wie viel Erfahrung hast du?",
    "apply.option.beginner": "Anfänger (unter 1 Jahr)",
    "apply.option.intermediate": "Fortgeschritten (1–3 Jahre)",
    "apply.option.advanced": "Erfahren (3+ Jahre)",
    "apply.option.pro": "Semi-Pro / Pro",

    "apply.legend.motivation": "Motivation",
    "apply.label.motivation": "Warum möchtest du bei Team Apx spielen? *",
    "apply.placeholder.motivation": "Erzähl uns, warum du zum Team passt...",
    "apply.label.availability": "Verfügbarkeit für Training",
    "apply.placeholder.availability": "z.B. Mo-Fr abends, Wochenende flexibel",

    "apply.btn.submit": "Bewerbung absenden",
    "apply.success.title": "Bewerbung gesendet!",
    "apply.success.text": "Vielen Dank für dein Interesse. Wir melden uns in Kürze bei dir über Discord.",
    "apply.success.btn": "Zurück zur Startseite",

    // User menu
    "user.settings": "Einstellungen",
    "user.login": "Login",
    "user.logout": "Logout",

    // Login page
    "auth.login.title": '<span class="accent">Login</span>',
    "auth.login.label.identifier": "E-Mail oder Benutzername",
    "auth.login.placeholder.identifier": "E-Mail oder Benutzername",
    "auth.login.label.password": "Passwort",
    "auth.login.placeholder.password": "Passwort",
    "auth.login.btn": "Einloggen",
    "auth.login.switch": 'Noch kein Konto? <a href="register.html" class="accent">Registrieren</a>',

    // Register page
    "auth.register.title": '<span class="accent">Registrieren</span>',
    "auth.register.label.username": "Benutzername",
    "auth.register.placeholder.username": "Benutzername",
    "auth.register.label.email": "E-Mail",
    "auth.register.placeholder.email": "E-Mail Adresse",
    "auth.register.label.password": "Passwort",
    "auth.register.placeholder.password": "Min. 8 Zeichen",
    "auth.register.label.confirm": "Passwort bestätigen",
    "auth.register.placeholder.confirm": "Passwort wiederholen",
    "auth.register.btn": "Registrieren",
    "auth.register.switch": 'Bereits ein Konto? <a href="login.html" class="accent">Einloggen</a>',

    // Settings page
    "settings.title": '<span class="accent">Einstellungen</span>',
    "settings.placeholder": "Diese Seite wird bald verfügbar sein.",

    // My Application page
    "myapp.title": 'Meine <span class="accent">Bewerbung</span>',
    "myapp.loading": "Lade Bewerbung...",
    "myapp.empty": "Du hast noch keine Bewerbung abgeschickt.",
    "myapp.loginRequired": "Bitte zuerst einloggen.",
    "myapp.goToLogin": "Zum Login",
    "myapp.legend.personal": "Persönliche Infos",
    "myapp.label.name": "Name / Nickname *",
    "myapp.label.age": "Alter *",
    "myapp.label.discord": "Discord-Tag *",
    "myapp.legend.gaming": "Gaming",
    "myapp.label.game": "Spiel *",
    "myapp.label.rank": "Rang",
    "myapp.label.attackerRole": "Attacker Rolle",
    "myapp.label.defenderRole": "Defender Rolle",
    "myapp.label.experience": "Erfahrung *",
    "myapp.legend.motivation": "Motivation",
    "myapp.label.motivation": "Warum Team Apx? *",
    "myapp.label.availability": "Verfügbarkeit",
    "myapp.btn.save": "Änderungen speichern",
    "myapp.saveSuccess": "Änderungen gespeichert.",
    "myapp.saveFailed": "Speichern fehlgeschlagen.",
    "myapp.received": "Eingegangen:",
    "myapp.status.pending": "Offen",
    "myapp.status.accepted": "Angenommen",
    "myapp.status.rejected": "Abgelehnt",

    // Applications page (admin)
    "apps.title": '<span class="accent">Bewerbungen</span>',
    "apps.subtitle": "Alle eingegangenen Bewerbungen.",
    "apps.empty": "Keine Bewerbungen vorhanden.",
    "apps.error": "Zugriff verweigert. Bitte als Admin einloggen.",
    "apps.modal.title": "Bewerbung",
    "apps.label.name": "Name / Nickname",
    "apps.label.age": "Alter",
    "apps.label.discord": "Discord-Tag",
    "apps.label.game": "Spiel",
    "apps.label.rank": "Rang",
    "apps.label.attackerRole": "Attacker Rolle",
    "apps.label.defenderRole": "Defender Rolle",
    "apps.label.experience": "Erfahrung",
    "apps.label.motivation": "Warum Team Apx?",
    "apps.label.availability": "Verfügbarkeit",

    // User dropdown (application links)
    "user.profile": "Profil",
    "user.myApplication": "Meine Bewerbung",
    "user.applications": "Bewerbungen",

    // Profile page
    "profile.banner.hint": "Banner hochladen (min. 680\u00d7240px, max 10 MB)",
    "profile.avatar.hint": "Profilbild ändern",
    "profile.loginRequired": "Bitte zuerst einloggen.",
    "profile.label.username": "Benutzername",
    "profile.label.email": "E-Mail",
    "profile.btn.save": "Speichern",
    "profile.saveSuccess": "Profil gespeichert.",
    "profile.saveFailed": "Speichern fehlgeschlagen."
  },

  en: {
    // Navbar
    "nav.home": "Home",
    "nav.potw": "Weekly Performance",
    "nav.about": "About us",
    "nav.team": "Team",
    "nav.socials": "Socials",
    "nav.apply": "Apply now",

    // Player of the Week
    "potw.title": 'Player of the <span class="accent">Week</span>',
    "potw.stat.role": "Role",

    // Hero
    "hero.subtitle": "Compete. Dominate. Rise.",
    "hero.btn.more": "Learn more",
    "hero.btn.apply": "Apply now",

    // About
    "about.title": 'About <span class="accent">us</span>',
    "about.text1": "Team Apx is a competitive esports team with the goal of competing in the biggest tournaments and constantly improving. We stand for teamwork, discipline, and the unwavering will to win.",
    "about.text2": "Founded out of passion for competitive gaming, we are today a growing team with players from various areas of esports.",
    "about.stat.players": "Players",
    "about.stat.tournaments": "Tournaments",
    "about.stat.founded": "Founded",

    // Team
    "team.title": 'Our <span class="accent">Team</span>',

    // Events
    "nav.events": "Events",
    "events.title": 'Our <span class="accent">Events</span>',
    "events.subtitle": "Current and upcoming tournaments at a glance.",

    // Socials
    "socials.title": 'Follow <span class="accent">us</span>',
    "socials.subtitle": "Stay up to date and become part of our community.",

    // CTA
    "cta.title": 'Become part of <span class="accent">Team Apx</span>',
    "cta.text": "You are motivated, ambitious, and want to play at the next level? Apply now!",
    "cta.btn": "Go to application",

    // Modal
    "modal.attacker": "Attacker",
    "modal.defender": "Defender",
    "modal.playstyle": "Playstyle",

    // Footer
    "footer.copy": "\u00a9 2026 Team Apx. All rights reserved.",
    "footer.about": "About us",
    "footer.apply": "Apply",
    "footer.impressum": "Legal Notice",
    "footer.privacy": "Privacy Policy",

    // Apply page
    "apply.title": 'Apply <span class="accent">now</span>',
    "apply.subtitle": "Fill out the form and we will get back to you.",

    "apply.legend.personal": "Personal Info",
    "apply.label.name": "Name / Nickname *",
    "apply.placeholder.name": "Your name or nickname",
    "apply.label.age": "Age *",
    "apply.placeholder.age": "Your age",
    "apply.label.discord": "Discord Tag *",
    "apply.placeholder.discord": "e.g. username",

    "apply.legend.gaming": "Gaming",
    "apply.label.game": "Game *",
    "apply.option.selectgame": "Select a game",
    "apply.option.other": "Other",
    "apply.label.rank": "Current Rank",
    "apply.placeholder.rank": "e.g. Diamond, Champion",
    "apply.label.attackerRole": "Attacker Role",
    "apply.placeholder.attackerRole": "Select up to 3",
    "apply.label.defenderRole": "Defender Role",
    "apply.placeholder.defenderRole": "Select up to 3",
    "apply.label.experience": "Experience *",
    "apply.option.howmuch": "How much experience do you have?",
    "apply.option.beginner": "Beginner (under 1 year)",
    "apply.option.intermediate": "Intermediate (1–3 years)",
    "apply.option.advanced": "Experienced (3+ years)",
    "apply.option.pro": "Semi-Pro / Pro",

    "apply.legend.motivation": "Motivation",
    "apply.label.motivation": "Why do you want to play for Team Apx? *",
    "apply.placeholder.motivation": "Tell us why you are a good fit for the team...",
    "apply.label.availability": "Availability for practice",
    "apply.placeholder.availability": "e.g. Mon-Fri evenings, weekends flexible",

    "apply.btn.submit": "Submit application",
    "apply.success.title": "Application sent!",
    "apply.success.text": "Thank you for your interest. We will get back to you shortly via Discord.",
    "apply.success.btn": "Back to homepage",

    // User menu
    "user.settings": "Settings",
    "user.login": "Login",
    "user.logout": "Logout",

    // Login page
    "auth.login.title": '<span class="accent">Login</span>',
    "auth.login.label.identifier": "Email or Username",
    "auth.login.placeholder.identifier": "Email or username",
    "auth.login.label.password": "Password",
    "auth.login.placeholder.password": "Password",
    "auth.login.btn": "Log in",
    "auth.login.switch": 'No account yet? <a href="register.html" class="accent">Register</a>',

    // Register page
    "auth.register.title": '<span class="accent">Register</span>',
    "auth.register.label.username": "Username",
    "auth.register.placeholder.username": "Username",
    "auth.register.label.email": "Email",
    "auth.register.placeholder.email": "Email address",
    "auth.register.label.password": "Password",
    "auth.register.placeholder.password": "Min. 8 characters",
    "auth.register.label.confirm": "Confirm Password",
    "auth.register.placeholder.confirm": "Repeat password",
    "auth.register.btn": "Register",
    "auth.register.switch": 'Already have an account? <a href="login.html" class="accent">Log in</a>',

    // Settings page
    "settings.title": '<span class="accent">Settings</span>',
    "settings.placeholder": "This page will be available soon.",

    // My Application page
    "myapp.title": 'My <span class="accent">Application</span>',
    "myapp.loading": "Loading application...",
    "myapp.empty": "You haven't submitted an application yet.",
    "myapp.loginRequired": "Please log in first.",
    "myapp.goToLogin": "Go to Login",
    "myapp.legend.personal": "Personal Info",
    "myapp.label.name": "Name / Nickname *",
    "myapp.label.age": "Age *",
    "myapp.label.discord": "Discord Tag *",
    "myapp.legend.gaming": "Gaming",
    "myapp.label.game": "Game *",
    "myapp.label.rank": "Rank",
    "myapp.label.attackerRole": "Attacker Role",
    "myapp.label.defenderRole": "Defender Role",
    "myapp.label.experience": "Experience *",
    "myapp.legend.motivation": "Motivation",
    "myapp.label.motivation": "Why Team Apx? *",
    "myapp.label.availability": "Availability",
    "myapp.btn.save": "Save changes",
    "myapp.saveSuccess": "Changes saved.",
    "myapp.saveFailed": "Save failed.",
    "myapp.received": "Received:",
    "myapp.status.pending": "Pending",
    "myapp.status.accepted": "Accepted",
    "myapp.status.rejected": "Rejected",

    // Applications page (admin)
    "apps.title": '<span class="accent">Applications</span>',
    "apps.subtitle": "All received applications.",
    "apps.empty": "No applications found.",
    "apps.error": "Access denied. Please log in as admin.",
    "apps.modal.title": "Application",
    "apps.label.name": "Name / Nickname",
    "apps.label.age": "Age",
    "apps.label.discord": "Discord Tag",
    "apps.label.game": "Game",
    "apps.label.rank": "Rank",
    "apps.label.attackerRole": "Attacker Role",
    "apps.label.defenderRole": "Defender Role",
    "apps.label.experience": "Experience",
    "apps.label.motivation": "Why Team Apx?",
    "apps.label.availability": "Availability",

    // User dropdown (application links)
    "user.profile": "Profile",
    "user.myApplication": "My Application",
    "user.applications": "Applications",

    // Profile page
    "profile.banner.hint": "Upload banner (min. 680\u00d7240px, max 10 MB)",
    "profile.avatar.hint": "Change profile picture",
    "profile.loginRequired": "Please log in first.",
    "profile.label.username": "Username",
    "profile.label.email": "Email",
    "profile.btn.save": "Save",
    "profile.saveSuccess": "Profile saved.",
    "profile.saveFailed": "Save failed."
  }
};

function setLanguage(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const value = translations[lang]?.[key];
    if (value === undefined) return;

    // Check if the value contains HTML (span tags)
    if (value.includes("<")) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const value = translations[lang]?.[key];
    if (value !== undefined) {
      el.placeholder = value;
    }
  });

  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);

  // Update toggle button text to show the OTHER language
  const toggleBtn = document.getElementById("lang-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = lang === "de" ? "EN" : "DE";
  }

  // Update Impressum link to point to correct locale
  const impressumLink = document.getElementById("footer-impressum");
  if (impressumLink) {
    impressumLink.href = lang === "de" ? "de/impressum/index.html" : "en/impressum/index.html";
  }

  // Update Datenschutz link to point to correct locale
  const privacyLink = document.getElementById("footer-datenschutz");
  if (privacyLink) {
    privacyLink.href = lang === "de" ? "de/datenschutz/index.html" : "en/datenschutz/index.html";
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("lang") || "en";
  setLanguage(saved);

  const toggleBtn = document.getElementById("lang-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = localStorage.getItem("lang") || "de";
      setLanguage(current === "de" ? "en" : "de");
    });
  }
});
