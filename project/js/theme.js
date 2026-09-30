/* ==========================================================================
   كويك بايت | Quick Bite — theme boot loader

   Loaded synchronously in <head> BEFORE any CSS paint so the saved theme is
   applied before the page is shown (no flash of the wrong theme).

   This file owns where the preference lives and how it is written to the <html>
   element. js/services/themeService.js reuses the same configuration so toggle
   and boot can never disagree. Run `initThemeController` (see controllers) to
   make the navbar toggle interactive.
   ========================================================================== */

(function () {
  "use strict";

  var CONFIG = {
    storageKey: "quickbite:theme",
    defaultTheme: "light",
    attribute: "data-theme"
  };

  function readStoredTheme() {
    try {
      var saved = window.localStorage.getItem(CONFIG.storageKey);
      return saved === "dark" || saved === "light" ? saved : CONFIG.defaultTheme;
    } catch (err) {
      return CONFIG.defaultTheme;
    }
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute(CONFIG.attribute, theme);
    root.style.colorScheme = theme;
  }

  window.QUICKBITE_THEME = {
    boot: function () {
      applyTheme(readStoredTheme());
    },
    read: readStoredTheme,
    getTheme: function () {
      return document.documentElement.getAttribute(CONFIG.attribute) || CONFIG.defaultTheme;
    },
    apply: applyTheme,
    save: function (theme) {
      try {
        window.localStorage.setItem(CONFIG.storageKey, theme);
      } catch (err) {
        /* Storage unavailable (private mode, quota) — theme still applies for this visit. */
      }
    },
    CONFIG: CONFIG
  };

  window.QUICKBITE_THEME.boot();
})();