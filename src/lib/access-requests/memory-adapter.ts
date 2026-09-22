import type { AccessRequest, AccessRequestPatch, NewAccessRequest } from "@/types/access-request";
import type { AccessRequestAdapter } from "./adapter";
let rows: AccessRequest[] = [];
const iso = () => new Date().toISOString();
export class MemoryAccessRequestAdapter implements AccessRequestAdapter {
  async create(input: NewAccessRequest) { const now = iso(); const row: AccessRequest = { ...input, id: `access-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, createdAt: now, consentAcceptedAt: now, status: "new", reviewHistory: [] }; rows.push(row); return row; }
  async list(filters: { status?: AccessRequest["status"]; kind?: AccessRequest["kind"]; unionId?: string; localId?: string } = {}) { return rows.filter(r => (!filters.status || r.status === filters.status) && (!filters.kind || r.kind === filters.kind) && (!filters.unionId || r.unionId === filters.unionId) && (!filters.localId || r.localId === filters.localId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
  async getById(id: string) { return rows.find(r => r.id === id) ?? null; }
  async update(id: string, patch: AccessRequestPatch) { const row = rows.find(r => r.id === id); if (!row) return null; Object.assign(row, patch); if (patch.reviewedById || patch.status || patch.privateNote) row.reviewHistory.push({ at: iso(), userId: patch.reviewedById ?? "operator", status: patch.status ?? undefined, note: patch.privateNote ?? undefined }); return row; }
}
export const memoryAccessRequestStore = new MemoryAccessRequestAdapter();
export function resetMemoryAccessRequestStore() { rows = []; }

