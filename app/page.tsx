"use client";

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useMemo, useState } from "react";

type Block = any;

function blankParagraph(): Block {
  return {
    type: "paragraph",
    props: { textAlignment: "left" },
    content: [{ type: "text", text: "", styles: {} }],
    children: [],
  };
}

function ensureNonEmpty(blocks: any): Block[] {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks as Block[];
  return [blankParagraph()];
}

// 最小限：Table が古い形でもコケないよう tableContent へ寄せる
function normalizeTable(b: any): any {
  if (b?.type !== "table") return b;
  const c = b.content;
  if (c && c.type === "tableContent") return b;
  // 旧: rows[].cells[].content または row.content などを吸収
  const rowsSrc: any[] =
    (Array.isArray(c?.rows) && c.rows) ||
    (Array.isArray(c) && c) ||
    (Array.isArray(b.children) && b.children) ||
    [];
  const rows = rowsSrc.map((r: any) => {
    const cellsSrc =
      (Array.isArray(r?.cells) && r.cells) ||
      (Array.isArray(r?.content) && r.content) ||
      (Array.isArray(r) && r) ||
      [];
    const cells = cellsSrc.map((cell: any) => {
      const inline =
        (Array.isArray(cell?.content) && cell.content) ||
        (cell?.text ? [{ type: "text", text: String(cell.text), styles: {} }] : []);
      return {
        type: "tableCell",
        props: {
          colspan: cell?.props?.colspan ? Number(cell.props.colspan) : undefined,
          rowspan: cell?.props?.rowspan ? Number(cell.props.rowspan) : undefined,
          textAlignment: cell?.props?.textAlignment || "left",
        },
        content: inline,
      };
    });
    return { cells };
  });
  return {
    ...b,
    content: { type: "tableContent", columnWidths: [], headerRows: 0, rows },
    children: [],
  };
}

function normalizeBlocksDeep(blocks: any): Block[] {
  const arr = ensureNonEmpty(blocks);
  return arr.map((b) => {
    if (!b || typeof b !== "object") return blankParagraph();
    if (b.type === "table") return normalizeTable(b);
    // 段落/見出しなどはそのまま（中身が無くてもOK）
    return {
      ...b,
      props: { textAlignment: b?.props?.textAlignment || "left", ...b?.props },
      content: Array.isArray(b?.content) ? b.content : b?.content ? [b.content] : [],
      children: Array.isArray(b?.children) ? b.children : [],
    };
  });
}

export default function Page() {
  // 実アプリでは API で log を取ってくる想定。ここでは擬似的に null → データ に遷移させる
  const [log, setLog] = useState<any | null>(null);
  const [initialBlocks, setInitialBlocks] = useState<Block[] | null>(null);

  // 擬似取得：最初は空→後で“テーブル含むブロック”を設定
  useEffect(() => {
    // ここを実際は fetch("/api/ad-logs/:id") に置き換え
    const t = setTimeout(() => {
      setLog({
        // ①セクション配列 or ②ブロック配列 どちらでも受ける
        content_json: [
          {
            date: "2025-09-01",
            title: "Test Table",
            blocks: [
              {
                type: "heading",
                props: { level: 2, textAlignment: "left" },
                content: [{ type: "text", text: "Test Table", styles: {} }],
                children: [],
              },
              {
                // 旧形でも新形でも OK にする
                type: "table",
                props: {},
                content: {
                  type: "tableContent",
                  columnWidths: [160, 160],
                  headerRows: 0,
                  rows: [
                    {
                      cells: [
                        {
                          type: "tableCell",
                          props: {},
                          content: [{ type: "text", text: "A1", styles: {} }],
                        },
                        {
                          type: "tableCell",
                          props: {},
                          content: [{ type: "text", text: "B1", styles: {} }],
                        },
                      ],
                    },
                  ],
                },
                children: [],
              },
            ],
          },
        ],
      });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // log を受けて「最初の一度だけ」初期ブロックを確定
  useEffect(() => {
    if (initialBlocks !== null) return; // すでに確定済みなら触らない（initialContent は初回のみ）
    // ① sections 形式
    if (
      Array.isArray(log?.content_json) &&
      log.content_json.length > 0 &&
      typeof log.content_json[0] === "object" &&
      "blocks" in log.content_json[0]
    ) {
      const b = normalizeBlocksDeep(log.content_json[0].blocks);
      setInitialBlocks(ensureNonEmpty(b));
      return;
    }
    // ② ブロック配列そのもの
    if (Array.isArray(log?.content_json)) {
      const b = normalizeBlocksDeep(log.content_json);
      setInitialBlocks(ensureNonEmpty(b));
      return;
    }
    // データ未取得の場合でも落ちないように空段落で用意
    setInitialBlocks(ensureNonEmpty([]));
  }, [log, initialBlocks]);

  // initialBlocks が決まるまでは描画しない（ここが重要）
  if (initialBlocks === null) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const editor = useCreateBlockNote({
    initialContent: initialBlocks, // ★ 非空の配列が必ず入る
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
  });

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>BlockNote table repro (safe init)</h1>
      <BlockNoteView editor={editor} />
    </div>
  );
}
