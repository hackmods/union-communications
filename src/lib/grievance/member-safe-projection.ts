import type { Grievance } from "@/types/grievance";

export type MemberSafeGrievanceUpdate = { id: string; body: string; publishedAt: string };
export type MemberSafeAttachment = { id: string };

export function projectMemberSafeGrievance(input: {
  grievance: Grievance;
  dueAt: string | null;
  updates: MemberSafeGrievanceUpdate[];
  attachments: MemberSafeAttachment[];
}) {
  const { grievance, dueAt, updates, attachments } = input;
  return {
    id: grievance.id,
    category: grievance.category,
    filedAt: grievance.filedAt,
    status: grievance.status,
    currentStep: grievance.currentStep,
    dueAt,
    updates,
    attachments,
  };
}
