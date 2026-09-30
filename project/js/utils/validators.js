/**
 * Input validation. Pure functions, no Firebase, no DOM.
 *
 * Every message is in Arabic and is rendered next to the field it belongs to
 * (see js/components/formView.js).
 */
import { appConfig } from "../config/app.config.js";

/** Non-empty after trimming. */
export function isNotEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * A mobile number: exactly 10 digits starting with 05, 06 or 07
 * (e.g. 0551234567, 0612345678, 0791234567). Spaces, dashes and any other
 * character are ignored, so "055 123 4567" is accepted too.
 */
export function isValidPhone(value) {
  if (!isNotEmpty(value)) return false;
  const phone = value.trim().replace(/[\s-.]/g, "");
  return appConfig.validation.phonePatterns.some((pattern) => pattern.test(phone));
}

/** Strips everything that is not a digit — used while the customer types. */
export function cleanPhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** A customer name: letters/spaces, at least 2 characters. */
export function isValidName(value) {
  if (!isNotEmpty(value)) return false;
  return value.trim().length >= 2;
}

/** A delivery address of any real length. */
export function isValidAddress(value) {
  return isNotEmpty(value) && value.trim().length >= 4;
}

/** The Arabic messages shown under each field. */
export const MESSAGES = {
  name: "الاسم الكامل مطلوب",
  nameShort: "اكتب الاسم الكامل (حرفان على الأقل)",
  phone: "رقم الهاتف مطلوب",
  phoneFormat: appConfig.validation.phoneHint,
  address: "عنوان التوصيل مطلوب",
  addressShort: "اكتب عنوان التوصيل بالتفصيل",
};

/** Per-field rules, used on submit and while typing. */
const FIELDS = {
  name: {
    isValid: isValidName,
    message: (value) => (isNotEmpty(value) ? MESSAGES.nameShort : MESSAGES.name),
  },
  phone: {
    isValid: isValidPhone,
    message: (value) => (isNotEmpty(value) ? MESSAGES.phoneFormat : MESSAGES.phone),
  },
  address: {
    isValid: isValidAddress,
    message: (value) => (isNotEmpty(value) ? MESSAGES.addressShort : MESSAGES.address),
  },
};

/** Validates one field. Returns null when it is fine, or the Arabic message. */
export function validateField(field, value) {
  const rule = FIELDS[field];
  if (!rule) return null;
  return rule.isValid(value) ? null : rule.message(value);
}

/**
 * Validates the checkout form.
 * @returns {{ valid: boolean, errors: Record<string,string>, firstInvalidField: string|null }}
 */
export function validateCustomer(customer = {}) {
  const errors = {};

  for (const field of Object.keys(FIELDS)) {
    const message = validateField(field, customer[field]);
    if (message) {
      errors[field] = message;
    }
  }

  const firstInvalidField = Object.keys(errors)[0] || null;

  return { valid: firstInvalidField === null, errors, firstInvalidField };
}
