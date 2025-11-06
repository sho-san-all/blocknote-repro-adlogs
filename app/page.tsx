"use client";

import { useMemo } from "react";
import AdLogsEditor from "./_components/AdLogsEditor";

export default function Page() {
  const initial = useMemo(() => undefined, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Ad Logs Editor (with custom Alert block)</h1>
      <AdLogsEditor
        initialContent={initial}
        onChange={(json) => console.log("changed:", json)}
      />
    </main>
  );
}
