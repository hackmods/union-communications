import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  memoryConsumeConfirmToken,
  memoryStoreConfirmToken,
} from "@/lib/email/outreach-lists-memory";
import {
  OUTREACH_CONFIRM_LINK_HOURS,
  createOutreachListToken,
  readOutreachListsConfig,
  verifyOutreachListToken,
  type OutreachListsConfig,
} from "@/lib/email/outreach-config";
import { OUTREACH_LIST_NOTICE } from "@/lib/email/outreach-list-notice";
import { sendClassifiedEmail } from "@/lib/email/send";

export function verifyOutreachConfirmToken(
  token: unknown,
  config: OutreachListsConfig = readOutreachListsConfig(),
): string | null {
  return verifyOutreachListToken(token, "confirm", config.tokenKeys);
}

export async function confirmOutreachListFromTokenHash(
  tokenHash: string,
): Promise<boolean> {
  if (!isPostgresConfigured()) {
    return memoryConsumeConfirmToken(tokenHash);
  }
  const rows = await getDb().execute(
    sql`SELECT public.outreach_confirm_from_token(${tokenHash}, ${randomUUID()}, 'email_link') AS ok`,
  );
  return rows[0]?.ok === true;
}

export type OutreachConfirmMintResult = {
  token: string;
  confirmUrl: string | null;
};

export async function mintOutreachConfirmToken(input: {
  unionId: string;
  listId: string;
  subscriberId: string;
  grantEventId: string | null;
  locale?: "en" | "fr";
  rls: import("@/lib/db/rls-context").RlsSessionContext;
  previewOnly?: boolean;
}): Promise<OutreachConfirmMintResult | null> {
  const config = readOutreachListsConfig();
  if (!config.tokenKeys.length) return null;
  const expiresAt = new Date(
    Date.now() + OUTREACH_CONFIRM_LINK_HOURS * 60 * 60_000,
  );
  const issued = createOutreachListToken("confirm", expiresAt, config.tokenKeys);
  const locale = input.locale ?? "en";
  const confirmPath = `/${locale}/outreach/confirm?token=${encodeURIComponent(issued.token)}`;
  const confirmUrl = config.baseUrl ? `${config.baseUrl}${confirmPath}` : null;

  if (input.previewOnly) {
    return { token: issued.token, confirmUrl };
  }

  if (!isPostgresConfigured()) {
    memoryStoreConfirmToken({
      tokenHash: issued.hash,
      subscriberId: input.subscriberId,
      expiresAt,
    });
    return { token: issued.token, confirmUrl };
  }

  const { withRlsContext } = await import("@/lib/db/rls-context");
  const { outreachActionTokens } = await import("@/lib/db/schema/outreach");
  await withRlsContext(input.rls, async () => {
    await getDb().insert(outreachActionTokens).values({
      id: issued.id,
      unionId: input.unionId,
      listId: input.listId,
      subscriberId: input.subscriberId,
      tokenHash: issued.hash,
      purpose: "confirm",
      grantEventId: input.grantEventId,
      expiresAt,
    });
  });
  return { token: issued.token, confirmUrl };
}

export async function sendOutreachConfirmEmail(input: {
  to: string;
  locale: "en" | "fr";
  listName: string;
  confirmUrl: string;
  config?: OutreachListsConfig;
}): Promise<boolean> {
  const config = input.config ?? readOutreachListsConfig();
  if (!config.senderEmail || !config.senderName) return false;
  const subject =
    input.locale === "fr"
      ? `Confirmez votre inscription — ${input.listName}`
      : `Confirm your subscription — ${input.listName}`;
  const intro =
    input.locale === "fr"
      ? `Pour recevoir des courriels de cette liste syndicale, confirmez votre adresse :`
      : `To receive email from this union list, confirm your address:`;
  const notice = OUTREACH_LIST_NOTICE[input.locale];
  const text = `${intro}\n\n${input.confirmUrl}\n\n${notice}\n\n${config.mailingAddress ?? ""}`;
  const from = `${config.senderName} <${config.senderEmail}>`;
  const result = await sendClassifiedEmail({
    to: input.to,
    subject,
    text,
    classification: "transactional",
    from,
    replyTo: config.contactEmail ?? config.senderEmail,
  });
  return result.ok;
}
