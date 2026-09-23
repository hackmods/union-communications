import { z } from "zod";

/** Allowlisted local parameter keys only — injection of other fields is rejected. */
export const LOCAL_PARAMETER_KEYS = [
  "contactEmail",
  "contactPhone",
  "meetingLocationDefault",
  "memberHotline",
] as const;

export type LocalParameterKey = (typeof LOCAL_PARAMETER_KEYS)[number];

export const localParametersSchema = z.object({
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().trim().min(7).max(40).optional(),
  meetingLocationDefault: z.string().trim().min(1).max(200).optional(),
  memberHotline: z.string().trim().min(7).max(40).optional(),
}).strict();

export type LocalParameters = z.infer<typeof localParametersSchema>;

export type LocalParameterDecision =
  | { allowed: true; parameters: LocalParameters }
  | { allowed: false; reason: string; rejectedKeys?: string[] };

/**
 * Local executive/steward parameter gate. Only allowlisted fields may change.
 * Union sources, audiences, and workflow fields are never accepted here.
 */
export function decideLocalParameterEdit(input: {
  hasLocalMembership: boolean;
  hasExecutiveAssignment: boolean;
  hasParameterDelegation: boolean;
  isStewardOnly: boolean;
  proposed: Record<string, unknown>;
  editableFields: string[];
}): LocalParameterDecision {
  if (!input.hasLocalMembership) return { allowed: false, reason: "local_membership_required" };
  if (input.isStewardOnly && !input.hasParameterDelegation) {
    return { allowed: false, reason: "steward_readonly" };
  }
  if (!input.hasExecutiveAssignment && !input.hasParameterDelegation) {
    return { allowed: false, reason: "assignment_or_delegation_required" };
  }
  const rejected = Object.keys(input.proposed).filter(
    (key) => !(LOCAL_PARAMETER_KEYS as readonly string[]).includes(key),
  );
  if (rejected.length) return { allowed: false, reason: "field_injection", rejectedKeys: rejected };
  const allowlisted = new Set(input.editableFields.length ? input.editableFields : LOCAL_PARAMETER_KEYS);
  for (const key of Object.keys(input.proposed)) {
    if (!allowlisted.has(key)) {
      return { allowed: false, reason: "field_not_editable", rejectedKeys: [key] };
    }
  }
  const parsed = localParametersSchema.safeParse(input.proposed);
  if (!parsed.success) return { allowed: false, reason: "validation_failed" };
  return { allowed: true, parameters: parsed.data };
}
