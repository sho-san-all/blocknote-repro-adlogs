import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import ad_logs

# ─────────────────────────────
# FastAPI
# ─────────────────────────────
app = FastAPI(title="AdLogs Repro Backend", version="0.1.0")

# StackBlitz で楽に検証するため CORS は緩めに
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 検証用途
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /api 配下にルーターを生やす
app.include_router(ad_logs.router, prefix="/api")

# ─────────────────────────────
# Healthcheck
# ─────────────────────────────
@app.get("/healthz")
def healthz():
    return {"ok": True}

# 参考: ローカル起動（StackBlitz では不要）
# uvicorn app.main:app --reload --port 8080
