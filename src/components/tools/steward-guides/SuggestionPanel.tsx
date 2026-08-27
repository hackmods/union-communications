"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type SuggestionPanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** Right-hand live script / scorecard surface for steward guides. */
export function SuggestionPanel({
  title,
  children,
  className,
}: SuggestionPanelProps) {
  return (
    <Card density="compact" className={className}>
      <h2 className="text-sm font-semibold text-opseu-dark">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-gray-800">{children}</div>
    </Card>
  );
}

type ScriptBlockProps = {
  label: string;
  text: string;
};

export function ScriptBlock({ label, text }: ScriptBlockProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <pre className="mt-1.5 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 font-sans text-sm leading-relaxed text-gray-800">
        {text}
      </pre>
    </div>
  );
}
