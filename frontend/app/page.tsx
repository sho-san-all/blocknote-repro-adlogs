"use client";

import { useEffect, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView, darkDefaultTheme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

export default function Page() {
  const [log, setLog] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      // ① 一覧から1件拾う
      const res = await fetch(`${API}/ad-logs`);
      const js = await res.json();
      const item = js.items?.[0];
      if (!item) return;
      // ② 詳細取得（テーブル入りの seed が返る想定）
      const res2 = await fetch(`${API}/ad-logs/${item.log_id}`);
      setLog(await res2.json());
    })();
  }, []);

  const editor = useCreateBlockNote({
    initialContent:
      (log?.content_json?.[0]?.blocks) // sections配列版に合わせる
      || (Array.isArray(log?.content_json) ? log.content_json : []),
    tables: { splitCells: true, cellBackgroundColor: true, cellTextColor: true, headers: true },
  });

  if (!log) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: "0 0 12px" }}>
        {log.client_name} / {log.campaign_id} / {log.month_date}
      </h2>
      <BlockNoteView editor={editor} theme={darkDefaultTheme} />
    </div>
  );
}
