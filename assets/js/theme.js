const THEME_LABELS = {
  es: { toLight:'CLARO', toDark:'OSCURO', ariaToLight:'Cambiar a modo claro', ariaToDark:'Cambiar a modo oscuro' },
  en: { toLight:'LIGHT', toDark:'DARK', ariaToLight:'Switch to light mode', ariaToDark:'Switch to dark mode' },
  fr: { toLight:'CLAIR', toDark:'SOMBRE', ariaToLight:'Passer en mode clair', ariaToDark:'Passer en mode sombre' },
};

const THEME_KEY = 'conflict-atlas-theme';

function preferredTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function refreshThemeButton({ currentTheme, currentLang, buttonId = 'theme-btn' }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const labels = THEME_LABELS[currentLang] || THEME_LABELS.es;
  const toLight = currentTheme === 'dark';
  btn.textContent = toLight ? labels.toLight : labels.toDark;
  btn.dataset.active = currentTheme;

  const aria = toLight ? labels.ariaToLight : labels.ariaToDark;
  btn.setAttribute('aria-label', aria);
  btn.title = aria;
}

function setTheme(theme, { currentLang, buttonId = 'theme-btn', persist = true } = {}) {
  const currentTheme = theme === 'light' ? 'light' : 'dark';
  document.body.classList.add('theme-transition');
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (persist) {
    localStorage.setItem(THEME_KEY, currentTheme);
  }

  refreshThemeButton({ currentTheme, currentLang, buttonId });
  window.setTimeout(() => document.body.classList.remove('theme-transition'), 260);
  return currentTheme;
}

function initializeTheme(currentLang, buttonId = 'theme-btn') {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return setTheme(savedTheme || preferredTheme(), { currentLang, buttonId, persist: true });
}

function toggleTheme(currentTheme, currentLang, buttonId = 'theme-btn') {
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  return setTheme(nextTheme, { currentLang, buttonId, persist: true });
}

export { initializeTheme, refreshThemeButton, setTheme, toggleTheme };
