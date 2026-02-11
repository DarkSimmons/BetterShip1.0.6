# BetterShip 

- **AI Order Assistant**
- **REST APIs** (Node.js + Express)
- **SQLite** persistence
- **Generative AI** using **Ollama locally** 

Betterhip is an AI agentic assistant to simplify the management of shipping updates and requests.
I used REST APIs and Ollama to automatically update the customer and answering simple question about the shipping.
I've given some guardrails (but sometimes is allucinating).

### Orders REST API
- Create, list, read, update status, delete orders
- SQLite schema: `orders` and `order_items`

### AI endpoints (Ollama local)
- Generate **order summary** 
- Generate **customer email** 
- Generate **support replies** using order context (DB -> prompt)

## Stack
- Node.js, Express
- SQLite (better-sqlite3)
- Ollama local API 
- Swagger UI / OpenAPI

## Setup

### 1) Install Ollama and pull a model
Install Ollama, then:

```bash
ollama pull llama3
npm install
cp .env.example .env
npm run dev
```


- Ollama runs at : http://localhost:11434
- Swagger UI : http://localhost:3000/docs
- Health check : http://localhost:3000/health


## Testing

- curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber":"EBAY-10001",
    "buyerName":"Mario Rossi",
    "buyerEmail":"mario@example.com",
    "shippingName":"Mario Rossi",
    "shippingAddress1":"Via Roma 1",
    "shippingCity":"Bologna",
    "shippingPostalCode":"40100",
    "shippingProvince":"BO",
    "shippingCountry":"IT",
    "items":[{"title":"Cavo USB-C","sku":"USB-C-001","quantity":2,"unitPrice":9.99,"currency":"EUR"}]
  }'

- curl -X POST http://localhost:3000/ai/orders/1/summary

- curl -X POST http://localhost:3000/ai/orders/1/email \
  -H "Content-Type: application/json" \
  -d '{"stage":"shipped"}'

- curl -X POST http://localhost:3000/ai/support/chat \
  -H "Content-Type: application/json" \
  -d '{"orderId":1,"message":"Mi dai un aggiornamento sulla spedizione?","language":"it","tone":"professional"}'






