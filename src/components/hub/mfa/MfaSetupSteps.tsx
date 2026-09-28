"use client";

import { useTranslations } from "next-intl";

const STEP_KEYS = ["open", "add", "scan", "enter", "protected"] as const;

/** Numbered authenticator enrollment guidance. */
export function MfaSetupSteps() {
  const t = useTranslations("hub.mfaJourney.setupSteps");
  return (
    <ol className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-700">
      {STEP_KEYS.map((key, index) => (
        <li key={key} className="flex gap-3">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue/10 text-xs font-semibold text-opseu-dark"
            aria-hidden
          >
            {index + 1}
          </span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}
