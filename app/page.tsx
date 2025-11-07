"use client";

import { useEffect, useState } from "react";
import AdLogsEditor from "./_components/AdLogsEditor";

const LS_KEY = "repro_adlog_content_json";
const DEFAULT_DOC = [{ type: "paragraph", content: [] }];

export default function Page() {
  const [initial, setInitial] = useState<any[] | undefined>(undefined);

  // 初期ロード：localStorage から復旧（空 or 壊れ → 既定に置換）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_DOC));
        setInitial(DEFAULT_DOC);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setInitial(parsed);
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_DOC));
        setInitial(DEFAULT_DOC);
      }
    } catch {
      localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_DOC));
      setInitial(DEFAULT_DOC);
    }
  }, []);

  if (!initial) return null;

  return (
    <main style={{ padding: 24 }}>
      <h1>Ad Logs Editor (with custom Alert block)</h1>
      <p style={{ color: "#9ca3af" }}>テキストを入力するか「/」を入力してコマンド選択</p>
      <AdLogsEditor
        initialContent={initial}
        onChange={(json) => {
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(json));
          } catch {}
        }}
      />
    <p><a href="/ad-logs/test-123/edit">/ad-logs/test-123/edit</a></p>

    </main>
  );
}
