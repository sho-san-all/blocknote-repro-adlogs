from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from ..services import ad_logs_bq as svc

router = APIRouter(tags=["ad-logs"])

# ─────────────────────────────
# Pydantic Models
# ─────────────────────────────
class Attachment(BaseModel):
    kind: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None

class LogPayload(BaseModel):
    # 任意フィールド（部分更新前提）
    title: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern=r"^(draft|published|archived)$")
    pinned: Optional[bool] = None
    is_deleted: Optional[bool] = None
    report_id: Optional[str] = None
    month_date: Optional[str] = None  # YYYY-MM-DD 推奨
    client_name: Optional[str] = None
    campaign_id: Optional[str] = None
    ad_group_id: Optional[str] = None

    tags: Optional[List[str]] = None
    content_json: Optional[Any] = None
    content_text: Optional[str] = None
    attachments: Optional[List[Attachment]] = None
    layout_json: Optional[Dict[str, Any]] = None

# ダミーのユーザー（本番はIAP/IDトークンに置換）
def _current_user():
    return {"email": "repro@example.com", "name": "Repro User"}

# ─────────────────────────────
# Routes
# ─────────────────────────────
@router.get("/ad-logs")
def list_logs(
    client_name: Optional[str] = None,
    campaign_id: Optional[str] = None,
    ad_group_id: Optional[str] = None,
    status: Optional[str] = Query(None, pattern=r"^(draft|published|archived)$"),
    month_date: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    items = svc.list_logs(
        {
            "client_name": client_name,
            "campaign_id": campaign_id,
            "ad_group_id": ad_group_id,
            "status": status,
            "month_date": month_date,
            "q": q,
        },
        limit=limit,
        offset=offset,
    )
    return {"items": items, "limit": limit, "offset": offset}

@router.post("/ad-logs")
def create_log(body: LogPayload):
    try:
        u = _current_user()
        payload = body.model_dump(exclude_unset=True)
        log_id = svc.create_log(payload, u["email"], u["name"])
        return {"log_id": log_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ad-logs/{log_id}")
def get_log(log_id: str):
    row = svc.get_log(log_id)
    if not row:
        raise HTTPException(status_code=404, detail="not found")
    return row

@router.put("/ad-logs/{log_id}")
def update_log(log_id: str, body: LogPayload):
    try:
        u = _current_user()
        payload = body.model_dump(exclude_unset=True)
        svc.update_log(log_id, payload, u["email"], u["name"])
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
