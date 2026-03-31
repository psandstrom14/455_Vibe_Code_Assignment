# 455 Vibe Code Assignment — Student Shop App

A full-stack web app built with Next.js and SQLite that demonstrates an end-to-end ML deployment pipeline for late delivery prediction.

## Setup

### Requirements
- Node.js v18 or higher
- Python 3.x (for the inference script)

### Install dependencies
```bash
npm install
```

### Database
Make sure `shop.db` is in the root of the project. It should already be there.

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

- [ ] **Run Scoring** — Go to `/run-scoring`. Click "Run Scoring Now". Confirm it shows success and a count of orders scored. (Requires the Python team's `jobs/run_inference.py` to be complete.)

- [ ] **Warehouse Priority Queue** — Go to `/warehouse-priority-queue`. Confirm orders are ranked by late delivery probability with the highest risk orders at the top.

## Project Structure
```
app/                  # Next.js pages
  select-customer/    # Pick a customer to act as
  dashboard/          # Customer stats and recent orders
  place-order/        # Create a new order
  order-history/      # View past orders and line items
  warehouse-priority-queue/  # ML-powered late delivery queue
  run-scoring/        # Trigger the Python inference script
  debug/schema/       # Developer page showing DB schema
lib/
  db.ts               # SQLite database helpers
  customer-session.ts # Cookie-based customer selection
jobs/                 # Python ML pipeline scripts (Python team)
  run_inference.py    # Scores orders and writes to order_predictions
shop.db               # SQLite operational database
```

## How the ML Pipeline Works

1. The Python team trains a model that predicts late delivery risk
2. `jobs/run_inference.py` loads the trained model and scores all orders
3. Predictions are written to the `order_predictions` table in `shop.db`
4. The warehouse priority queue reads from `order_predictions` and ranks orders
5. The app never runs ML code — it just reads predictions like any other table