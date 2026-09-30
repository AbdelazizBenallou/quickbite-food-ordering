/**
 * كويك بايت | Quick Bite — small pieces shared by every admin page
 * (login, orders, …): the navbar theme toggle wiring, using the customer app's
 * themeService + themeToggle component.
 */
import { themeService } from "../../js/services/themeService.js";
import { applyThemeToggleState } from "../../js/components/themeToggle.js";

/** Wires #theme-toggle (sun ⇄ moon), if present. Safe to call more than once. */
export function initAdminThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;
  applyThemeToggleState(toggleBtn, themeService.getTheme());
  toggleBtn.addEventListener("click", () => {
    applyThemeToggleState(toggleBtn, themeService.toggle());
  });
}