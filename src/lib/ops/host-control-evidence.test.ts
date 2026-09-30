import { describe, expect, it } from "vitest";
import { readHostedControlEvidence } from "@/lib/ops/host-control-evidence";

const TODAY = new Date("2026-09-27T12:00:00.000Z");

function readyEnvironment(): Record<string, string> {
  return {
    ATTACHMENT_STORAGE: "local",
    ATTACHMENT_LOCAL_DIR: "/data/attachments",
    UNIONOPS_ATTACHMENT_STORAGE_APPROVED: "true",
    UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT: "2026-09-01",
    UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY: "security-owner",
    ATTACHMENT_SCANNER_URL: "http://scanner.internal",
    ATTACHMENT_SCAN_MODE: "strict",
    ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR: "false",
    UNIONOPS_ATTACHMENT_SCAN_TESTED_AT: "2026-09-01",
    UNIONOPS_ATTACHMENT_SCAN_TESTED_BY: "security-owner",
    UNIONOPS_BACKUP_CONFIGURED: "true",
    UNIONOPS_BACKUP_RESTORE_TESTED_AT: "2026-09-01",
    UNIONOPS_BACKUP_OWNER: "operations-owner",
    UNIONOPS_ALERTS_CONFIGURED: "true",
    UNIONOPS_ALERT_DELIVERY_TESTED_AT: "2026-09-01",
    UNIONOPS_ALERT_OWNER: "operations-owner",
    UNIONOPS_LEGAL_ENTITY_NAME: "UnionOps Services Inc.",
    UNIONOPS_PRIVACY_OFFICER_NAME: "Privacy Officer",
    UNIONOPS_PRIVACY_EMAIL: "privacy@example.ca",
    UNIONOPS_PRIVACY_MAILING_ADDRESS: "100 Main Street, Toronto, ON",
    UNIONOPS_SECURITY_EMAIL: "security@example.ca",
    UNIONOPS_ACCESSIBILITY_EMAIL: "accessibility@example.ca",
    UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT: "2026-09-01",
    UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY: "privacy-owner",
  };
}

describe("readHostedControlEvidence", () => {
  it("accepts explicit storage and current operator evidence", () => {
    expect(readHostedControlEvidence(readyEnvironment(), TODAY)).toEqual({
      attachmentStorageApproved: true,
      strictUploadScan: true,
      backupRestoreEvidence: true,
      alertDeliveryEvidence: true,
      publicLegalContacts: true,
    });
  });

  it("rejects storage defaults, skip-on-error, and stale or invalid evidence", () => {
    const env = readyEnvironment();
    delete env.ATTACHMENT_LOCAL_DIR;
    env.ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR = "true";
    env.UNIONOPS_BACKUP_RESTORE_TESTED_AT = "2026-01-01";
    env.UNIONOPS_ALERT_DELIVERY_TESTED_AT = "2026-02-31";

    expect(readHostedControlEvidence(env, TODAY)).toEqual({
      attachmentStorageApproved: false,
      strictUploadScan: false,
      backupRestoreEvidence: false,
      alertDeliveryEvidence: false,
      publicLegalContacts: true,
    });
  });

  it("requires an explicit S3 region and server-side encryption", () => {
    const env: Record<string, string> = {
      ATTACHMENT_STORAGE: "s3",
      ATTACHMENT_S3_BUCKET: "private-files",
      ATTACHMENT_S3_ACCESS_KEY_ID: "key",
      ATTACHMENT_S3_SECRET_ACCESS_KEY: "secret",
      ATTACHMENT_S3_REGION: "ca-central-1",
      ATTACHMENT_S3_SSE: "AES256",
      UNIONOPS_ATTACHMENT_STORAGE_APPROVED: "true",
      UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT: "2026-09-01",
      UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY: "security-owner",
    };
    expect(readHostedControlEvidence(env, TODAY).attachmentStorageApproved).toBe(
      true,
    );

    env.ATTACHMENT_S3_SSE = "none";
    expect(readHostedControlEvidence(env, TODAY).attachmentStorageApproved).toBe(
      false,
    );

    env.ATTACHMENT_S3_SSE = "aws:kms";
    env.ATTACHMENT_S3_KMS_KEY_ID = "arn:aws:kms:ca-central-1:123:key/abc";
    expect(readHostedControlEvidence(env, TODAY).attachmentStorageApproved).toBe(
      true,
    );
  });

  it("requires complete public contacts and a recent monitored-address review", () => {
    const env = readyEnvironment();
    delete env.UNIONOPS_PRIVACY_EMAIL;
    expect(readHostedControlEvidence(env, TODAY).publicLegalContacts).toBe(false);

    env.UNIONOPS_PRIVACY_EMAIL = "privacy@example.ca";
    env.UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT = "2026-01-01";
    expect(readHostedControlEvidence(env, TODAY).publicLegalContacts).toBe(false);

    env.UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT = "2026-09-01";
    expect(readHostedControlEvidence(env, TODAY).publicLegalContacts).toBe(true);
  });
});
