"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { locales, defaultBlockSpecs } from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
  createReactBlockSpec,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

/** “空”の既定ドキュメント（空段落1つが必須） */
const DEFAULT_DOC = [{ type: "paragraph", content: [] }];

/** Alert（擬似Callout）ブロック */
const AlertBlock = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      variant: { default: "info", values: ["info", "warning", "success"] as const },
      title: { default: "見出し" },
    },
    content: "inline",
    children: "block",
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
          contentEditable={false}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{palette.icon}</span>
            <div
              style={{ fontWeight: 700 }}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const t = (e.target as HTMLElement).innerText ?? "";
                editor.updateBlock(block, { type: "alert", props: { ...block.props, title: t } });
              }}
            >
              {title}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {(["info", "warning", "success"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() =>
                    editor.updateBlock(block, { type: "alert", props: { ...block.props, variant: v } })
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

          <div style={{ marginTop: 8 }}>{ctx.renderChildren()}</div>
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

/** 親：マウント確認だけ。hooks数を固定するため本体は子へ分離 */
export default function AdLogsEditorInner(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <EditorBody {...props} /> : null;
}

/** 子：エディタ本体（重いhooksはこちらに集約） */
function EditorBody({ initialContent, readOnly = false, onChange }: Props) {
  // すべて不変化
  const tablesOpt = useMemo(
    () => ({ splitCells: true, cellBackgroundColor: true, cellTextColor: true, headers: true }),
    []
  );

  const blockSpecs = useMemo(
    () => ({ ...defaultBlockSpecs, alert: AlertBlock }),
    []
  );

  const slashItems = useCallback(
    (ed: any) => [
      ...getDefaultReactSlashMenuItems(ed),
      {
        name: "Alert（囲み）",
        group: "Insert",
        icon: <>💡</>,
        execute: () => {
          const cur = ed.getTextCursorPosition()?.block ?? ed.document.at(-1) ?? ed.document[0];
          ed.insertBlocks(
            [
              {
                type: "alert",
                props: { variant: "info", title: "見出し" },
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "ここに説明を書きます。" }] },
                ],
                children: [],
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

  // ブラウザ安全なアップロード
  const uploadFile = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    return { url, size: file.size, name: file.name };
  }, []);

  // 空や不正は既定ドキュメントに置換
  const memoInitial = useMemo(() => {
    return Array.isArray(initialContent) && initialContent.length > 0
      ? initialContent
      : DEFAULT_DOC;
  }, [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: memoInitial,
    dictionary: locales.ja,
    uploadFile,
    tables: tablesOpt,
    slashMenuItems: slashItems,
    blockSpecs,
  } as any);

  const handleChange = useCallback(() => onChange?.(editor.document), [editor, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      editable={!readOnly}
      theme="light"
      onChange={handleChange}
    />
  );
}
