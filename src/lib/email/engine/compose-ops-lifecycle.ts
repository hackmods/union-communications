import { resolvePlatformEmailBrand } from "@/lib/email/engine/design-tokens";
import { renderEmailDocument } from "@/lib/email/engine/layout";
import type { EmailArtifact, EmailLocale } from "@/lib/email/engine/types";

export type OpsLifecycleNotifyKind = "restart" | "deploy";

/**
 * Operator lifecycle email (restart). Deploy still uses host-readiness plain text.
 * No secrets, no member data — commit / version / host identity only.
 */
export function composeOpsLifecycleNotify(input: {
  kind: OpsLifecycleNotifyKind;
  commit: string;
  version: string;
  builtAt: string;
  startedAt: string;
  hostname: string;
  pid: number;
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const short =
    input.commit && input.commit !== "unknown"
      ? input.commit.slice(0, 7)
      : "unknown";

  if (input.kind === "deploy") {
    const subject =
      locale === "fr"
        ? `UnionOps déploiement ${short}`
        : `UnionOps deploy ${short}`;
    const intro =
      locale === "fr"
        ? "Une nouvelle image a démarré sur cet hôte."
        : "A new image started on this host.";
    return renderEmailDocument({
      locale,
      classification: "transactional",
      subject,
      preheader: intro,
      blocks: [
        { type: "paragraph", text: intro },
        {
          type: "metaList",
          rows: metaRows(input, locale),
        },
      ],
      brand: resolvePlatformEmailBrand({
        signOff:
          locale === "fr"
            ? "— UnionOps (avis opérateur; pas une liste)"
            : "— UnionOps (operator notice; not a mailing list)",
      }),
    });
  }

  const subject =
    locale === "fr"
      ? `UnionOps redémarrage ${short} — processus démarré`
      : `UnionOps restart ${short} — process started`;
  const intro =
    locale === "fr"
      ? "Le processus Node de cet hôte a démarré (même image, sauf indication contraire)."
      : "This host’s Node process started (same image unless noted elsewhere).";

  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject,
    preheader: intro,
    blocks: [
      { type: "paragraph", text: intro },
      {
        type: "metaList",
        rows: metaRows(input, locale),
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Avis transactionnel opérateur — pas une campagne membre."
            : "Operator transactional notice — not a member campaign.",
      },
    ],
    brand: resolvePlatformEmailBrand({
      signOff:
        locale === "fr"
          ? "— UnionOps (avis opérateur; pas une liste)"
          : "— UnionOps (operator notice; not a mailing list)",
    }),
  });
}

function metaRows(
  input: {
    commit: string;
    version: string;
    builtAt: string;
    startedAt: string;
    hostname: string;
    pid: number;
  },
  locale: EmailLocale,
): Array<{ label: string; value: string }> {
  return [
    {
      label: locale === "fr" ? "Commit" : "Commit",
      value: input.commit || "unknown",
    },
    {
      label: locale === "fr" ? "Version" : "Version",
      value: input.version || "unknown",
    },
    {
      label: locale === "fr" ? "Construit le" : "Built at",
      value: input.builtAt || "unknown",
    },
    {
      label: locale === "fr" ? "Démarré le" : "Started at",
      value: input.startedAt,
    },
    {
      label: locale === "fr" ? "Hôte" : "Hostname",
      value: input.hostname || "unknown",
    },
    {
      label: "PID",
      value: String(input.pid),
    },
  ];
}
