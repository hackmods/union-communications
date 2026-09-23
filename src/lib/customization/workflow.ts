import { createHash } from "node:crypto";
import { z } from "zod";

export function isWorkflowCustomizationEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.CUSTOMIZATION_WORKFLOW_ENABLED === "true";
}

const workflowSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  resourceKey: z.string().min(1),
  releaseId: z.string().min(1),
  revisionId: z.string().min(1),
  effectiveAt: z.string().datetime(),
  unionId: z.string().min(1),
  bargainingUnitId: z.string().min(1).nullable(),
  configHash: z.string().min(1),
  config: z.unknown(),
}).strict();

export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;

export function hashWorkflowConfig(config: unknown): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

/**
 * Async workflow resolver. Until the flag is on, callers keep using compiled/tenant
 * `resolveGrievanceConfig`. New cases store this snapshot; old cases retain theirs.
 */
export function buildWorkflowSnapshot(input: {
  resourceKey: string;
  releaseId: string;
  revisionId: string;
  unionId: string;
  bargainingUnitId?: string | null;
  effectiveAt?: Date;
  config: unknown;
}): WorkflowSnapshot {
  return workflowSnapshotSchema.parse({
    schemaVersion: 1,
    resourceKey: input.resourceKey,
    releaseId: input.releaseId,
    revisionId: input.revisionId,
    effectiveAt: (input.effectiveAt ?? new Date()).toISOString(),
    unionId: input.unionId,
    bargainingUnitId: input.bargainingUnitId ?? null,
    configHash: hashWorkflowConfig(input.config),
    config: input.config,
  });
}

/** Changing a published workflow must not rewrite an existing case snapshot. */
export function selectCaseWorkflow(input: {
  existingSnapshot: WorkflowSnapshot | null;
  publishedSnapshot: WorkflowSnapshot | null;
  workflowEnabled: boolean;
}): WorkflowSnapshot | null {
  if (input.existingSnapshot) return input.existingSnapshot;
  if (!input.workflowEnabled) return null;
  return input.publishedSnapshot;
}
