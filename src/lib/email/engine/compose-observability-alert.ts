import { resolvePlatformEmailBrand } from "@/lib/email/engine/design-tokens";
import { renderEmailDocument } from "@/lib/email/engine/layout";
import type {
  EmailArtifact,
  EmailBlock,
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
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const brand = resolvePlatformEmailBrand();
  const top = input.issues.slice(0, 5);

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
    { type: "heading", text: heading },
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
          value:
            locale === "fr"
              ? `${input.windowMinutes} min`
              : `${input.windowMinutes} min`,
        },
        {
          label: locale === "fr" ? "Problèmes en tête" : "Top issues",
          value: String(top.length),
        },
      ],
    },
  ];

  if (top.length > 0) {
    blocks.push({ type: "divider" });
    for (const issue of top) {
      const line = `[${issue.count}×] ${issue.level} — ${issue.sampleMessage.slice(0, 160)}`;
      blocks.push({ type: "paragraph", text: line });
    }
  }

  blocks.push({
    type: "cta",
    label:
      locale === "fr"
        ? "Ouvrir la console Observabilité"
        : "Open Observability console",
    href: input.consoleUrl,
  });

  return renderEmailDocument({
    locale,
    classification: "security",
    subject,
    preheader,
    brand,
    blocks,
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
