"use client";

import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";

type MfaJourneyShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  help?: ReactNode;
  steps?: ReactNode;
};

/** Shared chrome for MFA challenge, setup, replace, and manage states. */
export function MfaJourneyShell({
  title,
  subtitle,
  children,
  help,
  steps,
}: MfaJourneyShellProps) {
  return (
    <PageShell size="nestedAuth" className="py-4 md:py-6">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-gray-600">{subtitle}</p> : null}
      {steps ? <div className="mt-4">{steps}</div> : null}
      <Card density="compact" className="mt-6">
        {children}
      </Card>
      {help ? <div className="mt-4">{help}</div> : null}
    </PageShell>
  );
}
