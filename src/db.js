
/*****    Database layer (SQLite) for orders + order items *****/

import Database from "better-sqlite3";

// database initializing
export function initDb(dbPath) {
  const db = new Database(dbPath);

  // using WAL for concurrent accesses to database
  db.pragma("journal_mode = WAL");

  db.exec(`
    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderNumber TEXT NOT NULL UNIQUE,
      buyerName TEXT NOT NULL,
      buyerEmail TEXT,
      shippingName TEXT NOT NULL,
      shippingAddress1 TEXT NOT NULL,
      shippingAddress2 TEXT,
      shippingCity TEXT NOT NULL,
      shippingPostalCode TEXT NOT NULL,
      shippingProvince TEXT,
      shippingCountry TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_SHIPPED',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Order Items table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      title TEXT NOT NULL,
      sku TEXT,
      quantity INTEGER NOT NULL,
      unitPrice REAL,
      currency TEXT,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Indexes 
    CREATE INDEX IF NOT EXISTS idx_orders_orderNumber ON orders(orderNumber);
    CREATE INDEX IF NOT EXISTS idx_items_orderId ON order_items(orderId);
  `);

  return db;
}


// create an order + its items (if orderNumber already exist, throw)
export function createOrder(db, order) {
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      orderNumber, buyerName, buyerEmail,
      shippingName, shippingAddress1, shippingAddress2,
      shippingCity, shippingPostalCode, shippingProvince, shippingCountry,
      status
    ) VALUES (
      @orderNumber, @buyerName, @buyerEmail,
      @shippingName, @shippingAddress1, @shippingAddress2,
      @shippingCity, @shippingPostalCode, @shippingProvince, @shippingCountry,
      @status
    )
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (
      orderId, title, sku, quantity, unitPrice, currency
    ) VALUES (
      @orderId, @title, @sku, @quantity, @unitPrice, @currency
    )
  `);

  // transaction (everything or nothing)
  const tx = db.transaction((o) => {
    const info = insertOrder.run({
      ...o,
      status: o.status ?? "NOT_SHIPPED",
      buyerEmail: o.buyerEmail ?? null,
      shippingAddress2: o.shippingAddress2 ?? null,
      shippingProvince: o.shippingProvince ?? null,
    });

    const orderId = info.lastInsertRowid;

    for (const it of o.items) {
      insertItem.run({
        orderId,
        title: it.title,
        sku: it.sku ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? null,
        currency: it.currency ?? null,
      });
    }

    return orderId;
  });

  return tx(order);
}


// list of orders 
export function listOrders(db, { limit = 20, offset = 0 } = {}) {
  return db.prepare(`
    SELECT * FROM orders
    ORDER BY datetime(createdAt) DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}


// get an order with order items
export function getOrderById(db, id) {
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
  if (!order) return null;

  const items = db.prepare(`SELECT * FROM order_items WHERE orderId = ?`).all(id);
  return { ...order, items };
}


// update order status : true = updated ; false = order not found
export function updateOrderStatus(db, id, status) {
  const info = db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, id);
  return info.changes > 0;
}


// delete an order : true = deleted ; false = order not found
export function deleteOrder(db, id) {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM order_items WHERE orderId = ?`).run(id);
    const info = db.prepare(`DELETE FROM orders WHERE id = ?`).run(id);
    return info.changes > 0;
  });
  return tx();
}