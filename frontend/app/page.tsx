export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>BlockNote Repro</h1>
      <p>
        <a href="/ad-logs/demo-1/edit">AdLog Edit (demo-1)</a>
      </p>
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        末尾に <code>?api=1&apiBase=https://YOUR-CLOUDRUN-URL</code> を付けるとバックエンドを呼びます。
      </p>
    </main>
  );
}
