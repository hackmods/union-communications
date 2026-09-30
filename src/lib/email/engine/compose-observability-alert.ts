import { resolvePlatformEmailBrand } from "@/lib/email/engine/design-tokens";
import { composeSecurityNotice } from "@/lib/email/engine/layout";
import type {
  EmailArtifact,
  EmailBlock,
  EmailFormat,
  EmailLocale,
} from "@/lib/email/engine/types";

export type CrisisAlertIssueSample = {
  fingerprint: string;
  count: number;
  sampleMessage: string;
  level: string;
};

export function composeObservabilityCrisisAlert(input: {
  ruleName: string;
  minLevel: string;
  eventCount: number;
  windowMinutes: number;
  issues: CrisisAlertIssueSample[];
  consoleUrl: string;
  locale?: EmailLocale;
  format?: EmailFormat;
  unionId?: string | null;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const brand = resolvePlatformEmailBrand();
  const top = input.issues.slice(0, 5);
  const format = input.format ?? "multipart";

  const subject =
    locale === "fr"
      ? `[UnionOps] Alerte ${input.minLevel} — ${input.ruleName} (${input.eventCount})`
      : `[UnionOps] ${input.minLevel} alert — ${input.ruleName} (${input.eventCount})`;

  const preheader =
    locale === "fr"
      ? `${input.eventCount} événements en ${input.windowMinutes} min`
      : `${input.eventCount} events in ${input.windowMinutes} min`;

  const heading =
    locale === "fr"
      ? `Alerte observabilité : ${input.ruleName}`
      : `Observability alert: ${input.ruleName}`;

  const intro =
    locale === "fr"
      ? `Une règle d’alerte a détecté ${input.eventCount} événement(s) correspondant(s) au cours des ${input.windowMinutes} dernières minutes. Ouvrez la console pour inspecter et accuser réception.`
      : `An alert rule matched ${input.eventCount} event(s) in the last ${input.windowMinutes} minutes. Open the console to inspect and acknowledge.`;

  const blocks: EmailBlock[] = [
    {
      type: "severityCallout",
      severity:
        input.minLevel === "warn"
          ? "warn"
          : input.minLevel === "info"
            ? "info"
            : "error",
      text: heading,
    },
    { type: "paragraph", text: intro },
    {
      type: "metaList",
      rows: [
        {
          label: locale === "fr" ? "Niveau minimum" : "Minimum level",
          value: input.minLevel,
        },
        {
          label: locale === "fr" ? "Événements" : "Events",
          value: String(input.eventCount),
        },
        {
          label: locale === "fr" ? "Fenêtre" : "Window",
          value: `${input.windowMinutes} min`,
        },
        ...(input.unionId
          ? [
              {
                label: locale === "fr" ? "Syndicat" : "Union",
                value: input.unionId,
              },
            ]
          : []),
        {
          label: locale === "fr" ? "Problèmes en tête" : "Top issues",
          value: String(top.length),
        },
      ],
    },
  ];

  if (top.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "issueList",
      items: top.map((issue) => ({
        fingerprint: issue.fingerprint,
        count: issue.count,
        sampleMessage: issue.sampleMessage,
        level: issue.level,
      })),
    });
  }

  blocks.push({
    type: "cta",
    label:
      locale === "fr"
        ? "Ouvrir la console Observabilité"
        : "Open Observability console",
    href: input.consoleUrl,
  });

  return composeSecurityNotice({
    locale,
    subject,
    preheader,
    brand,
    blocks,
    format,
    footerExtra:
      locale === "fr"
        ? [
            "Les piles d’appels ne sont pas incluses dans cet avis. Traitez-le comme une donnée de réponse aux incidents.",
          ]
        : [
            "Stacks are not included in this notice. Treat it as incident-response data.",
          ],
  });
}
