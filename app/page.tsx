"use client";
import { useMemo, useCallback } from "react";
import { locales, defaultBlockSpecs } from "@blocknote/core";
import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
  BlockNoteView as MantineBlockNoteView,
} from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

export default function Page() {
  // 必要なら localStorage 等から取得して useMemo
  const initialContent = useMemo(() => undefined, []);

  const tablesOpt = useMemo(
    () => ({ splitCells: true, cellBackgroundColor: true, cellTextColor: true, headers: true }),
    []
  );

  const blockSpecs = useMemo(
    () => ({ ...defaultBlockSpecs, callout: Callout }),
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
            ed.getTextCursorPosition()?.block ?? ed.document.at(-1) ?? ed.document[0];
          ed.insertBlocks(
            [
              {
                type: "callout",
                props: { icon: "💡" },
                content: [
                  { type: "heading", props: { level: 3 }, content: [{ type: "text", text: "見出し", styles: {} }] },
                  { type: "paragraph", content: [{ type: "text", text: "ここに説明を書きます。", styles: {} }] },
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

  const uploadFile = useCallback(async (file: File) => {
    const b = await file.arrayBuffer();
    const base64 = Buffer.from(b).toString("base64");
    const mime = file.type || "application/octet-stream";
    return { url: `data:${mime};base64,${base64}`, size: file.size, name: file.name };
  }, []);

  // ★ “メモ化した参照だけ”渡す
  const editor = useCreateBlockNote({
    initialContent,
    dictionary: locales.ja,
    uploadFile,
    tables: tablesOpt,
    slashMenuItems: slashItems,
    blockSpecs,
  } as any);

  return (
    <main style={{ padding: 24 }}>
      <h1>Ad Logs Editor</h1>
      <MantineBlockNoteView
        editor={editor}
        editable
        theme="light"
        onChange={() => console.log("changed")}
      />
    </main>
  );
}
