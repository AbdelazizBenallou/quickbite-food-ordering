/**
 * Form field state: red border + an Arabic message under the field.
 *
 * DOM only — it never decides *whether* a value is valid (that is
 * js/utils/validators.js) and never talks to Firebase.
 */


import { SELECTORS } from "../utils/constants.js";

/** The key the validators use ("name") → the id of its input ("cust-name"). */
const FIELD_IDS = {
  name: SELECTORS.CUSTOMER_FORM.NAME,
  phone: SELECTORS.CUSTOMER_FORM.PHONE,
  address: SELECTORS.CUSTOMER_FORM.ADDRESS,
};

/** Class added to an input that has a problem. Styled in css/style.css. */
export const INVALID_CLASS = "is-invalid";

/** Accepts a validator key ("name"), an id ("cust-name") or "#cust-name". */
function toId(field) {
  const raw = String(field || "");
  return String(FIELD_IDS[raw] ?? raw).replace(/^#/, "");
}

/** The <p data-error-for="cust-name"> that belongs to a field. */
function errorElement(fieldId) {
  return document.querySelector(`[data-error-for="${toId(fieldId)}"]`);
}

/** Paints one field red and shows its message (or clears it when message is null). */
export function setFieldError(field, message) {
  const fieldId = toId(field);
  const input = document.getElementById(fieldId);
  if (!input) return;

  const errorEl = errorElement(fieldId);

  if (message) {
    input.classList.add(INVALID_CLASS);
    input.setAttribute("aria-invalid", "true");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
  } else {
    input.classList.remove(INVALID_CLASS);
    input.removeAttribute("aria-invalid");
    errorEl?.classList.add("hidden");
  }
}

/** Applies a `{ field: message }` map from validateCustomer(). */
export function showFieldErrors(errors = {}) {
  Object.entries(errors).forEach(([field, message]) => setFieldError(field, message));
}

/** Removes every error state from the form. */
export function clearFieldErrors() {
  document.querySelectorAll(`.${INVALID_CLASS}`).forEach((input) => {
    input.classList.remove(INVALID_CLASS);
    input.removeAttribute("aria-invalid");
  });
  document.querySelectorAll("[data-error-for]").forEach((el) => el.classList.add("hidden"));
}

/** True when the field is currently painted red. */
export function isFieldInvalid(field) {
  return Boolean(document.getElementById(toId(field))?.classList.contains(INVALID_CLASS));
}
