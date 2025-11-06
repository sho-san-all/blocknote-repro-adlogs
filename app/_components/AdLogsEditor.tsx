"use client";

import { useCallback, useMemo } from "react";
import { locales, defaultBlockSpecs } from "@blocknote/core";
import {
  BlockNoteView as MantineBlockNoteView,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
  createReactBlockSpec,
} from "@blocknote/react";

// 必須のCSS
import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

/** ─────────────────────────────────────────────
 *  1) 自作 Alert ブロック（擬似 Callout）
 *  - variant: 視覚的な色/アイコンを切り替え
 *  - title  : 上段の太字テキスト
 *  - content: 下段の本文（BlockNoteの子ブロック）
 *  ─────────────────────────────────────────── */
const AlertBlock = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      variant: {
        default: "info",
        values: ["info", "warning", "success"] as const,
      },
      title: { default: "見出し" },
    },
    // このブロックの子要素を許可
    content: "inline", // タイトル行で使う
    children: "block", // タイトルの下に任意のブロックを入れられる
  },
  {
    render: (ctx) => {
      const { block, editor } = ctx;
      const { variant, title } = block.props as {
        variant: "info" | "warning" | "success";
        title: string;
      };

      const palette = {
        info: { icon: "💡", border: "#60a5fa", bg: "#eff6ff" },
        warning: { icon: "⚠️", border: "#f59e0b", bg: "#fffbeb" },
        success: { icon: "✅", border: "#10b981", bg: "#ecfdf5" },
      }[variant];

      return (
        <div
          style={{
            borderLeft: `6px solid ${palette.border}`,
            background: palette.bg,
            padding: "12px 16px",
            borderRadius: 8,
            margin: "12px 0",
          }}
          contentEditable={false} // コンテナは編集不可
        >
          {/* タイトル（太字・アイコン） */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{palette.icon}</span>
            <div
              style={{ fontWeight: 700 }}
              // タイトルは入力欄として編集可能にする
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const t = (e.target as HTMLElement).innerText ?? "";
                editor.updateBlock(block, {
                  type: "alert",
                  props: { ...block.props, title: t },
                });
              }}
              onBlur={() => {
                // 不要だが念のため re-render
                editor.updateBlock(block, { ...block });
              }}
            >
              {title}
            </div>

            {/* 右側の variant 切替（info / warning / success） */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {(["info", "warning", "success"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() =>
                    editor.updateBlock(block, {
                      type: "alert",
                      props: { ...block.props, variant: v },
                    })
                  }
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: v === variant ? "#fff" : "#f9fafb",
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* 本文（ここから下は子ブロックを自由に） */}
          <div style={{ marginTop: 8 }}>
            {/** タイトル下にパラグラフなどの子ブロックを入れる領域 */}
            {ctx.renderChildren()}
          </div>
        </div>
      );
    },
  }
);

type Props = {
  initialContent?: any;
  readOnly?: boolean;
  onChange?: (docJSON: any) => void;
};

export default function AdLogsEditor({
  initialContent,
  readOnly = false,
  onChange,
}: Props) {
  // 2) すべてのオプションを “不変化”
  const tablesOpt = useMemo(
    () => ({
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    }),
    []
  );

  // 既定のブロック + 自作 Alert を登録
  const blockSpecs = useMemo(
    () => ({
      ...defaultBlockSpecs,
      alert: AlertBlock,
    }),
    []
  );

  // Slash メニュー（Alert 追加）
  const slashItems = useCallback(
    (ed: any) => [
      ...getDefaultReactSlashMenuItems(ed),
      {
        name: "Alert（囲み）",
        group: "Insert",
        icon: <>💡</>,
        execute: () => {
          const cur =
            ed.getTextCursorPosition()?.block ??
            ed.document.at(-1) ??
            ed.document[0];
          ed.insertBlocks(
            [
              {
                type: "alert",
                props: { variant: "info", title: "見出し" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "ここに説明を書きます。" }],
                  },
                ],
                children: [], // 子ブロックは空でOK（あとでユーザーが追加）
              },
            ],
            cur?.id ?? cur,
            "after"
          );
        },
      },
    ],
    []
  );

  // 画像アップロード（簡易：Data URL）
  const uploadFile = useCallback(async (file: File) => {
    const b = await file.arrayBuffer();
    const base64 = Buffer.from(b).toString("base64");
    const mime = file.type || "application/octet-stream";
    return {
      url: `data:${mime};base64,${base64}`,
      size: file.size,
      name: file.name,
    };
  }, []);

  const memoInitial = useMemo(() => initialContent, [initialContent]);

  // 3) useCreateBlockNote には“メモ化参照のみ”を渡す
  const editor = useCreateBlockNote({
    initialContent: memoInitial,
    dictionary: locales.ja,
    uploadFile,
    tables: tablesOpt,
    slashMenuItems: slashItems,
    blockSpecs, // ← 自作ブロックを登録
  } as any);

  const handleChange = useCallback(() => {
    onChange?.(editor.document);
  }, [editor, onChange]);

  return (
    <MantineBlockNoteView
      editor={editor}
      editable={!readOnly}
      theme="light"
      onChange={handleChange}
    />
  );
}
