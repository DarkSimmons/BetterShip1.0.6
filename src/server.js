
/***** Main application; using REST API, SQLite, Ollama *****/

import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import { initDb } from "./db.js";
import { createOllamaClient } from "./ollama.js";
import { ordersRouter } from "./routes/orders.js";
import { aiRouter } from "./routes/ai.js";

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || "./data.sqlite";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

const app = express();

// parse JSON request bodies
app.use(express.json({ limit: "1mb" }));

// requests logging 
app.use(morgan("dev"));

// rate limiter for endpoints 
app.use(
  rateLimit({
    windowMs: 60_000, // 1 minute
    max: 120,         // requests per window
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// initializing 
const db = initDb(DB_PATH);
const ollama = createOllamaClient({ baseURL: OLLAMA_BASE_URL });

// swagger/OpenAPI 
const openapi = YAML.load("./openapi.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

// health checks 
app.get("/health", async (req, res) => {
  try {
    const r = await ollama.get("/api/tags");
    const models = (r.data?.models ?? []).map((m) => m.name);
    res.json({ ok: true, db: "ok", ollama: "ok", model: OLLAMA_MODEL, modelsInstalled: models });
  } catch {

    // if Ollama is not running -> return ok:true for the API
    // but report that Ollama is unreachable
    res.json({ ok: true, db: "ok", ollama: "unreachable", model: OLLAMA_MODEL });
  }
});

// REST routes
app.use("/orders", ordersRouter(db));
app.use("/ai", aiRouter({ db, ollama, model: OLLAMA_MODEL }));

// fallback if endpoint is unknown
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(` Server: running on http://localhost:${PORT}`);
  console.log(` Swagger:      http://localhost:${PORT}/docs`);
  console.log(` Ollama:          ${OLLAMA_BASE_URL} (model: ${OLLAMA_MODEL})`);
});