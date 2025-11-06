"use client";

import { useEffect, useMemo, useState } from "react";
import AdLogsEditor from "@/app/_components/AdLogsEditor";

type Props = { params: { id: string } };

const DEFAULT_DOC = [{ type: "paragraph", content: [] }];

export default function AdLogEditPage({ params }: Props) {
  const { id } = params;
  const LS_KEY = useMemo(() => `repro_adlog_content_json:${id}`, [id]);

  const [initial, setInitial] = useState<any[] | undefined>(undefined);

  // 1) 初期ロード：IDごとの保存値を復旧（空/壊れ→既定に置換）
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
  }, [LS_KEY]);

  if (!initial) return null;

  return (
    <main style={{ padding: 24 }}>
      <h1>Ad Logs Editor — ID: {id}</h1>
      <p style={{ color: "#9ca3af" }}>
        「/table」で表を挿入 → 入力 → リロード（ID単位で永続化されます）
      </p>
      <AdLogsEditor
        initialContent={initial}
        onChange={(json) => {
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(json));
          } catch {}
        }}
      />
    </main>
  );
}
