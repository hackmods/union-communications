import {
  resolveAttachmentStorageMode,
  resolveS3StorageConfig,
} from "@/lib/attachments/storage";
import { isScannerConfigured } from "@/lib/attachments/scan";

/**
 * Operational evidence ages out after 90 days. This is an internal readiness
 * review interval, not a certification period or a legal retention rule.
 */
export const HOST_OPERATIONAL_EVIDENCE_MAX_AGE_DAYS = 90;

export type HostedControlEvidence = {
  attachmentStorageApproved: boolean;
  strictUploadScan: boolean;
  backupRestoreEvidence: boolean;
  alertDeliveryEvidence: boolean;
};

type EvidenceEnvironment = Record<string, string | undefined>;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function hasCurrentEvidence(
  dateValue: string | undefined,
  ownerValue: string | undefined,
  now: Date,
): boolean {
  const date = dateValue?.trim();
  const owner = ownerValue?.trim();
  if (!date || !owner || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return false;
  const normalized = new Date(timestamp).toISOString().slice(0, 10);
  if (normalized !== date) return false;

  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const ageDays = Math.floor((today - timestamp) / 86_400_000);
  return ageDays >= 0 && ageDays <= HOST_OPERATIONAL_EVIDENCE_MAX_AGE_DAYS;
}

function hasApprovedStorageConfiguration(env: EvidenceEnvironment): boolean {
  if (resolveAttachmentStorageMode(env) === "s3") {
    try {
      const config = resolveS3StorageConfig(env);
      return (
        Boolean(env.ATTACHMENT_S3_REGION?.trim()) &&
        config.serverSideEncryption === "AES256"
      );
    } catch {
      return false;
    }
  }

  // A local path must be explicit so an ephemeral container default cannot
  // silently pass as the reviewed persistent volume.
  return Boolean(env.ATTACHMENT_LOCAL_DIR?.trim());
}

/**
 * Read booleans for operator-authenticated health/readiness requests. Dates and
 * reviewer identities stay in deployment configuration; these flags are
 * operator attestations and do not independently verify provider behavior,
 * backup jobs, or alert delivery.
 */
export function readHostedControlEvidence(
  env: EvidenceEnvironment = process.env,
  now = new Date(),
): HostedControlEvidence {
  const scannerCanSkip = ["true", "1"].includes(
    env.ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR?.trim().toLowerCase() ?? "",
  );

  return {
    attachmentStorageApproved:
      enabled(env.UNIONOPS_ATTACHMENT_STORAGE_APPROVED) &&
      hasCurrentEvidence(
        env.UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT,
        env.UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY,
        now,
      ) &&
      hasApprovedStorageConfiguration(env),
    strictUploadScan:
      isScannerConfigured(env) &&
      env.ATTACHMENT_SCAN_MODE?.trim().toLowerCase() === "strict" &&
      !scannerCanSkip &&
      hasCurrentEvidence(
        env.UNIONOPS_ATTACHMENT_SCAN_TESTED_AT,
        env.UNIONOPS_ATTACHMENT_SCAN_TESTED_BY,
        now,
      ),
    backupRestoreEvidence:
      enabled(env.UNIONOPS_BACKUP_CONFIGURED) &&
      hasCurrentEvidence(
        env.UNIONOPS_BACKUP_RESTORE_TESTED_AT,
        env.UNIONOPS_BACKUP_OWNER,
        now,
      ),
    alertDeliveryEvidence:
      enabled(env.UNIONOPS_ALERTS_CONFIGURED) &&
      hasCurrentEvidence(
        env.UNIONOPS_ALERT_DELIVERY_TESTED_AT,
        env.UNIONOPS_ALERT_OWNER,
        now,
      ),
  };
}
