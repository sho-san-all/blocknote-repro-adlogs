"""
表示用ユーティリティ（必要なら使う）。StackBlitz最小再現では未使用でもOK。
"""
from typing import Any, List

BNDoc = List[dict]

def _esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def to_plain_text(blocks: BNDoc) -> str:
    parts: List[str] = []
    def walk(n: Any):
        if isinstance(n, dict):
            if "text" in n and isinstance(n["text"], str):
                parts.append(n["text"])
            for k in ("content", "children"):
                v = n.get(k)
                if isinstance(v, list):
                    for ch in v: walk(ch)
        elif isinstance(n, list):
            for ch in n: walk(ch)
    walk(blocks or [])
    return " ".join(" ".join(parts).split())

def to_markdown(blocks: BNDoc) -> str:
    # 超簡易版
    lines: List[str] = []
    for b in blocks or []:
        t = b.get("type")
        if t == "heading":
            lvl = int(b.get("props", {}).get("level", 2))
            txt = to_plain_text(b.get("content", [])) or ""
            lines.append("#" * max(1, min(6, lvl)) + " " + txt)
        elif t == "paragraph":
            lines.append(to_plain_text(b.get("content", [])))
        elif t == "table":
            lines.append("[[TABLE]]")
        else:
            lines.append(to_plain_text(b.get("content", [])))
    return "\n\n".join([ln for ln in lines if ln.strip()])

def to_html(blocks: BNDoc) -> str:
    # 超簡易版
    html: List[str] = []
    for b in blocks or []:
        t = b.get("type")
        if t == "heading":
            lvl = int(b.get("props", {}).get("level", 2))
            txt = _esc(to_plain_text(b.get("content", [])))
            html.append(f"<h{lvl}>{txt}</h{lvl}>")
        elif t == "paragraph":
            html.append(f"<p>{_esc(to_plain_text(b.get('content', [])))}</p>")
        elif t == "table":
            html.append("<table><tr><td>[[TABLE PREVIEW OMITTED]]</td></tr></table>")
        else:
            html.append(f"<p>{_esc(to_plain_text(b.get('content', [])))}</p>")
    return "\n".join(html)
