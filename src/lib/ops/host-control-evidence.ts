import {
  resolveAttachmentStorageMode,
  resolveS3StorageConfig,
} from "@/lib/attachments/storage";
import { isScannerConfigured } from "@/lib/attachments/scan";
import { readPublicLegalContacts } from "@/lib/legal/public-contacts";

/**
 * Operational evidence ages out after 90 days. This is an internal readiness
 * review interval, not a certification period or a legal retention rule.
 */
export const HOST_OPERATIONAL_EVIDENCE_MAX_AGE_DAYS = 90;

/** Non-secret reason codes for CapRover action cards (never emails/paths). */
export const HOST_EVIDENCE_GAP_CODES = [
  "approved_flag",
  "configured_flag",
  "review_date_or_owner",
  "review_stale",
  "storage_config",
  "scanner_url",
  "scanner_mode",
  "scanner_skip_allowed",
  "contacts_incomplete",
  "contacts_monitoring",
] as const;

export type HostEvidenceGapCode = (typeof HOST_EVIDENCE_GAP_CODES)[number];

export type HostedControlEvidence = {
  attachmentStorageApproved: boolean;
  attachmentStorageGaps: HostEvidenceGapCode[];
  strictUploadScan: boolean;
  strictUploadScanGaps: HostEvidenceGapCode[];
  backupRestoreEvidence: boolean;
  backupRestoreGaps: HostEvidenceGapCode[];
  alertDeliveryEvidence: boolean;
  alertDeliveryGaps: HostEvidenceGapCode[];
  publicLegalContacts: boolean;
  publicLegalContactsGaps: HostEvidenceGapCode[];
};

type EvidenceEnvironment = Record<string, string | undefined>;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

type EvidenceFreshness =
  | { ok: true }
  | { ok: false; gap: "review_date_or_owner" | "review_stale" };

function evidenceFreshness(
  dateValue: string | undefined,
  ownerValue: string | undefined,
  now: Date,
): EvidenceFreshness {
  const date = dateValue?.trim();
  const owner = ownerValue?.trim();
  if (!date || !owner || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, gap: "review_date_or_owner" };
  }

  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, gap: "review_date_or_owner" };
  }
  const normalized = new Date(timestamp).toISOString().slice(0, 10);
  if (normalized !== date) {
    return { ok: false, gap: "review_date_or_owner" };
  }

  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const ageDays = Math.floor((today - timestamp) / 86_400_000);
  if (ageDays < 0) {
    return { ok: false, gap: "review_date_or_owner" };
  }
  if (ageDays > HOST_OPERATIONAL_EVIDENCE_MAX_AGE_DAYS) {
    return { ok: false, gap: "review_stale" };
  }
  return { ok: true };
}

function hasApprovedStorageConfiguration(env: EvidenceEnvironment): boolean {
  if (resolveAttachmentStorageMode(env) === "s3") {
    try {
      const config = resolveS3StorageConfig(env);
      return (
        Boolean(env.ATTACHMENT_S3_REGION?.trim()) &&
        (config.serverSideEncryption === "AES256" ||
          (config.serverSideEncryption === "aws:kms" &&
            Boolean(config.kmsKeyId)))
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
 * Read booleans + non-secret gap codes for operator readiness.
 * Dates and reviewer identities stay in deployment configuration.
 */
export function readHostedControlEvidence(
  env: EvidenceEnvironment = process.env,
  now = new Date(),
): HostedControlEvidence {
  const scannerCanSkip = ["true", "1"].includes(
    env.ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR?.trim().toLowerCase() ?? "",
  );

  const attachmentStorageGaps: HostEvidenceGapCode[] = [];
  if (!enabled(env.UNIONOPS_ATTACHMENT_STORAGE_APPROVED)) {
    attachmentStorageGaps.push("approved_flag");
  }
  const attachmentReview = evidenceFreshness(
    env.UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT,
    env.UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY,
    now,
  );
  if (!attachmentReview.ok) attachmentStorageGaps.push(attachmentReview.gap);
  if (!hasApprovedStorageConfiguration(env)) {
    attachmentStorageGaps.push("storage_config");
  }

  const strictUploadScanGaps: HostEvidenceGapCode[] = [];
  if (!isScannerConfigured(env)) strictUploadScanGaps.push("scanner_url");
  if (env.ATTACHMENT_SCAN_MODE?.trim().toLowerCase() !== "strict") {
    strictUploadScanGaps.push("scanner_mode");
  }
  if (scannerCanSkip) strictUploadScanGaps.push("scanner_skip_allowed");
  const scanReview = evidenceFreshness(
    env.UNIONOPS_ATTACHMENT_SCAN_TESTED_AT,
    env.UNIONOPS_ATTACHMENT_SCAN_TESTED_BY,
    now,
  );
  if (!scanReview.ok) strictUploadScanGaps.push(scanReview.gap);

  const backupRestoreGaps: HostEvidenceGapCode[] = [];
  if (!enabled(env.UNIONOPS_BACKUP_CONFIGURED)) {
    backupRestoreGaps.push("configured_flag");
  }
  const backupReview = evidenceFreshness(
    env.UNIONOPS_BACKUP_RESTORE_TESTED_AT,
    env.UNIONOPS_BACKUP_OWNER,
    now,
  );
  if (!backupReview.ok) backupRestoreGaps.push(backupReview.gap);

  const alertDeliveryGaps: HostEvidenceGapCode[] = [];
  if (!enabled(env.UNIONOPS_ALERTS_CONFIGURED)) {
    alertDeliveryGaps.push("configured_flag");
  }
  const alertReview = evidenceFreshness(
    env.UNIONOPS_ALERT_DELIVERY_TESTED_AT,
    env.UNIONOPS_ALERT_OWNER,
    now,
  );
  if (!alertReview.ok) alertDeliveryGaps.push(alertReview.gap);

  const publicLegalContactsGaps: HostEvidenceGapCode[] = [];
  if (!readPublicLegalContacts(env).complete) {
    publicLegalContactsGaps.push("contacts_incomplete");
  }
  const contactsReview = evidenceFreshness(
    env.UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT,
    env.UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY,
    now,
  );
  if (!contactsReview.ok) {
    publicLegalContactsGaps.push(
      contactsReview.gap === "review_stale"
        ? "review_stale"
        : "contacts_monitoring",
    );
  }

  return {
    attachmentStorageApproved: attachmentStorageGaps.length === 0,
    attachmentStorageGaps,
    strictUploadScan: strictUploadScanGaps.length === 0,
    strictUploadScanGaps,
    backupRestoreEvidence: backupRestoreGaps.length === 0,
    backupRestoreGaps,
    alertDeliveryEvidence: alertDeliveryGaps.length === 0,
    alertDeliveryGaps,
    publicLegalContacts: publicLegalContactsGaps.length === 0,
    publicLegalContactsGaps,
  };
}

/** Passing evidence with empty gap lists (tests / ready hosts). */
export function readyHostedControlEvidence(
  overrides: Partial<HostedControlEvidence> = {},
): HostedControlEvidence {
  return {
    attachmentStorageApproved: true,
    attachmentStorageGaps: [],
    strictUploadScan: true,
    strictUploadScanGaps: [],
    backupRestoreEvidence: true,
    backupRestoreGaps: [],
    alertDeliveryEvidence: true,
    alertDeliveryGaps: [],
    publicLegalContacts: true,
    publicLegalContactsGaps: [],
    ...overrides,
  };
}

/** Failing evidence with representative gap codes (tests / memory hosts). */
export function emptyHostedControlEvidence(
  overrides: Partial<HostedControlEvidence> = {},
): HostedControlEvidence {
  return {
    attachmentStorageApproved: false,
    attachmentStorageGaps: ["approved_flag"],
    strictUploadScan: false,
    strictUploadScanGaps: ["scanner_url"],
    backupRestoreEvidence: false,
    backupRestoreGaps: ["configured_flag"],
    alertDeliveryEvidence: false,
    alertDeliveryGaps: ["configured_flag"],
    publicLegalContacts: false,
    publicLegalContactsGaps: ["contacts_incomplete"],
    ...overrides,
  };
}
