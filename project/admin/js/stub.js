/**
 * كويك بايت | Quick Bite — placeholder renderer for dashboards that are still
 * under construction. Each page passes its own title/icon/note; the shared
 * shell + login guard come from layout.js.
 */
import { initAdminLayout } from "./layout.js";
import { escapeHtml } from "../../js/utils/helpers.js";

export function initStubPage({ page, subtitle, icon = "construction", note = "ستُبنى هذه الصفحة في الخطوة القادمة." }) {
  const demo = new URLSearchParams(window.location.search).has("demo");
  const layout = initAdminLayout({ activePath: page, subtitle, demo });

  layout.content.innerHTML = `
    <div class="flex items-center justify-center py-16 w-full">
      <div class="text-center space-y-space-sm bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 max-w-md w-full mx-margin-mobile">
        <span class="material-symbols-outlined text-[44px] text-primary inline-block">${escapeHtml(icon)}</span>
        <h2 class="font-headline-md text-headline-md text-on-surface font-bold">${escapeHtml(subtitle)}</h2>
        <p class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(note)}</p>
        <span class="inline-block text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">قريباً</span>
      </div>
    </div>`;
}