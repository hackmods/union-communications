import { getLocale, getTranslations } from "next-intl/server";
import { readPublicLegalContacts } from "@/lib/legal/public-contacts";

type ContactRole = "privacy" | "security" | "accessibility";

export async function PublicLegalContact({ role }: { role: ContactRole }) {
  const t = await getTranslations("legalContact");
  const locale = await getLocale();
  const contacts = readPublicLegalContacts();
  const heading =
    role === "privacy"
      ? t("privacyTitle")
      : role === "security"
        ? t("securityTitle")
        : t("accessibilityTitle");
  const configured =
    role === "privacy"
      ? contacts.privacyConfigured
      : role === "security"
        ? contacts.securityConfigured
        : contacts.accessibilityConfigured;
  const email =
    role === "privacy"
      ? contacts.privacyEmail
      : role === "security"
        ? contacts.securityEmail
        : contacts.accessibilityEmail;

  return (
    <section
      aria-labelledby={`legal-contact-${role}`}
      className="mt-10 rounded-xl border border-opseu-gray/20 bg-white p-5"
    >
      <h2 id={`legal-contact-${role}`} className="text-lg font-semibold text-opseu-dark">
        {heading}
      </h2>
      {contacts.legalEntityName ? (
        <p className="mt-3">
          <strong>{t("entityLabel")}{locale === "fr" ? " :" : ":"}</strong> {contacts.legalEntityName}
        </p>
      ) : null}
      {role === "privacy" && contacts.privacyOfficerName ? (
        <p className="mt-2">
          <strong>{t("officerLabel")}{locale === "fr" ? " :" : ":"}</strong> {contacts.privacyOfficerName}
        </p>
      ) : null}
      {email ? (
        <p className="mt-2">
          <strong>{t("emailLabel")}{locale === "fr" ? " :" : ":"}</strong>{" "}
          <a className="text-opseu-blue underline" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
      ) : null}
      {role === "privacy" && contacts.mailingAddress ? (
        <p className="mt-2 whitespace-pre-line">
          <strong>{t("mailingLabel")}{locale === "fr" ? " :" : ":"}</strong>{" "}
          {contacts.mailingAddress}
        </p>
      ) : null}
      {!configured ? (
        <p role="status" className="mt-3 text-sm text-amber-950">
          {t("incomplete")}
        </p>
      ) : null}
    </section>
  );
}
