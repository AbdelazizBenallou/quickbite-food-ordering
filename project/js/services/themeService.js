/* ==========================================================================
   كويك بايت | Quick Bite — theme service

   Bridges the navbar toggle to the boot loader (js/theme.js). The boilerplate
   lives there; this layer adds the animation class and the JS-side helpers.
   ========================================================================== */

const THEME = {
  toggle: () => {
    const next = themeService.getTheme() === "dark" ? "light" : "dark";
    themeService.setTheme(next);
    return next;
  },
};

const themeService = {
  getTheme: () => {
    const boot = window.QUICKBITE_THEME;
    return boot ? boot.getTheme() : "light";
  },

  isDark: () => themeService.getTheme() === "dark",

  setTheme(theme) {
    const boot = window.QUICKBITE_THEME;
    if (!boot) return;
    const key = theme === "dark" ? "dark" : "light";
    boot.apply(key);
    boot.save(key);
    document.documentElement.classList.add("theme-anim");
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-anim");
    }, 420);
  },

  toggle: THEME.toggle,
};

export { themeService };