# 455 Vibe Code Assignment — Student Shop App

A full-stack web app built with Next.js and SQLite that demonstrates an end-to-end ML deployment pipeline for fraud prediction.

## Setup

### Requirements
- Node.js v18 or higher
- Python 3.x (for the inference script)

### Install dependencies
```bash
npm install
```

### Database
Make sure `shop.db` is in the **root of the project** (next to `package.json`). It should already be there. The Next.js app and the fraud training notebook both use this file.

### Run the app
```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Manual QA Checklist

Work through these steps in order to verify everything is working:

- [ ] **Select Customer** — Go to `/select-customer`, click "Act as Customer" on any customer. Confirm the banner at the top updates to show their name.

- [ ] **Customer Dashboard** — Go to `/dashboard`. Confirm it shows the selected customer's name, email, total orders, total spend, and 5 most recent orders.

- [ ] **Place Order** — Go to `/place-order`. Set a quantity > 0 on at least one product and click Submit Order. Confirm you are redirected to Order History with a green success message.

- [ ] **View Orders** — Go to `/order-history`. Confirm your new order appears at the top. Click on it and confirm the line items expand correctly.

- [ ] **Run Fraud Scoring** — Go to `/run-scoring`. Click "Run Fraud Scoring Now". Confirm it shows success and a count of orders scored. (Requires `ml/inference_server.py` to be running.)

- [ ] **Fraud Review Queue** — Go to `/warehouse-priority-queue`. Confirm fraud-predicted orders are listed first and each row shows predicted vs actual fraud labels.

## Fraud pipeline (IS 455 / Chapter 17)

Python-side artifacts live in **`ml/`**:

- `ml/fraud_pipeline_shop.ipynb` — train the fraud model; outputs `ml/model_artifacts_fraud/fraud_pipeline.sav`
- `ml/inference_server.py` — FastAPI service the app can call (TypeScript does not load `.sav` directly)
- `ml/TEAMMATE_INTEGRATION.md` — API contract and integration notes for the web tier

From `ml/`: `pip install -r requirements-inference.txt` then run uvicorn as documented in `TEAMMATE_INTEGRATION.md`.

## Project Structure
```
app/                  # Next.js pages
  select-customer/    # Pick a customer to act as
  dashboard/          # Customer stats and recent orders
  place-order/        # Create a new order
  order-history/      # View past orders and line items
  warehouse-priority-queue/  # ML-powered fraud review queue
  run-scoring/        # Run batch fraud scoring via Python API
  debug/schema/       # Developer page showing DB schema
lib/
  db.ts               # SQLite database helpers
  customer-session.ts # Cookie-based customer selection
ml/                   # Fraud model: notebook, .sav artifacts, FastAPI inference server
  model_artifacts_fraud/
shop.db               # SQLite operational database (project root)
```

## How the ML Pipeline Works

1. The Python team trains a fraud model in `ml/fraud_pipeline_shop.ipynb`
2. `ml/inference_server.py` loads the model artifact and exposes `POST /predict`
3. The app scores all orders and writes binary predictions to `orders.predicted_is_fraud`
4. The Fraud Review Queue reads from `orders` and prioritizes predicted-fraud rows
5. `orders.is_fraud` remains the historical truth label for retraining