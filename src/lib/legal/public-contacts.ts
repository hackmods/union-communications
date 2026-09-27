type PublicContactEnvironment = Record<string, string | undefined>;

export type PublicLegalContacts = {
  legalEntityName: string | null;
  privacyOfficerName: string | null;
  privacyEmail: string | null;
  mailingAddress: string | null;
  securityEmail: string | null;
  accessibilityEmail: string | null;
  privacyConfigured: boolean;
  securityConfigured: boolean;
  accessibilityConfigured: boolean;
  complete: boolean;
};

function trimmed(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function email(value: string | undefined): string | null {
  const normalized = trimmed(value);
  if (!normalized || !/^[A-Z0-9_%+-]+(?:\.[A-Z0-9_%+-]+)*@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(normalized)) return null;
  return normalized;
}

/** Public identity and role contacts for the host; configuration is not legal approval. */
export function readPublicLegalContacts(
  env: PublicContactEnvironment = process.env,
): PublicLegalContacts {
  const legalEntityName = trimmed(env.UNIONOPS_LEGAL_ENTITY_NAME);
  const privacyOfficerName = trimmed(env.UNIONOPS_PRIVACY_OFFICER_NAME);
  const privacyEmail = email(env.UNIONOPS_PRIVACY_EMAIL);
  const mailingAddress = trimmed(env.UNIONOPS_PRIVACY_MAILING_ADDRESS);
  const securityEmail = email(env.UNIONOPS_SECURITY_EMAIL);
  const accessibilityEmail = email(env.UNIONOPS_ACCESSIBILITY_EMAIL);
  return {
    legalEntityName,
    privacyOfficerName,
    privacyEmail,
    mailingAddress,
    securityEmail,
    accessibilityEmail,
    privacyConfigured: Boolean(
      legalEntityName && privacyOfficerName && privacyEmail && mailingAddress,
    ),
    securityConfigured: Boolean(securityEmail),
    accessibilityConfigured: Boolean(accessibilityEmail),
    complete: Boolean(
      legalEntityName &&
        privacyOfficerName &&
        privacyEmail &&
        mailingAddress &&
        securityEmail &&
        accessibilityEmail,
    ),
  };
}
