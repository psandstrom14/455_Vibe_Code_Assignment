# Fraud model handoff — integration guide (IS 455, Chapter 17)

Use this document with your AI assistant when wiring the hosted TypeScript app to the ML pipeline. It explains what the data science side produces, how it maps to “deploying ML pipelines,” and the **minimal contract** between the web tier and the model.

---

## 1. Does this match Chapter 17?

**Yes.** A typical Chapter 17 deployment story includes:

| Theme | What we did |
|--------|-------------|
| **Operational data → analysis table (ETL)** | SQLite `shop.db` → joined orders / customers / line items; engineered `order_hour`, `order_dow`, `zip_mismatch`. |
| **Train & evaluate** | Stratified split; models compared; tuned logistic regression; metrics for imbalance (PR-AUC, ROC-AUC, precision/recall). |
| **Artifacts for production** | Serialized **`fraud_pipeline.sav`** (full sklearn `Pipeline`: preprocessing + classifier) and **`fraud_metadata.json`** (column names, types, metrics). |
| **Inference** | New orders are featurized the same way as training (same columns); `predict_proba` → probability of fraud; threshold (default **0.5**) → fraud / not fraud. |
| **Refresh cycle** | Nightly (or on a schedule): refresh or replace `shop.db`, re-run training, write a new `.sav`, deploy/reload. |

**Not included here (web teammate owns this):** UI, auth, hosting, database for the live site, and **calling** the model from TypeScript.

---

## 2. Why a `.sav` file and not “model in TypeScript”?

The file **`ml/model_artifacts_fraud/fraud_pipeline.sav`** is a **joblib-serialized** sklearn `Pipeline`. It is **not** a standalone numeric weight file; it includes fitted encoders (e.g. one-hot categories). **Node/TypeScript cannot load this format natively.**

**Recommended architecture:**

1. **Python inference service** (included: `inference_server.py`) loads `fraud_pipeline.sav` and exposes HTTP endpoints.
2. **TypeScript app** sends JSON (one row of features) to `POST /predict` and displays the JSON response.

Alternatives (only if course allows extra scope): convert to ONNX and run in JS (heavy, easy to get wrong), or reimplement preprocessing in TS (fragile). **Default path: small Python sidecar.**

---

## 3. Files in this repo (under `ml/`)

| File / folder | Role |
|---------------|------|
| `ml/model_artifacts_fraud/fraud_pipeline.sav` | Trained pipeline (required). |
| `ml/model_artifacts_fraud/fraud_metadata.json` | Column list, numeric vs categorical, test metrics; use for form validation and docs. |
| `ml/inference_server.py` | FastAPI app: `GET /health`, `GET /schema`, `POST /predict`. |
| `ml/requirements-inference.txt` | `pip install -r requirements-inference.txt` for the inference environment. |
| `ml/fraud_pipeline_shop.ipynb` | Source of truth for training (regenerate `.sav` after DB refresh). |
| `shop.db` (repo root, next to `package.json`) | SQLite DB shared with Next.js; training reads from here. |

**Python version:** Train and serve with compatible Python (e.g. 3.11+) and **matching `scikit-learn` major/minor** when possible to avoid load errors.

---

## 4. Regenerating `fraud_pipeline.sav` (nightly or on schedule)

1. **Refresh data:** Replace or update `shop.db` at the **project root** (or adjust paths in the notebook).
2. **Train:** Run all cells in `ml/fraud_pipeline_shop.ipynb` with Jupyter cwd set to **`ml/`** (or repo root; the notebook resolves `shop.db` at project root).
3. **Outputs:** Notebook writes `ml/model_artifacts_fraud/fraud_pipeline.sav` and `fraud_metadata.json`.
4. **Deploy:** Copy the new `.sav` (and updated `fraud_metadata.json` if columns change) to the server and **restart** the inference process so `joblib.load` runs again.

**Windows Task Scheduler / Linux cron:** Run a script that (1) refreshes `shop.db`, (2) executes the notebook (e.g. `python -m nbconvert --execute fraud_pipeline_shop.ipynb` with `nbconvert` installed), (3) restarts the inference service. Exact commands depend on your host.

---

## 5. HTTP API contract (for the TypeScript app)

**Base URL:** e.g. `http://127.0.0.1:8787` (configure reverse proxy in production).

### `GET /health`

Returns `{ "ok": true, "model": "<path>", "columns_loaded": N }`.

### `GET /schema`

Returns `{ "inference_columns": [ "..."] }` — use this to build the form or validate payloads.

### `POST /predict`

**Request body:**

```json
{
  "features": {
    "billing_zip": "28289",
    "shipping_zip": "28289",
    "shipping_state": "CO",
    "payment_method": "card",
    "device_type": "mobile",
    "ip_country": "US",
    "promo_used": 0,
    "promo_code": null,
    "order_subtotal": 662.95,
    "shipping_fee": 15.44,
    "tax_amount": 12.0,
    "order_total": 690.0,
    "gender": "Female",
    "city": "Clayton",
    "customer_state": "CO",
    "customer_zip": "28289",
    "customer_segment": "standard",
    "loyalty_tier": "silver",
    "customer_is_active": 1,
    "num_items": 9,
    "line_count": 5,
    "order_hour": 0,
    "order_dow": 5,
    "zip_mismatch": 0
  }
}
```

**Rules:**

- Every key in `fraud_metadata.json` → `inference_columns` must be present.
- Types: numbers as JSON numbers; strings for categorical fields; use `null` for missing promo code if applicable (match pandas/sklearn expectations—your forms should send consistent types).
- **`risk_score` is not a feature** (intentionally excluded from training—do not send it as a shortcut).

**Response:**

```json
{
  "fraud_probability": 0.1128,
  "is_fraud": 0,
  "threshold": 0.5,
  "label": "not_fraud"
}
```

- `is_fraud`: `1` = fraud, `0` = not fraud at the configured threshold.
- `fraud_probability`: P(fraud), class **1** in sklearn.

**Environment variables (optional):**

| Variable | Meaning |
|----------|---------|
| `FRAUD_MODEL_PATH` | Absolute path to `fraud_pipeline.sav`. |
| `FRAUD_METADATA_PATH` | Path to `fraud_metadata.json`. |
| `FRAUD_THRESHOLD` | Default `0.5`; raise to reduce false positives (fewer “fraud” flags). |

**Run locally** (from the `ml/` directory):

```text
cd ml
set FRAUD_MODEL_PATH=model_artifacts_fraud\fraud_pipeline.sav
python -m uvicorn inference_server:app --host 127.0.0.1 --port 8787
```

---

## 6. TypeScript integration checklist

1. **Config:** Point `fetch`/`axios` to the inference service URL (env var e.g. `FRAUD_API_URL`).
2. **Form:** Collect exactly the fields from `GET /schema` (or hardcode from `fraud_metadata.json` if static).
3. **Request:** `POST /predict` with `{ "features": { ... } }`.
4. **Display:** Show `label`, `fraud_probability`, and optionally explain that the model is imperfect (see metrics in JSON).
5. **CORS:** If the browser talks directly to the Python API, enable CORS on FastAPI (`CORSMiddleware`) for your site origin; or proxy `/api/fraud` through the same host as the TS app (preferred in production).

---

## 7. Prompt snippet for your AI assistant

Copy-paste:

> We have a sklearn fraud model saved as `fraud_pipeline.sav` plus `fraud_metadata.json`. TypeScript cannot load the file. Use the provided `inference_server.py` (FastAPI) or an equivalent Python service that loads the `.sav` with `joblib.load` and exposes `POST /predict` accepting a JSON object whose keys match `inference_columns`. Wire our Next/Express/React app to call that API, map form fields to those keys, and display `fraud_probability` and `label`. After nightly retraining, we deploy a new `.sav` and restart the Python service.

---

## 8. Training metrics (sanity check)

See `fraud_metadata.json` → `test_metrics`. Fraud is **imbalanced**; accuracy alone is misleading—PR-AUC and precision/recall matter for “catch fraud vs. annoy customers.”

If something fails on load, first check **Python and scikit-learn versions** against the training environment.
