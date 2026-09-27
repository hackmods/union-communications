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
  };
}

describe("readHostedControlEvidence", () => {
  it("accepts explicit storage and current operator evidence", () => {
    expect(readHostedControlEvidence(readyEnvironment(), TODAY)).toEqual({
      attachmentStorageApproved: true,
      strictUploadScan: true,
      backupRestoreEvidence: true,
      alertDeliveryEvidence: true,
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
  });
});
