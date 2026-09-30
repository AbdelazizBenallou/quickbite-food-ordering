/**
 * The navbar theme toggle lives in index.html (it replaced the account icon).
 * This component only knows how to describe it — icon, title and pressed state —
 * so the controller stays thin and the markup stays static.
 */

const THEME_ICONS = {
  light: "light_mode",
  dark: "dark_mode",
};

const THEME_LABELS = {
  light: "تبديل إلى الوضع الداكن",
  dark: "تبديل إلى الوضع الفاتح",
};

/**
 * Reflect the current theme on the navbar toggle:
 *   - sun glyph while in light mode, moon glyph while in dark mode
 *   - `aria-pressed` = (theme === "dark") for assistive tech
 *   - title + aria-label tell the customer what the button will do
 *
 * @param {HTMLButtonElement} button
 * @param {"light"|"dark"} theme
 */
export function applyThemeToggleState(button, theme) {
  const next = theme === "dark" ? "light" : "dark";
  const icon = button.querySelector(".material-symbols-outlined");
  if (icon) icon.textContent = THEME_ICONS[theme];
  button.setAttribute("aria-pressed", String(theme === "dark"));
  button.setAttribute("aria-label", THEME_LABELS[next]);
  button.title = THEME_LABELS[next];
}