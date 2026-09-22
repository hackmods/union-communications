export const ACCESS_REQUEST_KINDS = ["local_interest", "member_access"] as const;
export type AccessRequestKind = (typeof ACCESS_REQUEST_KINDS)[number];
export const ACCESS_REQUEST_STATUSES = ["new", "reviewing", "approved", "invited", "completed", "declined"] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];
export const ACCESS_REQUEST_OFFERINGS = ["officer_hub", "local_portal"] as const;
export type AccessRequestOffering = (typeof ACCESS_REQUEST_OFFERINGS)[number];
export type AccessRequestReviewEvent = { at: string; userId: string; status?: AccessRequestStatus; note?: string };
export interface AccessRequest {
  id: string; submissionKey: string; kind: AccessRequestKind; name: string; email: string;
  unionName: string; localName: string; role?: string; offerings: AccessRequestOffering[];
  message?: string; locale: "en" | "fr"; consentAcceptedAt: string; createdAt: string;
  status: AccessRequestStatus; unionId?: string; localId?: string; privateNote?: string;
  reviewedById?: string; inviteId?: string; receiptSentAt?: string; notifySentAt?: string; notificationError?: string; reviewHistory: AccessRequestReviewEvent[];
}
export type NewAccessRequest = Pick<AccessRequest, "submissionKey" | "kind" | "name" | "email" | "unionName" | "localName" | "role" | "offerings" | "message" | "locale">;
export type AccessRequestPatch = Partial<{ [K in "status" | "unionId" | "localId" | "privateNote" | "reviewedById" | "inviteId" | "receiptSentAt" | "notifySentAt" | "notificationError"]: AccessRequest[K] | null }>;
export function accessRequestMemberView(row: AccessRequest) { return { id: row.id, kind: row.kind, name: row.name, email: row.email, unionName: row.unionName, localName: row.localName, message: row.message, locale: row.locale, createdAt: row.createdAt, status: row.status, unionId: row.unionId, localId: row.localId, inviteId: row.inviteId }; }




