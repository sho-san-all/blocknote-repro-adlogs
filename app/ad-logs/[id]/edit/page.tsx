"use client";

import { useMemo } from "react";
import AdLogsEditor from "@/app/_components/AdLogsEditor";

export default function EditPage({ params }: { params: { id: string } }) {
  // id に応じた初期値を用意するならここで取得して useMemo
  const initial = useMemo(() => undefined, [params.id]);

  return (
    <main style={{ padding: 24 }}>
      <h1>編集: {params.id}</h1>
      <AdLogsEditor
        initialContent={initial}
        onChange={(json) => {
          console.log("changed:", params.id, json);
        }}
      />
    </main>
  );
}
