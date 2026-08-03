export const PORTFOLIO_THEME_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';

  try {
    const storedPreference = window.localStorage.getItem('portfolio-theme');
    if (storedPreference === 'light' || storedPreference === 'dark') {
      preference = storedPreference;
    }
  } catch {}

  const resolvedTheme =
    preference === 'system'
      ? media.matches
        ? 'dark'
        : 'light'
      : preference;

  root.dataset.portfolioRoute = 'work';
  root.dataset.portfolioThemePreference = preference;
  root.dataset.portfolioTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
})();`
