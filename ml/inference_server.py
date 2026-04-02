"""
Minimal HTTP API for the fraud sklearn pipeline (.sav).

TypeScript cannot load joblib/sklearn models natively. Run this service on the
same host or network as the web app; the frontend calls POST /predict.

Usage:
  set FRAUD_MODEL_PATH=model_artifacts_fraud\\fraud_pipeline.sav
  uvicorn inference_server:app --host 127.0.0.1 --port 8787
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL = ROOT / "model_artifacts_fraud" / "fraud_pipeline.sav"
DEFAULT_META = ROOT / "model_artifacts_fraud" / "fraud_metadata.json"

MODEL_PATH = Path(os.environ.get("FRAUD_MODEL_PATH", str(DEFAULT_MODEL)))
META_PATH = Path(os.environ.get("FRAUD_METADATA_PATH", str(DEFAULT_META)))

app = FastAPI(title="Fraud inference", version="1.0")

_model = None
_inference_columns: list[str] = []
_threshold = float(os.environ.get("FRAUD_THRESHOLD", "0.5"))


def _load_artifacts() -> None:
    global _model, _inference_columns
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    _model = joblib.load(MODEL_PATH)
    if META_PATH.is_file():
        with open(META_PATH, encoding="utf-8") as f:
            meta = json.load(f)
        _inference_columns = list(meta.get("inference_columns", []))
    else:
        raise FileNotFoundError(f"Metadata not found: {META_PATH}")


@app.on_event("startup")
def startup() -> None:
    _load_artifacts()


class PredictBody(BaseModel):
    """One order row: keys must match fraud_metadata.json inference_columns."""

    features: dict[str, object] = Field(
        ...,
        description="Column name -> value (strings or numbers as in training).",
    )


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "model": str(MODEL_PATH),
        "columns_loaded": len(_inference_columns),
    }


@app.get("/schema")
def schema() -> dict:
    """Field names the UI should collect (order matches training)."""
    if not _inference_columns:
        raise HTTPException(503, "Model not loaded")
    return {"inference_columns": _inference_columns}


@app.post("/predict")
def predict(body: PredictBody) -> dict:
    if _model is None:
        raise HTTPException(503, "Model not loaded")
    missing = set(_inference_columns) - set(body.features)
    if missing:
        raise HTTPException(400, detail=f"Missing keys: {sorted(missing)}")
    frame = pd.DataFrame([body.features])[_inference_columns]
    p_fraud = float(_model.predict_proba(frame)[0, 1])
    is_fraud = int(p_fraud >= _threshold)
    return {
        "fraud_probability": p_fraud,
        "is_fraud": is_fraud,
        "threshold": _threshold,
        "label": "fraud" if is_fraud else "not_fraud",
    }
