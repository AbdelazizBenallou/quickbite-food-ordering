/**
 * Controllers — the bridge between the UI and the services.
 *
 * They own: button events, the checkout form, loading states, error handling
 * and re-rendering. They never import the Firebase SDK.
 */
import { $, delegate, formatNumber } from "../utils/helpers.js";
import { ACTIONS, SELECTORS } from "../utils/constants.js";
import { cleanPhone, validateCustomer, validateField } from "../utils/validators.js";
import { appConfig } from "../config/app.config.js";
import { createCartItemRow } from "../components/index.js";
import { renderMenu } from "../components/menuView.js";
import { clearFieldErrors, isFieldInvalid, setFieldError, showFieldErrors } from "../components/formView.js";
import { applyThemeToggleState } from "../components/themeToggle.js";
import { Customer } from "../models/index.js";
import {
  addItem,
  clearCart,
  getCart,
  getCartTotal,
  getMenuSections,
  isCartEmpty,
  resetCartToDefault,
  updateQty,
  buildOrder,
  persistOrder,
  themeService,
} from "../services/index.js";
import { storeRepository } from "../repositories/index.js";

/* -------------------------------------------------------------------------- */
/* Store status (does the kitchen accept new orders?)                          */
/* -------------------------------------------------------------------------- */

/** Defaults to open; becomes live once Firestore answers. */
let storeOpen = true;

function applyStoreStatusUI(open) {
  const chip = $(SELECTORS.STORE_STATUS_CHIP);
  const chipText = $(SELECTORS.STORE_STATUS_TEXT);
  const chipDot = chip ? chip.querySelector("span") : null;
  const notice = $(SELECTORS.STORE_CLOSED_NOTICE);
  const confirmBtn = $(SELECTORS.CONFIRM_BUTTON);
  const confirmLabel = $(SELECTORS.CONFIRM_BUTTON_LABEL);

  if (chip) {
    chip.classList.toggle("bg-primary/10", open);
    chip.classList.toggle("text-primary", open);
    chip.classList.toggle("bg-error-container", !open);
    chip.classList.toggle("text-on-error-container", !open);
  }
  if (chipDot) chipDot.classList.toggle("bg-primary", open);
  if (chipDot) chipDot.classList.toggle("animate-pulse", open);
  if (chipDot) chipDot.classList.toggle("bg-error", !open);
  if (chipText) chipText.textContent = open ? "مفتوح الآن" : "مغلق مؤقتاً";
  if (notice) notice.classList.toggle("hidden", open);
  if (confirmLabel) confirmLabel.textContent = open ? "تأكيد الطلب" : "المتجر مغلق";

  // Freeze (or unfreeze) the order button.
  const cartEmpty = isCartEmpty();
  confirmBtn.disabled = cartEmpty || !open;
  confirmBtn.classList.toggle("opacity-50", cartEmpty || !open);
}

export function initStoreStatusController() {
  storeRepository.onStatus(({ open }) => {
    if (storeOpen === open) {
      applyStoreStatusUI(open);
      return;
    }
    storeOpen = open;
    applyStoreStatusUI(open);
    renderCart();
  });
  applyStoreStatusUI(storeOpen);
}

/* -------------------------------------------------------------------------- */
/* Menu rendering (the single place the menu list is drawn)                    */
/* -------------------------------------------------------------------------- */

export function renderMenuSections() {
  return renderMenu($(SELECTORS.MENU_ROOT), getMenuSections());
}

/* -------------------------------------------------------------------------- */
/* Cart rendering (the single place the cart list is drawn)                    */
/* -------------------------------------------------------------------------- */

export function renderCart() {
  const listEl = $(SELECTORS.CART_ITEMS);
  const emptyEl = $(SELECTORS.CART_EMPTY);
  const totalEl = $(SELECTORS.CART_TOTAL);
  const confirmBtn = $(SELECTORS.CONFIRM_BUTTON);

  listEl.innerHTML = "";

  if (isCartEmpty()) {
    emptyEl.classList.remove("hidden");
    totalEl.textContent = "0 د.ج";
    confirmBtn.disabled = true;
    confirmBtn.classList.add("opacity-50");
    return;
  }

  emptyEl.classList.add("hidden");
  confirmBtn.disabled = !(storeOpen && !isCartEmpty());
  confirmBtn.classList.toggle("opacity-50", !(storeOpen && !isCartEmpty()));

  getCart().forEach((item, index) => {
    listEl.appendChild(createCartItemRow(item, index));
  });

  totalEl.textContent = `${formatNumber(getCartTotal())} د.ج`;
}

/* -------------------------------------------------------------------------- */
/* Menu buttons                                                                */
/* -------------------------------------------------------------------------- */

export function initMenuController() {
  delegate(document.body, "click", `[${ACTIONS.ADD_TO_CART}]`, (event, button) => {
    event.preventDefault();
    addItem(button.getAttribute(ACTIONS.ADD_TO_CART));
    renderCart();
  });
}
/* -------------------------------------------------------------------------- */
/* Cart controls (steppers + "مسح الكل")                                        */
/* -------------------------------------------------------------------------- */

export function initCartController() {
  delegate(document.body, "click", `[${ACTIONS.QTY_CHANGE}]`, (event, button) => {
    event.preventDefault();
    updateQty(Number(button.getAttribute(ACTIONS.QTY_CHANGE)), Number(button.dataset.delta));
    renderCart();
  });

  delegate(document.body, "click", `[${ACTIONS.CLEAR_CART}]`, (event) => {
    event.preventDefault();
    clearCart();
    renderCart();
  });
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                    */
/* -------------------------------------------------------------------------- */

function readCustomerForm() {
  return new Customer({
    name: $(SELECTORS.CUSTOMER_FORM.NAME).value,
    phone: $(SELECTORS.CUSTOMER_FORM.PHONE).value,
    address: $(SELECTORS.CUSTOMER_FORM.ADDRESS).value,
  });
}

/** "#A3F29C" from the Firestore document id — short enough for the badge. */
function formatOrderNumber(docId) {
  return String(docId || appConfig.checkout.fallbackOrderNumber).slice(-6).toUpperCase();
}

/** The confirm button is disabled while the order is being written. */
function setCheckoutBusy(confirmBtn, busy) {
  confirmBtn.disabled = busy;
  confirmBtn.classList.toggle("opacity-50", busy);
}

/**
 * Live feedback on the three fields:
 *   - the phone box only accepts digits, at most `phoneDigits` of them
 *   - a field that is red clears the moment it becomes valid
 *   - leaving a field checks it
 */
function initFieldValidation() {
  // Element id -> the key the validators use.
  const fields = {
    [SELECTORS.CUSTOMER_FORM.NAME]: "name",
    [SELECTORS.CUSTOMER_FORM.PHONE]: "phone",
    [SELECTORS.CUSTOMER_FORM.ADDRESS]: "address",
  };

  const phoneEl = $(SELECTORS.CUSTOMER_FORM.PHONE);

  phoneEl.addEventListener("input", () => {
    const digits = cleanPhone(phoneEl.value).slice(0, appConfig.validation.phoneDigits);
    if (digits !== phoneEl.value) {
      phoneEl.value = digits;
    }
  });

  Object.entries(fields).forEach(([id, key]) => {
    const el = $(id);

    // Only re-check a field that is already red, so the form stays quiet until
    // the customer has actually tried to submit.
    el.addEventListener("input", () => {
      if (isFieldInvalid(id)) {
        setFieldError(id, validateField(key, el.value));
      }
    });

    el.addEventListener("blur", () => setFieldError(id, validateField(key, el.value)));
  });
}

export function initCheckoutController() {
  const confirmBtn = $(SELECTORS.CONFIRM_BUTTON);
  const successBox = $(SELECTORS.SUCCESS_BOX);
  const orderNumberEl = $(SELECTORS.ORDER_NUMBER);
  const errorEl = $(SELECTORS.ORDER_ERROR);

  initFieldValidation();

  delegate(document.body, "click", `[${ACTIONS.NEW_ORDER}]`, (event) => {
    event.preventDefault();
    successBox.classList.add("hidden");
    errorEl.classList.add("hidden");
    clearFieldErrors();
    resetCartToDefault();
    renderCart();
  });

  confirmBtn.addEventListener("click", async () => {
    if (confirmBtn.disabled) return;

    if (!storeOpen) {
      errorEl.textContent = "المتجر مغلق مؤقتاً — لا يمكن استقبال الطلبات حالياً.";
      errorEl.classList.remove("hidden");
      return;
    }
    const customer = readCustomerForm();
    const { valid, errors, firstInvalidField } = validateCustomer(customer);

    // Paint every bad field red with its Arabic message, and put the cursor on
    // the first one so the customer does not have to hunt for it.
    showFieldErrors(errors);

    if (!valid) {
      console.warn("[checkoutController] Invalid customer details:", errors);
      $(SELECTORS.CUSTOMER_FORM[firstInvalidField.toUpperCase()])?.focus();
      return;
    }

    // Assemble the order locally, then store it in the `orders` collection.
    const order = buildOrder(customer);

    setCheckoutBusy(confirmBtn, true);
    errorEl.classList.add("hidden");
    const { order: saved, persisted } = await persistOrder(order);
    setCheckoutBusy(confirmBtn, false);

    if (!persisted) {
      // Nothing was stored: keep the cart and tell the customer to retry
      // rather than confirming an order that does not exist.
      errorEl.classList.remove("hidden");
      return;
    }

    orderNumberEl.textContent = `طلب رقم #${formatOrderNumber(saved.id)}`;
    successBox.classList.remove("hidden");
    successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/* -------------------------------------------------------------------------- */
/* Theme toggle (navbar, swapped in for the account icon)                      */
/* -------------------------------------------------------------------------- */

export function initThemeController() {
  const toggleBtn = $(SELECTORS.THEME_TOGGLE);
  if (!toggleBtn) return;

  applyThemeToggleState(toggleBtn, themeService.getTheme());

  toggleBtn.addEventListener("click", () => {
    const next = themeService.toggle();
    applyThemeToggleState(toggleBtn, next);
  });
}

/* -------------------------------------------------------------------------- */

export function initControllers() {
  initMenuController();
  initCartController();
  initCheckoutController();
  initStoreStatusController();
  initThemeController();
  renderCart();
}
