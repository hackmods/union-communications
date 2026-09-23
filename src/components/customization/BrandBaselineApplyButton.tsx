"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { brandBaselineToPatch, type AppliedBaselineRecord } from "@/lib/customization/brand-baseline";
import type { AuthorizedBrandDto } from "@/lib/customization/types";
import type { BrandKit } from "@/types/entities";

const STORAGE_KEY = "unionops.customization.appliedBrandBaseline";

function readApplied(): AppliedBaselineRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppliedBaselineRecord) : null;
  } catch {
    return null;
  }
}

function writeApplied(value: AppliedBaselineRecord | null) {
  try {
    if (!value) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // private browsing / quota
  }
}

/** Explicit apply/undo for a published brand baseline. Never auto-applies. */
export function BrandBaselineApplyButton(props: {
  content: AuthorizedBrandDto;
  releaseId?: string;
}) {
  const t = useTranslations("brandKit.baseline");
  const setBrandKit = useBrandStore((state) => state.setBrandKit);
  const importBrandKit = useBrandStore((state) => state.importBrandKit);
  const [applied, setApplied] = useState<AppliedBaselineRecord | null>(() =>
    typeof window === "undefined" ? null : readApplied(),
  );
  const [previous, setPrevious] = useState<BrandKit | null>(null);

  function apply() {
    const current = useBrandStore.getState().brandKit;
    setPrevious(current);
    setBrandKit(brandBaselineToPatch(props.content));
    const record = {
      resourceKey: "brand:baseline" as const,
      releaseId: props.releaseId,
      appliedAt: new Date().toISOString(),
    };
    writeApplied(record);
    setApplied(record);
  }

  function undo() {
    if (previous) importBrandKit(previous);
    writeApplied(null);
    setApplied(null);
    setPrevious(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded bg-opseu-blue px-3 py-2 text-sm font-medium text-white"
        onClick={apply}
      >
        {t("apply")}
      </button>
      {applied ? (
        <button
          type="button"
          className="rounded border border-opseu-gray/40 px-3 py-2 text-sm"
          onClick={undo}
        >
          {t("undo")}
        </button>
      ) : null}
    </div>
  );
}
