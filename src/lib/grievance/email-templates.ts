import type { EmailDraft, EmailTemplateId, Grievance } from "@/types/grievance";
import type { GrievanceConfig } from "@/types/tenant";
import { getCurrentStepDueDate, getStepConfig } from "./deadlines";

interface TemplateContext {
  grievance: Grievance;
  config: GrievanceConfig;
  locale: "en" | "fr";
  localNumber?: string;
}

function formatDate(iso: string, locale: "en" | "fr"): string {
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stepName(ctx: TemplateContext): string {
  const step = getStepConfig(ctx.config, ctx.grievance.currentStep);
  return step?.name ?? `Step ${ctx.grievance.currentStep}`;
}

function dueDateLine(ctx: TemplateContext): string {
  const due = getCurrentStepDueDate(
    ctx.grievance.filedAt,
    ctx.grievance.currentStep,
    ctx.config,
  );
  if (!due) return "";
  const formatted = due.toLocaleDateString(
    ctx.locale === "fr" ? "fr-CA" : "en-CA",
    { year: "numeric", month: "long", day: "numeric" },
  );
  return ctx.locale === "fr"
    ? `Échéance de réponse : ${formatted}`
    : `Response deadline: ${formatted}`;
}

const TEMPLATES: Record<
  EmailTemplateId,
  (ctx: TemplateContext) => { subject: string; body: string }
> = {
  step1_meeting: (ctx) => {
    const member = ctx.grievance.memberPseudonym ?? "the grievor";
    const local = ctx.localNumber ? `Local ${ctx.localNumber}` : "the local union";
    if (ctx.locale === "fr") {
      return {
        subject: `Demande de rencontre - grief ${stepName(ctx)}`,
        body: `Bonjour,

Je vous écris au nom de ${local} pour demander une rencontre concernant un grief déposé le ${formatDate(ctx.grievance.filedAt, "fr")} (${ctx.grievance.category}).

Le grief concerne : ${member}.

${dueDateLine(ctx)}

Veuillez proposer des dates pour une rencontre de grief ${stepName(ctx)}.

Cordialement,
[Steward name]
[Contact information]

---
BROUILLON - réviser avant envoi. Ne pas envoyer automatiquement.`,
      };
    }
    return {
      subject: `Meeting request - ${stepName(ctx)} grievance`,
      body: `Hello,

I am writing on behalf of ${local} to request a meeting regarding a grievance filed on ${formatDate(ctx.grievance.filedAt, "en")} (${ctx.grievance.category}).

The grievance concerns: ${member}.

${dueDateLine(ctx)}

Please propose dates for a ${stepName(ctx)} grievance meeting.

Regards,
[Steward name]
[Contact information]

---
DRAFT - review before sending. Do not auto-send.`,
    };
  },
  extension_request: (ctx) => {
    if (ctx.locale === "fr") {
      return {
        subject: `Demande de prolongation - grief ${ctx.grievance.id}`,
        body: `Bonjour,

Je demande une prolongation du délai de réponse pour le grief déposé le ${formatDate(ctx.grievance.filedAt, "fr")}.

Raison de la prolongation :
[Indiquer la raison]

${dueDateLine(ctx)}

Cordialement,
[Steward name]

---
BROUILLON - réviser avant envoi.`,
      };
    }
    return {
      subject: `Extension request - grievance ${ctx.grievance.id}`,
      body: `Hello,

I am requesting an extension to the response deadline for the grievance filed on ${formatDate(ctx.grievance.filedAt, "en")}.

Reason for extension:
[State reason]

${dueDateLine(ctx)}

Regards,
[Steward name]

---
DRAFT - review before sending.`,
    };
  },
  member_update: (ctx) => {
    const member = ctx.grievance.memberPseudonym ?? "Member";
    if (ctx.locale === "fr") {
      return {
        subject: `Mise à jour sur votre grief`,
        body: `Bonjour ${member},

Voici une mise à jour sur votre grief (${ctx.grievance.category}), actuellement à ${stepName(ctx)}.

Statut : ${ctx.grievance.status}

[Insérer les détails de la mise à jour]

N'hésitez pas à me contacter si vous avez des questions.

Cordialement,
[Steward name]

---
BROUILLON - réviser avant envoi.`,
      };
    }
    return {
      subject: `Update on your grievance`,
      body: `Hello ${member},

Here is an update on your grievance (${ctx.grievance.category}), currently at ${stepName(ctx)}.

Status: ${ctx.grievance.status}

[Insert update details]

Please contact me if you have any questions.

Regards,
[Steward name]

---
DRAFT - review before sending.`,
    };
  },
};

export function buildEmailDraft(
  templateId: EmailTemplateId,
  grievance: Grievance,
  config: GrievanceConfig,
  locale: "en" | "fr",
  localNumber?: string,
): EmailDraft {
  const ctx: TemplateContext = { grievance, config, locale, localNumber };
  const { subject, body } = TEMPLATES[templateId](ctx);
  return { templateId, locale, subject, body };
}

export const EMAIL_TEMPLATE_IDS: EmailTemplateId[] = [
  "step1_meeting",
  "extension_request",
  "member_update",
];
