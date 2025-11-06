"use client";
import dynamic from "next/dynamic";

/**
 * ここでは中身を import しません。
 * ファイルごとクライアント専用にして SSR から完全に切り離します。
 */
const AdLogsEditor = dynamic(
  () => import("./AdLogsEditorInner"), // 中身は次のファイル
  { ssr: false }
);

export default AdLogsEditor;
