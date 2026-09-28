"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type MfaHelpStep = "challenge" | "setup" | "replace" | "manage";

const TOPICS: Record<MfaHelpStep, readonly string[]> = {
  challenge: ["why", "whereCode", "recovery", "notWorking", "after"],
  setup: ["whatApp", "cantScan", "examples"],
  replace: ["whyReplace", "oldStops", "saveCodes"],
  manage: ["lostPhone", "recoveryManage", "singleSecret"],
};

type MfaHelpPanelProps = {
  step: MfaHelpStep;
  className?: string;
};

function HelpTopic({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      className="group rounded-lg border border-gray-200 bg-gray-50/60 open:bg-white"
    >
      <summary
        className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-opseu-dark marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 [&::-webkit-details-marker]:hidden"
        onClick={(e) => {
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
      >
        <span className="flex items-center justify-between gap-2">
          <span>{title}</span>
          <span
            aria-hidden
            className="text-gray-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-gray-100 px-3 pb-3 pt-2 text-sm leading-relaxed text-gray-600">
        {children}
      </div>
    </details>
  );
}

/** Step-scoped progressive help for the MFA journey. */
export function MfaHelpPanel({ step, className }: MfaHelpPanelProps) {
  const t = useTranslations("hub.mfaJourney.help");
  const topics = TOPICS[step];
  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby="mfa-help-heading"
    >
      <h2
        id="mfa-help-heading"
        className="text-sm font-semibold text-opseu-dark"
      >
        {t("needHelp")}
      </h2>
      <div className="space-y-2">
        {topics.map((topic) => (
          <HelpTopic key={topic} title={t(`${step}.${topic}.title`)}>
            {t(`${step}.${topic}.body`)}
          </HelpTopic>
        ))}
      </div>
    </section>
  );
}
