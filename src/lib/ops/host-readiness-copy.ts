/**
 * EN/FR key maps for Host readiness action cards.
 * Keep in sync with {@link HOST_ACTION_IDS} / {@link HOST_EVIDENCE_GAP_CODES}.
 * Guard: `host-readiness-copy.test.ts`.
 */

import type { HostEvidenceGapCode } from "@/lib/ops/host-control-evidence";
import type { HostActionId } from "@/lib/ops/host-readiness-actions";

export const HOST_ACTION_TITLE_KEYS: Record<HostActionId, string> = {
  postgresConfigured: "hostPresencePostgres",
  migrateVerified: "hostPresenceMigrate",
  tenantsSeeded: "hostPresenceTenantsSeeded",
  emailEnabled: "hostPresenceEmail",
  accessRequestNotify: "hostPresenceAccessRequestNotify",
  cronConfigured: "hostPresenceCron",
  mfaEnabled: "hostPresenceMfa",
  totpEncryptionConfigured: "hostPresenceTotpEncryption",
  mfaOperatorBypassOff: "hostPresenceMfaOperatorBypass",
  mfaDurableStoreHealthy: "hostPresenceMfaDurableStore",
  demoAuthOff: "hostPresenceDemoAuth",
  attachmentStorageApproved: "hostPresenceAttachmentStorage",
  strictUploadScan: "hostPresenceStrictScan",
  backupRestoreEvidence: "hostPresenceBackupRestore",
  alertDeliveryEvidence: "hostPresenceAlertDelivery",
  publicLegalContacts: "hostPresencePublicLegalContacts",
  publicDocumentsReady: "hostPresencePublicDocuments",
  hostedPlansDarkLaunch: "hostPresenceHostedPlans",
};

export const HOST_ACTION_CONSEQUENCE_KEYS: Record<HostActionId, string> = {
  postgresConfigured: "hostActionConsequencePostgres",
  migrateVerified: "hostActionConsequenceMigrate",
  tenantsSeeded: "hostActionConsequenceTenantsSeeded",
  emailEnabled: "hostActionConsequenceEmail",
  accessRequestNotify: "hostActionConsequenceAccessRequestNotify",
  cronConfigured: "hostActionConsequenceCron",
  mfaEnabled: "hostActionConsequenceMfa",
  totpEncryptionConfigured: "hostActionConsequenceTotpEncryption",
  mfaOperatorBypassOff: "hostActionConsequenceMfaOperatorBypass",
  mfaDurableStoreHealthy: "hostActionConsequenceMfaDurableStore",
  demoAuthOff: "hostActionConsequenceDemoAuth",
  attachmentStorageApproved: "hostActionConsequenceAttachmentStorage",
  strictUploadScan: "hostActionConsequenceStrictScan",
  backupRestoreEvidence: "hostActionConsequenceBackupRestore",
  alertDeliveryEvidence: "hostActionConsequenceAlertDelivery",
  publicLegalContacts: "hostActionConsequencePublicLegalContacts",
  publicDocumentsReady: "hostActionConsequencePublicDocuments",
  hostedPlansDarkLaunch: "hostActionConsequenceHostedPlans",
};

export const HOST_GAP_KEYS: Record<HostEvidenceGapCode, string> = {
  approved_flag: "hostGapApprovedFlag",
  configured_flag: "hostGapConfiguredFlag",
  review_date_or_owner: "hostGapReviewDateOrOwner",
  review_stale: "hostGapReviewStale",
  storage_config: "hostGapStorageConfig",
  scanner_url: "hostGapScannerUrl",
  scanner_mode: "hostGapScannerMode",
  scanner_skip_allowed: "hostGapScannerSkipAllowed",
  contacts_incomplete: "hostGapContactsIncomplete",
  contacts_monitoring: "hostGapContactsMonitoring",
};
