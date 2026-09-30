/**
 * Reusable UI pieces. They build DOM only — no Firebase, no business rules.
 */
export { createMenuItemCard, createMenuSection, renderMenu } from "./menuView.js";
export { setFieldError, showFieldErrors, clearFieldErrors, isFieldInvalid } from "./formView.js";
export { applyThemeToggleState } from "./themeToggle.js";
import { ACTIONS } from "../utils/constants.js";
import { formatNumber } from "../utils/helpers.js";

/**
 * One cart row: name, unit price, − qty + stepper, line total.
 * Identical markup to the original inline template.
 *
 * @param {import("../models/index.js").CartItem} item
 * @param {number} index position in the cart (used by the stepper)
 */
export function createCartItemRow(item, index) {
  const row = document.createElement("div");
  row.className = "flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg";
  row.innerHTML = `
        <div class="min-w-0 pl-2 text-right">
          <div class="font-label-lg text-label-lg text-on-surface truncate">${item.name}</div>
          <div class="font-body-sm text-body-sm text-on-surface-variant">${formatNumber(item.price)} د.ج للواحدة</div>
        </div>
        <div class="flex items-center gap-space-md shrink-0">
          <div class="flex items-center bg-surface-container-lowest rounded-full p-0.5 shadow-sm">
            <button type="button" ${ACTIONS.QTY_CHANGE}="${index}" data-delta="-1" class="w-7 h-7 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors">
              <span class="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span class="w-6 text-center font-label-md text-label-md text-on-surface font-bold">${item.qty}</span>
            <button type="button" ${ACTIONS.QTY_CHANGE}="${index}" data-delta="1" class="w-7 h-7 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors">
              <span class="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
          <span class="font-price-display text-price-display text-on-surface min-w-[75px] text-left font-bold">${formatNumber(item.subtotal)} د.ج</span>
        </div>
      `;
  return row;
}
