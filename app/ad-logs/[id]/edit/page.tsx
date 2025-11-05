import dynamic from "next/dynamic";

const AdLogEditPageInner = dynamic(
  () => import("@/components/adlogs/AdLogEditPageInner"),
  { ssr: false }
);

export default function Page({ params }: { params: { id: string }}) {
  return <AdLogEditPageInner logId={params.id} />;
}
