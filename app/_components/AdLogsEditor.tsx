"use client";

import { useCallback, useMemo } from "react";

// BlockNote 本体
import { locales, defaultBlockSpecs } from "@blocknote/core";
import { Callout } from "@blocknote/core/extensions/callout";
import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView as MantineBlockNoteView } from "@blocknote/mantine";

// 必須のCSS
import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

type Props = {
  initialContent?: any; // JSON (BlockNoteドキュメント)
  readOnly?: boolean;
  onChange?: (docJSON: any) => void;
};

/**
 * BlockNote の “Rendered more hooks than during the previous render” を避けるため、
 * 渡すオプションはすべて useMemo / useCallback で不変にします。
 */
export default function AdLogsEditor({
  initialContent,
  readOnly = false,
  onChange,
}: Props) {
  // ── 1) オプションをすべてメモ化 ─────────────────────────────
  const tablesOpt = useMemo(
    () => ({
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    }),
    []
  );

  const blockSpecs = useMemo(
    () => ({
      ...defaultBlockSpecs,
      callout: Callout, // 囲み（Callout）を追加
    }),
    []
  );

  const slashItems = useCallback(
    (ed: any) => [
      ...getDefaultReactSlashMenuItems(ed),
      {
        name: "Callout（囲み）",
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
                type: "callout",
                props: { icon: "💡" },
                content: [
                  {
                    type: "heading",
                    props: { level: 3 },
                    content: [
                      { type: "text", text: "見出し", styles: {} },
                    ],
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "ここに説明を書きます。",
                        styles: {},
                      },
                    ],
                  },
                ],
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

  // 画像アップロード（再現用の簡易版：データURLで埋め込み）
  const uploadFile = useCallback(async (file: File) => {
    const b = await file.arrayBuffer();
    const base64 = Buffer.from(b).toString("base64");
    const mime = file.type || "application/octet-stream";
    return {
      url: `data:${mime};base64,${base64}`,
      // BlockNoteの期待キー（必要最小限）
      size: file.size,
      name: file.name,
    };
  }, []);

  // 初期ドキュメントもメモ化
  const memoInitial = useMemo(() => initialContent, [initialContent]);

  // ── 2) useCreateBlockNote に“メモ化した参照だけ”を渡す ────────
  const editor = useCreateBlockNote({
    initialContent: memoInitial,
    dictionary: locales.ja,
    uploadFile,
    tables: tablesOpt,
    slashMenuItems: slashItems,
    blockSpecs,
  } as any);

  // 変更通知（必要な場合のみ）
  const handleChange = useCallback(() => {
    if (!onChange) return;
    const json = editor.document; // JSON Document
    onChange(json);
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
