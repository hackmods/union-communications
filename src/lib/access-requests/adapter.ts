import type { AccessRequest, AccessRequestPatch, NewAccessRequest, AccessRequestStatus, AccessRequestKind } from "@/types/access-request";
export interface AccessRequestAdapter {
  create(input: NewAccessRequest): Promise<AccessRequest>;
  list(filters?: { status?: AccessRequestStatus; kind?: AccessRequestKind; unionId?: string; localId?: string }): Promise<AccessRequest[]>;
  getById(id: string): Promise<AccessRequest | null>;
  update(id: string, patch: AccessRequestPatch): Promise<AccessRequest | null>;
}
