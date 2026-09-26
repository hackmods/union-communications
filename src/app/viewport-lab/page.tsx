"use client";

import dynamic from "next/dynamic";

const ViewportLab = dynamic(
  () =>
    import("@/components/ops/ViewportLab").then((m) => m.ViewportLab),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading Viewport Lab…
      </div>
    ),
  },
);

export default function ViewportLabPage() {
  return <ViewportLab />;
}
