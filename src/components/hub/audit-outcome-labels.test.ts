import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const OUTCOMES = ["title", "success", "denied", "error", "unknown"] as const;

describe("hub.auditOutcome i18n", () => {
  it("defines every outcome label used by AuditLogClient in EN and FR", () => {
    const enOut = en.hub.auditOutcome as Record<string, string>;
    const frOut = fr.hub.auditOutcome as Record<string, string>;
    for (const key of OUTCOMES) {
      expect(enOut[key], `en hub.auditOutcome.${key}`).toMatch(/\S/);
      expect(frOut[key], `fr hub.auditOutcome.${key}`).toMatch(/\S/);
      expect(enOut[key]).not.toMatch(/^hub\.auditOutcome/);
      expect(frOut[key]).not.toMatch(/^hub\.auditOutcome/);
    }
  });
});
