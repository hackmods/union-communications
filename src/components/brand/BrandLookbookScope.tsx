"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  lookbookScopeStyle,
  type LookbookColourSource,
} from "@/lib/brand/lookbook-kit";

/**
 * Applies Brand Kit chrome CSS variables on a local wrapper so draft admin
 * themes can preview Hub `ui/*` without writing steward localStorage.
 */
export function BrandLookbookScope({
  colours,
  className,
  children,
}: {
  colours: LookbookColourSource;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("min-w-0", className)}
      style={lookbookScopeStyle(colours)}
      data-testid="brand-lookbook-scope"
    >
      {children}
    </div>
  );
}
