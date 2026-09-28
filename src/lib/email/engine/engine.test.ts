import { describe, expect, it } from "vitest";
import {
  composeInviteAcceptEmail,
  composePasswordResetEmail,
  EMAIL_ENGINE_FIXTURES,
  renderEmailDocument,
  resolvePlatformEmailBrand,
  validateEmailArtifact,
} from "@/lib/email/engine";

describe("email engine layout", () => {
  it("renders multipart HTML with host-brand primary bar", () => {
    const brand = resolvePlatformEmailBrand();
    const artifact = renderEmailDocument({
      locale: "en",
      classification: "transactional",
      subject: "Test",
      blocks: [
        { type: "heading", text: "Hello" },
        { type: "paragraph", text: "Body line" },
        {
          type: "cta",
          label: "Open",
          href: "https://example.test/path",
        },
      ],
      brand,
    });
    expect(artifact.text).toContain("Hello");
    expect(artifact.text).toContain("https://example.test/path");
    expect(artifact.html).toContain("<!DOCTYPE html>");
    expect(artifact.html).toContain(brand.primaryColor);
    expect(artifact.html).toContain("Open");
    expect(validateEmailArtifact(artifact)).toEqual({ ok: true });
  });
});

describe("composeInviteAcceptEmail", () => {
  it("keeps early local setup wording and mailing-list disclaimer", () => {
    const officer = composeInviteAcceptEmail(EMAIL_ENGINE_FIXTURES.invite_accept);
    expect(officer.subject).toMatch(/Officer Hub/);
    expect(officer.text).toMatch(/early local setup/);
    expect(officer.text).toMatch(/not a mailing list/);
    expect(officer.html).toContain("Accept invite");

    const fr = composeInviteAcceptEmail({
      ...EMAIL_ENGINE_FIXTURES.invite_accept,
      locale: "fr",
    });
    expect(fr.subject).toMatch(/Hub des dirigeant/);
    expect(fr.html).toContain('lang="fr"');
  });
});

describe("composePasswordResetEmail", () => {
  it("uses security classification footer", () => {
    const copy = composePasswordResetEmail(EMAIL_ENGINE_FIXTURES.password_reset);
    expect(copy.subject).toMatch(/password/);
    expect(copy.text).toMatch(/mailing list/);
    expect(copy.html).toContain(EMAIL_ENGINE_FIXTURES.password_reset.resetUrl);
  });
});
