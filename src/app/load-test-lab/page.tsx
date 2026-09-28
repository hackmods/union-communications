"use client";

import dynamic from "next/dynamic";

const LoadTestLab = dynamic(
  () =>
    import("@/components/ops/LoadTestLab").then((m) => m.LoadTestLab),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading Load Test Lab…
      </div>
    ),
  },
);

export default function LoadTestLabPage() {
  return <LoadTestLab />;
}
