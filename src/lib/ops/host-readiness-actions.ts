/**
 * CapRover action catalog for Host readiness — env key names + safe placeholders only.
 */

import type { HealthStatus } from "@/lib/ops/health-status";
import type { HostEvidenceGapCode } from "@/lib/ops/host-control-evidence";

export type HostActionSeverity = "blocking" | "advisory";
export type HostActionGroup =
  | "runtime"
  | "attestation"
  | "backend"
  | "opsSignal";

export type HostEnvKeyRole = "required" | "supporting";

export type HostEnvKeyHint = {
  name: string;
  role: HostEnvKeyRole;
  /** Literal format cue shown beside the key (never a live secret). */
  formatHint: string;
};

export const HOST_ACTION_IDS = [
  "postgresConfigured",
  "migrateVerified",
  "tenantsSeeded",
  "emailEnabled",
  "accessRequestNotify",
  "cronConfigured",
  "mfaEnabled",
  "totpEncryptionConfigured",
  "mfaOperatorBypassOff",
  "mfaDurableStoreHealthy",
  "demoAuthOff",
  "attachmentStorageApproved",
  "strictUploadScan",
  "backupRestoreEvidence",
  "alertDeliveryEvidence",
  "publicLegalContacts",
  "publicDocumentsReady",
  "hostedPlansDarkLaunch",
] as const;

export type HostActionId = (typeof HOST_ACTION_IDS)[number];

export type HostAction = {
  id: HostActionId;
  severity: HostActionSeverity;
  ok: boolean;
  group: HostActionGroup;
  envKeys: HostEnvKeyHint[];
  gapCodes: HostEvidenceGapCode[];
  commandHint?: string;
  /** CapRover App Config lines with safe placeholders (no live values). */
  caproverBlock: string;
};

function lines(entries: Array<[string, string]>): string {
  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

function advisoryUnlessHosted(hostedCustomerMode: boolean): HostActionSeverity {
  return hostedCustomerMode ? "blocking" : "advisory";
}

/**
 * Build operator actions from live health + evidence gap codes.
 * Secrets never appear — only key names and placeholders.
 */
export function buildHostActions(health: HealthStatus): HostAction[] {
  const evidence = health.hostedControlEvidence;
  const hosted = health.hostedCustomerMode;

  const migrateVerified =
    health.postgresConfigured &&
    health.databaseDeployment.mode === "postgres" &&
    health.databaseDeployment.verified;

  const tenantsSeeded =
    !health.postgresConfigured || health.tenantRegistry.seeded !== false;

  const actions: HostAction[] = [
    {
      id: "postgresConfigured",
      severity: "blocking",
      ok: health.postgresConfigured,
      group: "runtime",
      envKeys: [
        {
          name: "DATABASE_URL",
          role: "required",
          formatHint: "postgres://USER:PASS@HOST:5432/DB",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([
        ["DATABASE_URL", "postgres://USER:PASS@HOST:5432/DB"],
      ]),
    },
    {
      id: "migrateVerified",
      severity: "blocking",
      ok: migrateVerified,
      group: "runtime",
      envKeys: [
        {
          name: "MIGRATE_DATABASE_URL",
          role: "required",
          formatHint: "postgres://OWNER:PASS@HOST:5432/DB",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([
        ["MIGRATE_DATABASE_URL", "postgres://OWNER:PASS@HOST:5432/DB"],
      ]),
    },
    {
      id: "tenantsSeeded",
      severity: "blocking",
      ok: tenantsSeeded,
      group: "runtime",
      envKeys: [],
      gapCodes: [],
      commandHint: "npm run db:seed",
      caproverBlock: "# One-shot after migrate — not an App Config key\n# npm run db:seed\n# or scripts/caprover-bootstrap-seed.sh",
    },
    {
      id: "emailEnabled",
      severity: "advisory",
      ok: health.emailEnabled,
      group: "opsSignal",
      envKeys: [
        { name: "EMAIL_ENABLED", role: "required", formatHint: "true" },
      ],
      gapCodes: [],
      caproverBlock: lines([["EMAIL_ENABLED", "true"]]),
    },
    {
      id: "accessRequestNotify",
      severity: "advisory",
      ok:
        !health.emailEnabled || Boolean(health.accessRequestNotifyConfigured),
      group: "opsSignal",
      envKeys: [
        {
          name: "ACCESS_REQUEST_NOTIFY_EMAIL",
          role: "required",
          formatHint: "ops@union.example",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([
        ["ACCESS_REQUEST_NOTIFY_EMAIL", "ops@union.example"],
      ]),
    },
    {
      id: "cronConfigured",
      severity: "advisory",
      ok: health.cronConfigured,
      group: "opsSignal",
      envKeys: [
        {
          name: "CRON_SECRET",
          role: "required",
          formatHint: "long-random-secret",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([["CRON_SECRET", "long-random-secret"]]),
    },
    {
      id: "mfaEnabled",
      severity: advisoryUnlessHosted(hosted),
      ok:
        health.mfaEnabled &&
        (!hosted || health.mfaMode === "totp"),
      group: "runtime",
      envKeys: hosted
        ? [
            {
              name: "UNIONOPS_HOSTED_CUSTOMER_MODE",
              role: "required",
              formatHint: "true",
            },
            {
              name: "AUTH_MFA_ENABLED",
              role: "required",
              formatHint: "true",
            },
            {
              name: "AUTH_MFA_MODE",
              role: "required",
              formatHint: "totp",
            },
            {
              name: "NODE_ENV",
              role: "supporting",
              formatHint: "production",
            },
          ]
        : [
            {
              name: "AUTH_MFA_ENABLED",
              role: "required",
              formatHint: "true",
            },
            {
              name: "AUTH_MFA_MODE",
              role: "supporting",
              formatHint: "totp",
            },
          ],
      gapCodes: [],
      caproverBlock: hosted
        ? lines([
            ["UNIONOPS_HOSTED_CUSTOMER_MODE", "true"],
            ["AUTH_MFA_ENABLED", "true"],
            ["AUTH_MFA_MODE", "totp"],
            ["NODE_ENV", "production"],
          ])
        : lines([
            ["AUTH_MFA_ENABLED", "true"],
            ["AUTH_MFA_MODE", "totp"],
          ]),
    },
    {
      id: "totpEncryptionConfigured",
      severity: advisoryUnlessHosted(hosted),
      ok: !hosted || health.totpEncryptionConfigured,
      group: "runtime",
      envKeys: [
        {
          name: "AUTH_TOTP_ENCRYPTION_KEY",
          role: "required",
          formatHint: "base64-32-byte-key",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([
        ["AUTH_TOTP_ENCRYPTION_KEY", "base64-32-byte-key"],
      ]),
    },
    {
      id: "mfaOperatorBypassOff",
      severity: "advisory",
      ok: !health.mfaOperatorBypassConfigured,
      group: "opsSignal",
      envKeys: [
        {
          name: "AUTH_MFA_OPERATOR_BYPASS_EMAILS",
          role: "required",
          formatHint: "(clear after recovery)",
        },
      ],
      gapCodes: [],
      caproverBlock:
        "# Clear this key after MFA recovery — leave unset in CapRover\n# AUTH_MFA_OPERATOR_BYPASS_EMAILS=",
    },
    {
      id: "mfaDurableStoreHealthy",
      severity: "advisory",
      ok: !health.mfaDurableFallbackRecent,
      group: "opsSignal",
      envKeys: [
        {
          name: "AUTH_USERS_BACKEND",
          role: "supporting",
          formatHint: "postgres",
        },
        {
          name: "DATABASE_URL",
          role: "supporting",
          formatHint: "postgres://USER:PASS@HOST:5432/DB",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([
        ["AUTH_USERS_BACKEND", "postgres"],
        ["DATABASE_URL", "postgres://USER:PASS@HOST:5432/DB"],
      ]),
    },
    {
      id: "demoAuthOff",
      severity: "blocking",
      ok: !health.demoAuthEnabled,
      group: "runtime",
      envKeys: [
        {
          name: "AUTH_ALLOW_DEMO_USERS",
          role: "required",
          formatHint: "false",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([["AUTH_ALLOW_DEMO_USERS", "false"]]),
    },
    {
      id: "attachmentStorageApproved",
      severity: advisoryUnlessHosted(hosted),
      ok: evidence.attachmentStorageApproved,
      group: "attestation",
      gapCodes: evidence.attachmentStorageGaps,
      envKeys: [
        {
          name: "UNIONOPS_ATTACHMENT_STORAGE_APPROVED",
          role: "required",
          formatHint: "true",
        },
        {
          name: "UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT",
          role: "required",
          formatHint: "YYYY-MM-DD",
        },
        {
          name: "UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY",
          role: "required",
          formatHint: "ops@union.example",
        },
        {
          name: "ATTACHMENT_STORAGE",
          role: "supporting",
          formatHint: "local|s3",
        },
        {
          name: "ATTACHMENT_LOCAL_DIR",
          role: "supporting",
          formatHint: "/data/attachments",
        },
        {
          name: "ATTACHMENT_S3_BUCKET",
          role: "supporting",
          formatHint: "bucket-name",
        },
        {
          name: "ATTACHMENT_S3_REGION",
          role: "supporting",
          formatHint: "ca-central-1",
        },
        {
          name: "ATTACHMENT_S3_SSE",
          role: "supporting",
          formatHint: "AES256",
        },
      ],
      caproverBlock: lines([
        ["UNIONOPS_ATTACHMENT_STORAGE_APPROVED", "true"],
        ["UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT", "YYYY-MM-DD"],
        ["UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY", "ops@union.example"],
        ["ATTACHMENT_STORAGE", "local"],
        ["ATTACHMENT_LOCAL_DIR", "/data/attachments"],
      ]),
    },
    {
      id: "strictUploadScan",
      severity: advisoryUnlessHosted(hosted),
      ok: evidence.strictUploadScan,
      group: "attestation",
      gapCodes: evidence.strictUploadScanGaps,
      envKeys: [
        {
          name: "ATTACHMENT_SCANNER_URL",
          role: "required",
          formatHint: "http://scanner:8080",
        },
        {
          name: "ATTACHMENT_SCAN_MODE",
          role: "required",
          formatHint: "strict",
        },
        {
          name: "ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR",
          role: "required",
          formatHint: "false",
        },
        {
          name: "UNIONOPS_ATTACHMENT_SCAN_TESTED_AT",
          role: "required",
          formatHint: "YYYY-MM-DD",
        },
        {
          name: "UNIONOPS_ATTACHMENT_SCAN_TESTED_BY",
          role: "required",
          formatHint: "ops@union.example",
        },
      ],
      caproverBlock: lines([
        ["ATTACHMENT_SCANNER_URL", "http://scanner:8080"],
        ["ATTACHMENT_SCAN_MODE", "strict"],
        ["ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR", "false"],
        ["UNIONOPS_ATTACHMENT_SCAN_TESTED_AT", "YYYY-MM-DD"],
        ["UNIONOPS_ATTACHMENT_SCAN_TESTED_BY", "ops@union.example"],
      ]),
    },
    {
      id: "backupRestoreEvidence",
      severity: advisoryUnlessHosted(hosted),
      ok: evidence.backupRestoreEvidence,
      group: "attestation",
      gapCodes: evidence.backupRestoreGaps,
      envKeys: [
        {
          name: "UNIONOPS_BACKUP_CONFIGURED",
          role: "required",
          formatHint: "true",
        },
        {
          name: "UNIONOPS_BACKUP_RESTORE_TESTED_AT",
          role: "required",
          formatHint: "YYYY-MM-DD",
        },
        {
          name: "UNIONOPS_BACKUP_OWNER",
          role: "required",
          formatHint: "ops@union.example",
        },
      ],
      caproverBlock: lines([
        ["UNIONOPS_BACKUP_CONFIGURED", "true"],
        ["UNIONOPS_BACKUP_RESTORE_TESTED_AT", "YYYY-MM-DD"],
        ["UNIONOPS_BACKUP_OWNER", "ops@union.example"],
      ]),
    },
    {
      id: "alertDeliveryEvidence",
      severity: advisoryUnlessHosted(hosted),
      ok: evidence.alertDeliveryEvidence,
      group: "attestation",
      gapCodes: evidence.alertDeliveryGaps,
      envKeys: [
        {
          name: "UNIONOPS_ALERTS_CONFIGURED",
          role: "required",
          formatHint: "true",
        },
        {
          name: "UNIONOPS_ALERT_DELIVERY_TESTED_AT",
          role: "required",
          formatHint: "YYYY-MM-DD",
        },
        {
          name: "UNIONOPS_ALERT_OWNER",
          role: "required",
          formatHint: "ops@union.example",
        },
        {
          name: "DEPLOY_NOTIFY_EMAIL",
          role: "supporting",
          formatHint: "ops@union.example",
        },
        {
          name: "OPS_NOTIFY_ON_DEPLOY",
          role: "supporting",
          formatHint: "true",
        },
        {
          name: "OPS_NOTIFY_ON_RESTART",
          role: "supporting",
          formatHint: "true",
        },
        {
          name: "OPS_NOTIFY_RESTART_COOLDOWN_MINUTES",
          role: "supporting",
          formatHint: "15",
        },
      ],
      caproverBlock: lines([
        ["UNIONOPS_ALERTS_CONFIGURED", "true"],
        ["UNIONOPS_ALERT_DELIVERY_TESTED_AT", "YYYY-MM-DD"],
        ["UNIONOPS_ALERT_OWNER", "ops@union.example"],
        ["DEPLOY_NOTIFY_EMAIL", "ops@union.example"],
        ["OPS_NOTIFY_ON_DEPLOY", "true"],
        ["OPS_NOTIFY_ON_RESTART", "true"],
        ["OPS_NOTIFY_RESTART_COOLDOWN_MINUTES", "15"],
      ]),
    },
    {
      id: "publicLegalContacts",
      severity: advisoryUnlessHosted(hosted),
      ok: evidence.publicLegalContacts,
      group: "attestation",
      gapCodes: evidence.publicLegalContactsGaps,
      envKeys: [
        {
          name: "UNIONOPS_LEGAL_ENTITY_NAME",
          role: "required",
          formatHint: "Legal entity name",
        },
        {
          name: "UNIONOPS_PRIVACY_OFFICER_NAME",
          role: "required",
          formatHint: "Privacy Officer",
        },
        {
          name: "UNIONOPS_PRIVACY_EMAIL",
          role: "required",
          formatHint: "privacy@union.example",
        },
        {
          name: "UNIONOPS_PRIVACY_MAILING_ADDRESS",
          role: "required",
          formatHint: "Street, City, Province",
        },
        {
          name: "UNIONOPS_SECURITY_EMAIL",
          role: "required",
          formatHint: "security@union.example",
        },
        {
          name: "UNIONOPS_ACCESSIBILITY_EMAIL",
          role: "required",
          formatHint: "accessibility@union.example",
        },
        {
          name: "UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT",
          role: "required",
          formatHint: "YYYY-MM-DD",
        },
        {
          name: "UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY",
          role: "required",
          formatHint: "ops@union.example",
        },
      ],
      caproverBlock: lines([
        ["UNIONOPS_LEGAL_ENTITY_NAME", "Legal entity name"],
        ["UNIONOPS_PRIVACY_OFFICER_NAME", "Privacy Officer"],
        ["UNIONOPS_PRIVACY_EMAIL", "privacy@union.example"],
        ["UNIONOPS_PRIVACY_MAILING_ADDRESS", "Street, City, Province"],
        ["UNIONOPS_SECURITY_EMAIL", "security@union.example"],
        ["UNIONOPS_ACCESSIBILITY_EMAIL", "accessibility@union.example"],
        ["UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT", "YYYY-MM-DD"],
        ["UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY", "ops@union.example"],
      ]),
    },
    {
      id: "publicDocumentsReady",
      severity: "blocking",
      ok: health.publicDocuments?.ready ?? true,
      group: "runtime",
      envKeys: [
        {
          name: "PUBLIC_DOCUMENTS_REQUIRE_READY",
          role: "supporting",
          formatHint: "true",
        },
      ],
      gapCodes: [],
      caproverBlock: lines([["PUBLIC_DOCUMENTS_REQUIRE_READY", "true"]]),
    },
    {
      id: "hostedPlansDarkLaunch",
      severity: "advisory",
      // Dark (false) is the correct default — card stays visible with CapRover copy.
      ok: health.hostedPlansEnabled,
      group: "opsSignal",
      envKeys: [
        {
          name: "UNIONOPS_HOSTED_PLANS_ENABLED",
          role: "required",
          formatHint: "false",
        },
      ],
      gapCodes: [],
      caproverBlock: [
        "# Hosted Free/Full caps — leave false until Site Admin assigns plans",
        "UNIONOPS_HOSTED_PLANS_ENABLED=false",
        "# UNIONOPS_HOSTED_PLANS_ENABLED=true",
      ].join("\n"),
    },
  ];

  return actions;
}

/** CapRover paste block for missing backend flips (one KEY=postgres per line). */
export function formatBackendFlipCaproverBlock(
  rows: Array<{ key: string; recommended: string }>,
): string {
  return rows.map((row) => `${row.key}=${row.recommended}`).join("\n");
}
