"use client";

import { Suspense } from "react";
import { BylawBuilderWorkspace } from "@/components/tools/bylaws/BylawBuilderWorkspace";
import { ToolLoadingFallback } from "@/components/tools/ToolLoadingFallback";

export default function BylawBuilderPage() {
  return (
    <Suspense fallback={<ToolLoadingFallback />}>
      <BylawBuilderWorkspace />
    </Suspense>
  );
}
