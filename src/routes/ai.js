
/***** AI endpoints using Ollama (local) *****/

import express from "express";
import { ChatSchema } from "../validators.js";
import { getOrderById } from "../db.js";
import { generateText } from "../ollama.js";

// converting an order into text for prompting
function formatOrderForPrompt(order) {
  const lines = [];
  lines.push(`OrderNumber: ${order.orderNumber}`);
  lines.push(`Status: ${order.status}`);
  lines.push(`Buyer: ${order.buyerName}${order.buyerEmail ? ` <${order.buyerEmail}>` : ""}`);
  lines.push(`ShipTo: ${order.shippingName}`);
  lines.push(`Address: ${order.shippingAddress1} ${order.shippingAddress2 ?? ""}`.trim());
  lines.push(`City: ${order.shippingPostalCode} ${order.shippingCity} ${order.shippingProvince ?? ""}`.trim());
  lines.push(`Country: ${order.shippingCountry}`);
  lines.push("Items:");
  for (const it of order.items) {
    lines.push(
      `- ${it.title} | qty=${it.quantity}` +
      (it.sku ? ` | sku=${it.sku}` : "") +
      (it.unitPrice != null ? ` | unit=${it.unitPrice} ${it.currency ?? ""}` : "")
    );
  }
  return lines.join("\n");
}

export function aiRouter({ db, ollama, model }) {
  const router = express.Router();

    // POST /ai/orders/:id/summary -> generating the order summary
    router.post("/orders/:id/summary", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const order = getOrderById(db, id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Guardrails:
    // 1) be concise
    // 2) do not invent missing fields
    const system = "You are a concise assistant. Use only provided order data. Do not invent missing information.";

    const prompt = `
Summarize this e-commerce order in Italian language using 5-8 words
Include: items, quantities, destination city/country, and current shipping status

ORDER:
${formatOrderForPrompt(order)}
`.trim();

    try {
      const text = await generateText(ollama, { model, prompt, system, temperature: 0.2 });
      res.json({ data: { orderId: id, summary: text } });
    } catch {
      res.status(502).json({ error: "LLM request failed (Ollama unreachable or model not installed)" });
    }
  });

    // POST /ai/orders/:id/email -> generating a short email for a given stage
    router.post("/orders/:id/email", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const order = getOrderById(db, id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // stage for controlling the template style (received/shipped/delayed)
    const { stage = "shipped" } = req.body ?? {};
    const stageSafe = ["received", "shipped", "delayed"].includes(stage) ? stage : "shipped";

    const system =
      "You are a professional e-commerce customer support agent, " +
      "use only provided data and never invent tracking numbers or delivery dates";

    const prompt = `
    Write an email in Italian to the customer describing their order
    Stage: ${stageSafe}

Rules:
1) max 120 words
2) formal tone
3) if tracking number is missing, say it will be shared when available
4) include the order number

ORDER:
${formatOrderForPrompt(order)}
`.trim();

    try {
      const text = await generateText(ollama, { model, prompt, system, temperature: 0.3 });
      res.json({
        data: {
          orderId: id,
          subject: `Aggiornamento ordine ${order.orderNumber}`,
          email: text,
        },
      });
    } catch {
      res.status(502).json({ error: "Ollama request failed" });
    }
  });

  
  // POST /ai/support/chat -> support chat endpoint using the order context
  router.post("/support/chat", async (req, res) => {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { orderId, message, language, tone } = parsed.data;

    const order = getOrderById(db, orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const sysLang = language === "en" ? "English" : "Italian";
    const sysTone = tone; 

    const system = `
        You are a customer support assistant for an e-commerce seller
        Language: ${sysLang}
        Tone: ${sysTone}

Constraints:
1) use ONLY the order data provided
2) if the customer asks something not present, say you don't have that information
3) suggest next steps 
4) NEVER invent tracking numbers and delivery dates
`.trim();

    const prompt = `
Customer message:
${message}

Order data:
${formatOrderForPrompt(order)}

Reply as customer support:
`.trim();

    try {
      const text = await generateText(ollama, { model, prompt, system, temperature: 0.4 });
      res.json({ data: { orderId, reply: text } });
    } catch {
      res.status(502).json({ error: "Ollama request failed" });
    }
  });

  return router;
}