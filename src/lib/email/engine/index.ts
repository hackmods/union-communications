export type {
  EmailArtifact,
  EmailBlock,
  EmailBrandTokens,
  EmailChannel,
  EmailClassification,
  EmailDocumentInput,
  EmailFormat,
  EmailLocale,
  TransactionalPresetId,
} from "./types";
export { resolvePlatformEmailBrand } from "./design-tokens";
export { renderEmailDocument, composeSecurityNotice } from "./layout";
export { validateEmailArtifact } from "./validate";
export { EMAIL_ENGINE_FIXTURES } from "./fixtures";
export {
  composeInviteAcceptEmail,
  composeOfficerMeetingReminderEmail,
  composeCheckinNudgeEmail,
  composePasswordResetEmail,
  composeRsvpConfirmationEmail,
  composeSignInLinkEmail,
} from "./compose-transactional";
export {
  composeMarketingCampaignEmail,
  composeProductNewsConfirmEmail,
  composeProductNewsPreferencesEmail,
} from "./compose-marketing";
export { composeObservabilityCrisisAlert } from "./compose-observability-alert";
