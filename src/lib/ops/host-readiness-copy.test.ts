import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import { HOST_EVIDENCE_GAP_CODES } from "@/lib/ops/host-control-evidence";
import {
  HOST_ACTION_IDS,
  buildHostActions,
} from "@/lib/ops/host-readiness-actions";
import {
  HOST_ACTION_CONSEQUENCE_KEYS,
  HOST_ACTION_TITLE_KEYS,
  HOST_GAP_KEYS,
} from "@/lib/ops/host-readiness-copy";
import type { HealthStatus } from "@/lib/ops/health-status";
import { emptyHostedControlEvidence } from "@/lib/ops/host-control-evidence";
import { memoryDatabaseBootAttestation } from "@/lib/ops/database-boot";

function platformOperator(locale: "en" | "fr"): Record<string, unknown> {
  const root = locale === "en" ? en : fr;
  return (root as { hub: { platformOperator: Record<string, unknown> } }).hub
    .platformOperator;
}

function stubHealth(): HealthStatus {
  return {
    status: "ok",
    version: "0.1.0",
    commit: "abc",
    builtAt: "2026-09-30T00:00:00Z",
    backends: {} as HealthStatus["backends"],
    postgresConfigured: true,
    memoryCaseDataActive: false,
    postgresFlipComplete: true,
    emailEnabled: true,
    accessRequestNotifyConfigured: true,
    cronConfigured: true,
    mfaEnabled: true,
    mfaMode: "totp",
    totpEncryptionConfigured: true,
    mfaOperatorBypassConfigured: false,
    mfaDurableFallbackRecent: false,
    hostedCustomerMode: true,
    demoAuthEnabled: false,
    hostedControlEvidence: emptyHostedControlEvidence(),
    observability: {
      backend: "noop",
      storeEnabled: false,
      fileDualWrite: false,
      sentryEnabled: false,
      sentryClientEnabled: false,
      errorLogFileEnabled: false,
      sentryMisconfigured: false,
      errorLogFileMisconfigured: false,
      sentryClientServerMismatch: false,
    },
    databaseDeployment: {
      ...memoryDatabaseBootAttestation(),
      mode: "postgres",
      verified: true,
    },
    tenantRegistry: { unionCount: 1, seeded: true },
  };
}

describe("host readiness catalog ↔ i18n", () => {
  it("covers every HostActionId with title + consequence keys in EN and FR", () => {
    const enOps = platformOperator("en");
    const frOps = platformOperator("fr");
    const missing: string[] = [];

    for (const id of HOST_ACTION_IDS) {
      const titleKey = HOST_ACTION_TITLE_KEYS[id];
      const consequenceKey = HOST_ACTION_CONSEQUENCE_KEYS[id];
      if (typeof enOps[titleKey] !== "string") {
        missing.push(`en missing ${titleKey} for ${id}`);
      }
      if (typeof frOps[titleKey] !== "string") {
        missing.push(`fr missing ${titleKey} for ${id}`);
      }
      if (typeof enOps[consequenceKey] !== "string") {
        missing.push(`en missing ${consequenceKey} for ${id}`);
      }
      if (typeof frOps[consequenceKey] !== "string") {
        missing.push(`fr missing ${consequenceKey} for ${id}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("covers every evidence gap code with hostGap* keys in EN and FR", () => {
    const enOps = platformOperator("en");
    const frOps = platformOperator("fr");
    const missing: string[] = [];

    for (const code of HOST_EVIDENCE_GAP_CODES) {
      const key = HOST_GAP_KEYS[code];
      if (typeof enOps[key] !== "string") missing.push(`en missing ${key}`);
      if (typeof frOps[key] !== "string") missing.push(`fr missing ${key}`);
    }

    expect(missing).toEqual([]);
  });

  it("buildHostActions emits exactly the HOST_ACTION_IDS catalog", () => {
    const ids = buildHostActions(stubHealth()).map((a) => a.id).sort();
    expect(ids).toEqual([...HOST_ACTION_IDS].sort());
  });
});
