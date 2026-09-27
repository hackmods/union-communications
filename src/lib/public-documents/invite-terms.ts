import { hasPublishedContractDocument } from "@/lib/public-documents/contract-routes";
import { publicDocumentBySlug } from "@/lib/public-documents/database";

export type InviteTermsVersion = {
  versionId: string;
  versionLabel: string;
  title: string;
};

/** Exact currently effective Terms version shown during account activation. */
export async function currentInviteTermsVersion(
  locale: string,
): Promise<InviteTermsVersion | null> {
  const document = await publicDocumentBySlug("terms", locale);
  if (
    !document ||
    "unpublished" in document ||
    !hasPublishedContractDocument(document)
  ) {
    return null;
  }
  return {
    versionId: document.versionId,
    versionLabel: document.document.version ?? document.versionId,
    title: document.document.title,
  };
}
