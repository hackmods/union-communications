import { describe, expect, it } from "vitest";
import { readPublicLegalContacts } from "./public-contacts";

describe("readPublicLegalContacts", () => {
  const readyConfig = {
    UNIONOPS_LEGAL_ENTITY_NAME: "UnionOps Services Inc.",
    UNIONOPS_PRIVACY_OFFICER_NAME: "Privacy Officer",
    UNIONOPS_PRIVACY_EMAIL: "privacy@example.ca",
    UNIONOPS_PRIVACY_MAILING_ADDRESS: "100 Main Street, Toronto, ON",
    UNIONOPS_SECURITY_EMAIL: "security@example.ca",
    UNIONOPS_ACCESSIBILITY_EMAIL: "accessibility@example.ca",
  };

  it("returns the configured public identity and role contacts", () => {
    expect(readPublicLegalContacts(readyConfig)).toEqual({
      legalEntityName: "UnionOps Services Inc.",
      privacyOfficerName: "Privacy Officer",
      privacyEmail: "privacy@example.ca",
      mailingAddress: "100 Main Street, Toronto, ON",
      securityEmail: "security@example.ca",
      accessibilityEmail: "accessibility@example.ca",
      privacyConfigured: true,
      securityConfigured: true,
      accessibilityConfigured: true,
      complete: true,
    });
  });

  it("does not treat missing fields or malformed addresses as complete", () => {
    const partial = readPublicLegalContacts({
      ...readyConfig,
      UNIONOPS_SECURITY_EMAIL: "person@example.ca?subject=unsafe",
      UNIONOPS_ACCESSIBILITY_EMAIL: " ",
    });
    expect(partial.securityEmail).toBeNull();
    expect(partial.accessibilityEmail).toBeNull();
    expect(partial.complete).toBe(false);
  });
});
