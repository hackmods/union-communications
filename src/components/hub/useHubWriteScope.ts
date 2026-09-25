"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

/**
 * Pre-flight for hub write forms: disable submit when the session lacks
 * union/local context instead of letting a full form fail generically.
 */
export function useHubWriteScope() {
  const { data: session, status } = useSession();
  const t = useTranslations("hub");
  const loading = status === "loading";
  const unionId = session?.user?.unionId ?? null;
  const localId = session?.user?.localId ?? null;
  const canWrite = Boolean(unionId && localId);
  const blockReason = loading
    ? null
    : !unionId
      ? t("writeNoUnion")
      : !localId
        ? t("writeNoLocal")
        : null;

  return {
    loading,
    canWrite,
    unionId,
    localId,
    blockReason,
    blockedMessage: blockReason ?? t("writeScopeBlocked"),
  };
}
