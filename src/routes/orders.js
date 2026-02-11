
/***** REST endpoints for orders *****/

import express from "express";
import { CreateOrderSchema, PaginationSchema, UpdateStatusSchema } from "../validators.js";
import { createOrder, listOrders, getOrderById, updateOrderStatus, deleteOrder } from "../db.js";

export function ordersRouter(db) {
  const router = express.Router();

  // GET /orders?limit=20&offset=0
  router.get("/", (req, res) => {
    const parsed = PaginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { limit = 20, offset = 0 } = parsed.data;
    const orders = listOrders(db, { limit, offset });

    res.json({ data: orders, limit, offset });
  });

  // GET /orders/:id
  router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const order = getOrderById(db, id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({ data: order });
  });

  // POST /orders
  router.post("/", (req, res) => {
    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const id = createOrder(db, parsed.data);
      res.status(201).json({ data: { id } });
    } catch (e) {
      // unique constraint on orderNumber -> return 409 Conflict
      const msg = (e?.message ?? "").toString();
      if (msg.toLowerCase().includes("unique")) {
        return res.status(409).json({ error: "orderNumber already exists" });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // PATCH /orders/:id/status
  router.patch("/:id/status", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const parsed = UpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const ok = updateOrderStatus(db, id, parsed.data.status);
    if (!ok) return res.status(404).json({ error: "Order not found" });

    res.json({ data: { id, status: parsed.data.status } });
  });

  // DELETE /orders/:id
  router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const ok = deleteOrder(db, id);
    if (!ok) return res.status(404).json({ error: "Order not found" });

    // 204 No Content -> successfully deleted
    res.status(204).send();
  });

  return router;
}