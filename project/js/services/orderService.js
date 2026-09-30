/**
 * Order business logic.
 *
 * `buildOrder()` assembles the Order model from the cart + the customer form.
 * `persistOrder()` writes it to the `orders` collection; it never throws, it
 * reports the outcome so the checkout can confirm or ask for a retry.
 */
import { appConfig } from "../config/app.config.js";
import { orderRepository } from "../repositories/index.js";
import { getCart } from "./cartService.js";
import { Order } from "../models/index.js";
import { ORDER_STATUS } from "../utils/constants.js";

/** Builds the Order model for the current cart + customer. No I/O. */
export function buildOrder(customer) {
  return Order.fromCart(getCart(), customer, {
    deliveryFee: appConfig.checkout.deliveryFee,
    status: ORDER_STATUS.PENDING,
  });
}

/**
 * A blocked or hanging network must never leave the customer staring at a
 * disabled button, so the write is given a deadline.
 */
const WRITE_TIMEOUT_MS = 10_000;

/**
 * Saves the order to the `orders` collection.
 * Never throws: it reports what happened so the controller can either confirm
 * the order or ask the customer to retry.
 *
 * @returns {Promise<{ order: Order, persisted: boolean, error: Error|null }>}
 */
export async function persistOrder(order, { timeoutMs = WRITE_TIMEOUT_MS } = {}) {
  let timer;

  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no response after ${timeoutMs} ms`)), timeoutMs);
  });

  try {
    const saved = await Promise.race([orderRepository.create(order), deadline]);
    return { order: saved, persisted: true, error: null };
  } catch (error) {
    console.warn("[orderService] Order could not be saved:", error?.message || error);
    return { order, persisted: false, error };
  } finally {
    clearTimeout(timer);
  }
}
