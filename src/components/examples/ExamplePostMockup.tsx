"use client";

import { useBrandStore } from "@/store/brand-store";
import { resolveLocalNumber } from "@/lib/utils/local";
import { cn } from "@/lib/utils";
import type { ExampleAspect, ExampleLayout } from "@/lib/constants/examples";
import {
  GraphicLayoutCanvas,
  type GraphicLayoutCopy,
} from "@/components/tools/graphic-layouts";

export type { GraphicLayoutCopy as ExampleMockupCopy };

interface ExamplePostMockupProps {
  layout: ExampleLayout;
  aspect: ExampleAspect;
  platformLabel: string;
  copy: GraphicLayoutCopy;
  className?: string;
}

export function ExamplePostMockup({
  layout,
  aspect,
  platformLabel,
  copy,
  className,
}: ExamplePostMockupProps) {
  const brandKit = useBrandStore((s) => s.brandKit);
  const local = resolveLocalNumber(brandKit.local.localNumber);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-gray-200 bg-gray-50", className)}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {platformLabel}
        </span>
        <span className="text-[10px] text-gray-400">Local {local}</span>
      </div>
      <GraphicLayoutCanvas
        layout={layout}
        aspect={aspect}
        copy={copy}
        colors={{
          primary: brandKit.primaryColor,
          accent: brandKit.accentColor,
          secondary: brandKit.secondaryColor,
        }}
        localNumber={local}
        subText={brandKit.local.subText}
        size="preview"
      />
    </div>
  );
}
