"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "./Editor";

/** =========================================================
 * 環境切替：バックエンド呼び出し or localStorage モック
 * ======================================================= */
const USE_BACKEND =
  (typeof window !== "undefined" &&
    (new URLSearchParams(location.search).get("api") === "1" ||
     localStorage.getItem("adlog-repro:use-backend") === "1")) || false;

// 例: Cloud Run のベースURL を指定（末尾に /api は付けない）
const API_BASE =
  (typeof window !== "undefined" &&
    (localStorage.getItem("adlog-repro:api_base") ||
     new URLSearchParams(location.search).get("apiBase"))) ||
  "https://your-cloudrun-url-xxxx.a.run.app";

/** =========================================================
 * 型
 * ======================================================= */
type Block = any;

type Section = {
  id: string;
  date: string;
  title: string;
  blocks: Block[];
  text: string;
  attachments: any[];
};

type LogRow = {
  log_id: string;
  title?: string | null;
  status?: string | null;
  pinned?: boolean | null;
  is_deleted?: boolean | null;
  report_id?: string | null;
  month_date?: string | null;
  client_name?: string | null;
  campaign_id?: string | null;
  ad_group_id?: string | null;
  tags?: any[];
  content_json?: any;
  content_text?: string | null;
  attachments?: any[];
  layout_json?: any;
};

/** =========================================================
 * デバッグ
 * ======================================================= */
const DEBUG = true;
const dbg = {
  group(label: string) { if (DEBUG) try { console.group(label); } catch {} },
  groupEnd() { if (DEBUG) try { console.groupEnd(); } catch {} },
  log: (...a: any[]) => DEBUG && console.log(...a),
  warn: (...a: any[]) => DEBUG && console.warn(...a),
  error: (...a: any[]) => DEBUG && console.error(...a),
};
const safeJSON = (v: any, pick?: number) => {
  try {
    const s = JSON.stringify(v, null, 2);
    if (pick && s.length > pick) return s.slice(0, pick) + " …(truncated)";
    return s;
  } catch { return String(v); }
};

/** =========================================================
 * モック実装（localStorage）
 * ======================================================= */
const LS_KEY_PREFIX = "adlog-repro:";
const defaultDoc: any[] = [
  {
    id: "h1",
    type: "heading",
    props: { level: 2, textAlignment: "left" },
    content: [{ type: "text", text: "Test Table", styles: {} }],
    children: [],
  },
  {
    id: "tbl1",
    type: "table",
    props: {},
    content: {
      type: "tableContent",
      columnWidths: [160, 160],
      headerRows: 0,
      rows: [
        {
          cells: [
            { type: "tableCell", props: {}, content: [{ type: "text", text: "A1", styles: {} }] },
            { type: "tableCell", props: {}, content: [] }, // ← 空セルも許容
          ],
        },
      ],
    },
    children: [],
  },
];

const sampleRow: LogRow = {
  log_id: "demo-1",
  title: "サンプル改善ログ",
  status: "draft",
  pinned: false,
  is_deleted: false,
  report_id: null,
  month_date: "2025-09-01",
  client_name: "SAMPLE",
  campaign_id: "CAMP-001",
  ad_group_id: null,
  tags: [],
  content_json: defaultDoc,
  content_text: "",
  attachments: [],
  layout_json: null,
};

async function mockGetLog(log_id: string): Promise<LogRow> {
  const raw = localStorage.getItem(LS_KEY_PREFIX + log_id);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  localStorage.setItem(LS_KEY_PREFIX + log_id, JSON.stringify(sampleRow));
  return sampleRow;
}
async function mockUpdateLog(log_id: string, payload: Partial<LogRow>): Promise<void> {
  const now = await mockGetLog(log_id);
  const next = { ...now, ...payload };
  localStorage.setItem(LS_KEY_PREFIX + log_id, JSON.stringify(next));
}

/** =========================================================
 * API 呼び出し（バックエンド）
 *  - GET /api/ad-logs/{log_id}
 *  - PATCH /api/ad-logs/{log_id}
 * ======================================================= */
async function apiGetLog(log_id: string): Promise<LogRow> {
  const r = await fetch(`${API_BASE}/api/ad-logs/${encodeURIComponent(log_id)}`, {
    method: "GET",
    credentials: "include",
  });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  return r.json();
}

async function apiUpdateLog(log_id: string, payload: Partial<LogRow>): Promise<void> {
  const r = await fetch(`${API_BASE}/api/ad-logs/${encodeURIComponent(log_id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`PATCH ${r.status}`);
}

/** =========================================================
 * 共有ユーティリティ
 * ======================================================= */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function blankParagraph(): Block {
  return { type: "paragraph", props: { textAlignment: "left" }, content: [], children: [] };
}

function isFiniteNumber(v: any): boolean {
  const n = Number(v);
  return Number.isFinite(n);
}

/** =========================================================
 * 正規化（本番寄り・強化版）
 *  - table は BlockNote 公式形状に矯正
 *  - props の NaN を除去
 *  - content 未定義を安全化
 * ======================================================= */
function normalizeInlineArray(inlines: any): any[] {
  if (inlines == null) return [];
  if (Array.isArray(inlines)) return inlines;
  // 不正ならテキスト化
  if (typeof inlines === "string") return [{ type: "text", text: inlines, styles: {} }];
  if (typeof inlines === "object" && inlines.type === "text") return [inlines];
  return [];
}

function normalizeTableCell(cell: any): any {
  const c = { ...(cell || {}) };
  c.type = "tableCell";
  c.props = { ...(c.props || {}) };
  // NaN 排除
  if (!isFiniteNumber(c.props.colspan)) delete c.props.colspan;
  if (!isFiniteNumber(c.props.rowspan)) delete c.props.rowspan;
  c.content = normalizeInlineArray(c.content);
  return c;
}

function normalizeTableContent(content: any): any {
  // すでに tableContent なら補正
  if (content && content.type === "tableContent") {
    const columnWidths = Array.isArray(content.columnWidths)
      ? content.columnWidths.map((w: any) => (isFiniteNumber(w) ? Number(w) : 160))
      : [];
    const headerRows = isFiniteNumber(content.headerRows) ? Number(content.headerRows) : 0;
    const rowsSrc = Array.isArray(content.rows) ? content.rows : [];

    const rows = rowsSrc.map((r: any) => {
      const cellsSrc = Array.isArray(r?.cells) ? r.cells : [];
      return { cells: cellsSrc.map(normalizeTableCell) };
    });
    return { type: "tableContent", columnWidths, headerRows, rows };
  }

  // 旧形状（row[].content=cell[] / row.cells 等）→ 変換
  if (Array.isArray(content)) {
    const rows = content.map((r: any) => {
      const cells = Array.isArray(r?.content) ? r.content : Array.isArray(r?.cells) ? r.cells : [];
      return { cells: (cells || []).map(normalizeTableCell) };
    });
    return { type: "tableContent", columnWidths: [], headerRows: 0, rows };
  }

  // 不正 → 空の tableContent
  return { type: "tableContent", columnWidths: [], headerRows: 0, rows: [] };
}

function normalizeBlock(b: any): Block {
  if (!b || typeof b !== "object") return blankParagraph();
  const out: any = { ...b };
  out.type = out.type || out.name || "paragraph";
  out.props = { ...(out.props || {}) };

  // props の NaN は捨てる
  for (const [k, v] of Object.entries(out.props)) {
    if (typeof v === "number" && Number.isNaN(v)) delete out.props[k];
  }

  if (out.type === "heading") {
    const lvl = Number(out.props.level);
    out.props.level = Number.isFinite(lvl) && lvl >= 1 && lvl <= 6 ? lvl : 2;
    if (out.props.textAlignment == null) out.props.textAlignment = "left";
  } else if (out.type === "paragraph") {
    if (out.props.textAlignment == null) out.props.textAlignment = "left";
    out.content = normalizeInlineArray(out.content);
  } else if (out.type === "table") {
    out.content = normalizeTableContent(out.content);
  } else {
    // そのほかのブロック
    if (Array.isArray(out.content)) {
      // 既に Inline[] なら触らない
    } else if (out.content == null) {
      out.content = [];
    }
  }

  // children は配列に統一
  out.children = Array.isArray(out.children) ? out.children.map(normalizeBlock) : [];
  return out;
}

function normalizeBlocksDeep(blocks: Block[] | undefined | null): Block[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [blankParagraph()];
  return blocks.map(normalizeBlock);
}

/** =========================================================
 * セクション化（先頭見出し→タイトル／本文はそれ以降）
 * ======================================================= */
function extractFirstHeadingText(blocks: Block[]): string {
  const first = blocks?.[0];
  if (!(first && first.type === "heading")) return "";
  const content = Array.isArray(first.content) ? first.content : [];
  return content.map((c: any) => (c?.text ? String(c.text) : "")).join("").trim();
}
function dropFirstHeading(blocks: Block[]): Block[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [blankParagraph()];
  const first = blocks[0];
  if (first?.type !== "heading") return blocks;
  const rest = blocks.slice(1);
  return rest.length ? rest : [blankParagraph()];
}
function ensureNonEmpty(blocks: Block[] | undefined | null): Block[] {
  return normalizeBlocksDeep(blocks);
}

function normalizeToSections(row: any): Section[] {
  const cj = row?.content_json;
  const baseDate = row?.month_date || todayStr();

  // sections ではなく、Block[] で保存されている前提（あなたの本番寄せ）
  if (Array.isArray(cj)) {
    const norm = normalizeBlocksDeep(cj);
    const title = extractFirstHeadingText(norm);
    const body = dropFirstHeading(norm);
    return [{
      id: `legacy-${Math.random().toString(36).slice(2, 8)}`,
      date: baseDate,
      title: title || "",
      blocks: ensureNonEmpty(body),
      text: row?.content_text || "",
      attachments: Array.isArray(row?.attachments) ? row.attachments : [],
    }];
  }

  // {sections: ...} で返る後方互換
  if (cj && typeof cj === "object" && Array.isArray(cj.sections)) {
    return (cj.sections as any[]).map((s, idx) => ({
      id: `sec-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      date: s.date || baseDate,
      title: s.title || "",
      blocks: ensureNonEmpty(s.blocks),
      text: s.text || "",
      attachments: Array.isArray(s.attachments) ? s.attachments : [],
    }));
  }

  // 文字列 JSON なら parse を試す
  if (typeof cj === "string") {
    try {
      const obj = JSON.parse(cj);
      if (Array.isArray(obj)) return normalizeToSections({ ...row, content_json: obj });
      if (obj && Array.isArray(obj.sections)) return normalizeToSections({ ...row, content_json: obj });
    } catch (e) {
      dbg.warn("[normalizeToSections] content_json string parse failed");
    }
  }

  // デフォルト空
  return [{
    id: `new-${Math.random().toString(36).slice(2, 8)}`,
    date: baseDate,
    title: "",
    blocks: ensureNonEmpty([]),
    text: "",
    attachments: [],
  }];
}

/** =========================================================
 * 画面本体
 * ======================================================= */
export default function AdLogEditPageInner({ logId }: { logId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<LogRow | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const attachmentsRef = useRef<any[]>([]);

  // データ取得（API/モック 切替）
  useEffect(() => {
    (async () => {
      dbg.group(`[AdLogEditPageInner] load ${logId}`);
      try {
        setLoading(true);
        const r = USE_BACKEND ? await apiGetLog(logId) : await mockGetLog(logId);
        dbg.log("row:", r?.log_id, r?.client_name, r?.campaign_id, r?.month_date);
        setRow(r);
        const secs = normalizeToSections(r);
        setSections(secs);
      } catch (e: any) {
        dbg.error("load failed:", e?.message || e);
      } finally {
        setLoading(false);
        dbg.groupEnd();
      }
    })();
  }, [logId]);

  function updateSection(sectionId: string, updater: (prev: Section) => Section) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? updater(s) : s)));
  }

  async function onSave() {
    if (!row) return;
    setSaving(true);

    // 1セクション想定（あなたの本番運用寄り）
    const normalized = sections.map((s) => ({
      date: s.date,
      title: s.title || "",
      blocks: ensureNonEmpty(s.blocks), // ← ここで公式準拠へ矯正
      text: s.text || "",
      attachments: Array.isArray(s.attachments) ? s.attachments : [],
    }));

    const mergedText = normalized.map((s) => (s.text || "").trim()).filter(Boolean).join("\n\n");
    const allAtts = normalized.flatMap((s) => s.attachments || []);
    const uniqAtts = Array.from(new Map((allAtts as any[]).map((a: any) => [a?.url || a?.id || JSON.stringify(a), a])).values());
    attachmentsRef.current = uniqAtts;

    // 保存バリアント（読み込み側フォールバックとペア）
    const variants: any[] = [
      // (A) Block[]（公式推奨）
      normalized[0]?.blocks ?? [],
      // (B) sections 形式
      { sections: normalized },
      // (C) 文字列（Bの JSON）
      JSON.stringify({ sections: normalized }),
    ];

    let lastErr: any = null;
    for (let i = 0; i < variants.length; i++) {
      try {
        const payload: Partial<LogRow> = {
          content_json: variants[i],
          content_text: mergedText,
          attachments: attachmentsRef.current,
        };
        if (USE_BACKEND) await apiUpdateLog(row.log_id, payload);
        else await mockUpdateLog(row.log_id, payload);

        alert("✅ 保存しました");
        setSaving(false);
        return;
      } catch (e: any) {
        lastErr = e;
        dbg.warn(`save failed variant #${i + 1}`, e?.message || e);
      }
    }
    dbg.error("All save variants failed", lastErr);
    alert("❌ 保存に失敗しました");
    setSaving(false);
  }

  if (loading) return <div className="p-6">Loading...</div>;

  const sec = sections[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">
            {row?.client_name} / {row?.campaign_id} / {row?.month_date}
          </div>
          <div className="text-xs text-gray-500">
            log_id: {row?.log_id} &nbsp;|&nbsp;
            mode: {USE_BACKEND ? "backend" : "mock"} &nbsp;|&nbsp;
            {USE_BACKEND ? `API_BASE: ${API_BASE}` : "localStorage"}
          </div>
        </div>
        <div className="flex gap-2">
          {!USE_BACKEND && (
            <button
              onClick={() => { localStorage.clear(); alert("localStorage をクリアしました。"); }}
              className="px-3 py-2 border rounded"
            >
              LSクリア
            </button>
          )}
          <button onClick={() => location.reload()} className="px-3 py-2 border rounded">
            リロード
          </button>
          <button onClick={onSave} disabled={saving} className="px-3 py-2 rounded bg-black text-white">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <Editor
          value={ensureNonEmpty(sec?.blocks ?? [])}
          onChange={(j, t, atts) => {
            const clean = ensureNonEmpty(j);
            updateSection(sec.id, (prev) => ({
              ...prev,
              blocks: clean,
              text: t ?? prev.text,
              attachments: Array.isArray(atts) ? atts : prev.attachments,
            }));
          }}
        />
      </div>
    </div>
  );
}
