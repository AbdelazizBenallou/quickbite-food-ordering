/**
 * Models — plain data structures for the whole app.
 *
 * They never talk to Firebase: repositories convert Firestore documents into
 * models, services build them, controllers render them.
 */

/**
 * A menu section: "المأكولات", "المشروبات", … owned by the restaurant owner.
 * Adding a document to the `categories` collection adds a section to the page.
 */
export class Category {
  constructor(data = {}) {
    this.id = data.id || "";
    this.name = data.name || "";
    this.slug = data.slug || "";
    this.icon = data.icon || "restaurant_menu";
    this.order = Number(data.order) || 0;
  }

  /** The items of this section, in `order` — the shape the view expects. */
  static fromFirestore(id, data = {}) {
    return new Category({ ...data, id });
  }
}

/** A single menu entry (`items/{id}` in Firestore, assets/data/menu.json offline). */
export class MenuItem {
  constructor(data = {}) {
    this.id = data.id || "";
    this.name = data.name || "";
    this.price = Number(data.price) || 0;
    this.image = data.image || "";
    this.categoryId = data.categoryId || "";
    this.available = data.available !== false;
    this.order = Number(data.order) || 0;
  }

  get formattedPrice() {
    return `${this.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  static fromFirestore(id, data = {}) {
    return new MenuItem({ ...data, id });
  }
}

/** A line in the cart: a menu item + how many of it. */
export class CartItem {
  constructor(data = {}) {
    this.id = data.id || "";
    this.name = data.name || "";
    this.price = Number(data.price) || 0;
    this.qty = Math.max(1, Number(data.qty) || 1);
  }

  get subtotal() {
    return this.price * this.qty;
  }

  /** Shape stored inside an order document (no UI-only fields). */
  toOrderLine() {
    return { id: this.id, name: this.name, price: this.price, qty: this.qty };
  }
}

/** The customer filling the checkout form. */
export class Customer {
  constructor(data = {}) {
    this.name = data.name || "";
    this.phone = data.phone || "";
    this.address = data.address || "";
  }
}

/** Coerces any stored timestamp shape (Firestore Timestamp, Date, seconds,
 *  ms number) into a real `Date` (or null). Read-side only, never persisted. */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  return null;
}

/** An order, as persisted in Firestore. */
export class Order {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    // Stored lines only carry {id, name, price, qty}; keep a computed subtotal
    // so views never show 0.00 for older orders.
    this.items = Array.isArray(data.items)
      ? data.items.map((item) => {
          const price = Number(item.price) || 0;
          const qty = Math.max(1, Number(item.qty) || 1);
          return { ...item, price, qty, subtotal: Number(item.subtotal) || price * qty };
        })
      : [];
    this.customer = data.customer || new Customer();
    this.itemCount = Number(data.itemCount) || 0;
    this.subtotal = Number(data.subtotal) || 0;
    this.deliveryFee = Number(data.deliveryFee) || 0;
    this.total = Number(data.total) || 0;
    this.status = data.status || "pending";
    this.orderNumber = data.orderNumber || "";
    this.createdAt = toDate(data.createdAt);
  }

  /** Builds an order from a cart + customer, before it is stored. */
  static fromCart(cart = [], customer = {}, options = {}) {
    const items = cart.map((item) => item.toOrderLine());
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryFee = Number(options.deliveryFee) || 0;
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

    return new Order({
      userId: options.userId || null,
      items,
      customer: new Customer(customer),
      itemCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      status: options.status || "pending",
    });
  }

  /** Firestore-friendly object (plain data, no methods, no undefined). */
  toFirestore(createdAt) {
    return {
      userId: this.userId,
      items: this.items,
      customer: {
        name: this.customer.name,
        phone: this.customer.phone,
        address: this.customer.address,
      },
      itemCount: this.itemCount,
      subtotal: this.subtotal,
      deliveryFee: this.deliveryFee,
      total: this.total,
      status: this.status,
      orderNumber: this.orderNumber,
      createdAt: createdAt || null,
    };
  }

  /** Rebuilds a model from a Firestore snapshot. */
  static fromFirestore(id, data = {}) {
    return new Order({ ...data, id });
  }
}
