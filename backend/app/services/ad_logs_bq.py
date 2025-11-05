"""
StackBlitz用の“疑似BQ層”。
- 実データストアはプロセス内メモリ(dict)。
- content_json / attachments を**加工せずそのまま保存・返却**することで、
  BlockNoteのinitialContent⇔保存フォーマットの差分が無い前提を担保。
- 既存のフロントと揃えるため、フィールド名は本番に寄せている。
"""
import uuid
import datetime as dt
from typing import Any, Dict, List, Optional

# ─────────────────────────────
# In-memory storage
# ─────────────────────────────
_DB: Dict[str, Dict[str, Any]] = {}

def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()

def _seed_once():
    if _DB:
        return
    # 問題再現用：テーブルを含む最小ブロック（公式仕様準拠）
    sample_blocks = [
        {
            "id": "h1",
            "type": "heading",
            "props": {"level": 2, "textAlignment": "left"},
            "content": [{"type": "text", "text": "Test Table", "styles": {}}],
            "children": [],
        },
        {
            "id": "tbl1",
            "type": "table",
            "props": {},
            "content": {
                "type": "tableContent",
                "columnWidths": [160, 160],
                "headerRows": 0,
                "rows": [
                    {
                        "cells": [
                            {
                                "type": "tableCell",
                                "props": {},
                                "content": [{"type": "text", "text": "", "styles": {}}],  # 空も許容
                            },
                            {
                                "type": "tableCell",
                                "props": {},
                                "content": [{"type": "text", "text": "", "styles": {}}],
                            },
                        ]
                    }
                ],
            },
            "children": [],
        },
    ]
    # “sections配列”版（本番寄せ）
    seed_sections = [
        {
            "date": "2025-09-01",
            "title": "初期セクション",
            "blocks": sample_blocks,
            "text": "",
            "attachments": [],
        }
    ]
    _id = str(uuid.uuid4())
    _DB[_id] = {
        "log_id": _id,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "author_email": "seed@example.com",
        "author_name": "Seed",
        "status": "draft",
        "pinned": False,
        "is_deleted": False,
        "report_id": None,
        "month_date": "2025-09-01",
        "client_name": "ReproClient",
        "campaign_id": "ReproCampaign",
        "ad_group_id": None,
        "title": "Seed Log",
        "tags": [],
        # ここを入れ替えながらテスト可能：
        # 1) sections配列
        "content_json": seed_sections,
        # 2) レガシー（blocks配列のみ）のときは ↑ を blocks に差し替えて検証できる
        "content_text": "",
        "layout_json": None,
        "content_format": "blocknote@0.23",
        "content_schema_version": 1,
        "content_html": "",
        "content_markdown": "",
        "attachments": [],
    }

_seed_once()

# ─────────────────────────────
# Public API (本番インターフェースを模倣)
# ─────────────────────────────
def list_logs(filters: Dict[str, Any], limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    items = list(_DB.values())
    # 超ゆるいフィルタ（最低限）
    def ok(row: Dict[str, Any]) -> bool:
        if filters.get("client_name") and row.get("client_name") != filters["client_name"]:
            return False
        if filters.get("campaign_id") and row.get("campaign_id") != filters["campaign_id"]:
            return False
        if filters.get("ad_group_id") and row.get("ad_group_id") != filters["ad_group_id"]:
            return False
        if filters.get("status") and row.get("status") != filters["status"]:
            return False
        if filters.get("month_date") and row.get("month_date") != filters["month_date"]:
            return False
        if filters.get("q") and filters["q"] not in (row.get("content_text") or ""):
            return False
        return True

    items = [dict(r) for r in items if ok(r)]
    items.sort(key=lambda r: (not r.get("pinned", False), r.get("updated_at", "")), reverse=True)
    return items[offset: offset + limit]

def create_log(payload: Dict[str, Any], author_email: str, author_name: str) -> str:
    log_id = str(uuid.uuid4())
    now = _now_iso()

    # content_json は**そのまま**保存（差分解析ロジックを入れない）
    row = {
        "log_id": log_id,
        "created_at": now,
        "updated_at": now,
        "author_email": author_email,
        "author_name": author_name,
        "status": payload.get("status", "draft"),
        "pinned": bool(payload.get("pinned", False)),
        "is_deleted": bool(payload.get("is_deleted", False)),
        "report_id": payload.get("report_id"),
        "month_date": payload.get("month_date"),
        "client_name": payload.get("client_name"),
        "campaign_id": payload.get("campaign_id"),
        "ad_group_id": payload.get("ad_group_id"),
        "title": payload.get("title"),
        "tags": payload.get("tags") or [],
        "content_json": payload.get("content_json"),
        "content_text": payload.get("content_text") or "",
        "layout_json": payload.get("layout_json"),
        "content_format": "blocknote@0.23",
        "content_schema_version": 1,
        "content_html": payload.get("content_html") or "",
        "content_markdown": payload.get("content_markdown") or "",
        "attachments": payload.get("attachments") or [],
    }
    _DB[log_id] = row
    return log_id

def get_log(log_id: str) -> Optional[Dict[str, Any]]:
    r = _DB.get(log_id)
    return dict(r) if r else None

def update_log(log_id: str, payload: Dict[str, Any], author_email: str, author_name: str) -> None:
    row = _DB.get(log_id)
    if not row:
        raise RuntimeError("log not found")
    # 差分のみ更新。content_json は**そのまま**上書き
    row.update({
        "updated_at": _now_iso(),
        "author_email": author_email or row.get("author_email"),
        "author_name": author_name or row.get("author_name"),
    })
    for k in [
        "status","pinned","is_deleted","report_id","month_date",
        "client_name","campaign_id","ad_group_id","title","tags",
        "content_json","content_text","layout_json",
        "content_html","content_markdown","attachments",
    ]:
        if k in payload:
            row[k] = payload[k]
