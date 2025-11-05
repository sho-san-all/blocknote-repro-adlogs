"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";

type Props = {
  value: any[];
  readOnly?: boolean;
  logId?: string;
  onChange?: (json: any[], text?: string, attachments?: any[]) => void;
};

// BlockNote に渡す tables オプション（公式のまま）
const TABLE_OPTS = {
  splitCells: true,
  cellBackgroundColor: true,
  cellTextColor: true,
  headers: true,
};

export default function Editor({ value, readOnly, onChange }: Props) {
  const editor = useCreateBlockNote({
    initialContent: value,
    tables: TABLE_OPTS,
  });

  // 初期値を差し替える（ルーティングや再読込への追従）
  useEffect(() => {
    try {
      editor.replaceBlocks(editor.topLevelBlocks, value);
    } catch (e) {
      console.error("[Editor] replaceBlocks failed", e);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!onChange) return;
    const unsub = editor.onChange((_ctx) => {
      try {
        const json = editor.document; // Block[]
        // ここで plain text 生成・添付抽出を行うなら必要に応じて
        onChange(json, "", []);
      } catch (e) {
        console.warn("[Editor] onChange parse failed", e);
      }
    });
    return () => unsub();
  }, [editor, onChange]);

  return (
    <div>
      <BlockNoteView editor={editor} editable={!readOnly} />
    </div>
  );
}
