import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveObservabilityConfig } from "@/lib/observability/config";
import type { ObservabilityAck } from "@/lib/observability/acks";
import type {
  ObservabilityAlertRuleLike,
  ObservabilityEmailFormat,
} from "@/lib/observability/alert-rules";
import type {
  ObservabilityLevel,
  ObservabilitySource,
} from "@/lib/observability/types";

export type FileAlertRule = ObservabilityAlertRuleLike & {
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

function defaultSidecarDir(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const explicit = env.OBSERVABILITY_ALERT_RULES_PATH?.trim();
  if (explicit) return path.dirname(explicit);
  const cfg = resolveObservabilityConfig(env);
  if (cfg.errorLogFilePath) return path.dirname(cfg.errorLogFilePath);
  return null;
}

export function resolveAlertRulesPath(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const explicit = env.OBSERVABILITY_ALERT_RULES_PATH?.trim();
  if (explicit) return explicit;
  const dir = defaultSidecarDir(env);
  return dir ? path.join(dir, "observability-alert-rules.json") : null;
}

export function resolveIssueAcksPath(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const dir = defaultSidecarDir(env);
  return dir ? path.join(dir, "observability-issue-acks.json") : null;
}

export function resolveAlertFiringsPath(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const dir = defaultSidecarDir(env);
  return dir ? path.join(dir, "observability-alert-firings.jsonl") : null;
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function listFileAlertRules(
  env: Record<string, string | undefined> = process.env,
): Promise<FileAlertRule[]> {
  const filePath = resolveAlertRulesPath(env);
  if (!filePath) return [];
  const rules = await readJsonArray<FileAlertRule>(filePath);
  return rules.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function writeFileAlertRules(
  rules: FileAlertRule[],
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const filePath = resolveAlertRulesPath(env);
  if (!filePath) throw new Error("Alert rules path is not configured");
  await ensureParent(filePath);
  await writeFile(filePath, `${JSON.stringify(rules, null, 2)}\n`, "utf8");
}

export async function createFileAlertRule(input: {
  name: string;
  enabled?: boolean;
  minLevel?: ObservabilityLevel;
  sources?: ObservabilitySource[] | null;
  fingerprint?: string | null;
  unionId?: string | null;
  thresholdCount?: number;
  windowMinutes?: number;
  cooldownMinutes?: number;
  recipients: string[];
  recipientsByUnion?: Record<string, string[]> | null;
  emailFormat?: ObservabilityEmailFormat;
  userId: string;
  env?: Record<string, string | undefined>;
}): Promise<FileAlertRule> {
  const env = input.env ?? process.env;
  const now = new Date().toISOString();
  const rule: FileAlertRule = {
    id: `oar-${randomUUID()}`,
    name: input.name.trim().slice(0, 120),
    enabled: input.enabled ?? true,
    minLevel: input.minLevel ?? "error",
    sources: input.sources?.length ? input.sources : null,
    fingerprint: input.fingerprint || null,
    unionId: input.unionId || null,
    thresholdCount: input.thresholdCount ?? 5,
    windowMinutes: input.windowMinutes ?? 15,
    cooldownMinutes: input.cooldownMinutes ?? 60,
    recipients: input.recipients,
    recipientsByUnion: input.recipientsByUnion ?? null,
    emailFormat: input.emailFormat ?? "multipart",
    createdBy: input.userId,
    createdAt: now,
    updatedBy: input.userId,
    updatedAt: now,
  };
  const existing = await listFileAlertRules(env);
  await writeFileAlertRules([rule, ...existing], env);
  return rule;
}

export async function updateFileAlertRule(input: {
  id: string;
  name?: string;
  enabled?: boolean;
  minLevel?: ObservabilityLevel;
  sources?: ObservabilitySource[] | null;
  fingerprint?: string | null;
  unionId?: string | null;
  thresholdCount?: number;
  windowMinutes?: number;
  cooldownMinutes?: number;
  recipients?: string[];
  recipientsByUnion?: Record<string, string[]> | null;
  emailFormat?: ObservabilityEmailFormat;
  userId: string;
  env?: Record<string, string | undefined>;
}): Promise<FileAlertRule | null> {
  const env = input.env ?? process.env;
  const existing = await listFileAlertRules(env);
  const idx = existing.findIndex((r) => r.id === input.id);
  if (idx < 0) return null;
  const prev = existing[idx];
  const next: FileAlertRule = {
    ...prev,
    ...(input.name !== undefined
      ? { name: input.name.trim().slice(0, 120) }
      : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.minLevel !== undefined ? { minLevel: input.minLevel } : {}),
    ...(input.sources !== undefined
      ? { sources: input.sources?.length ? input.sources : null }
      : {}),
    ...(input.fingerprint !== undefined
      ? { fingerprint: input.fingerprint || null }
      : {}),
    ...(input.unionId !== undefined ? { unionId: input.unionId || null } : {}),
    ...(input.thresholdCount !== undefined
      ? { thresholdCount: input.thresholdCount }
      : {}),
    ...(input.windowMinutes !== undefined
      ? { windowMinutes: input.windowMinutes }
      : {}),
    ...(input.cooldownMinutes !== undefined
      ? { cooldownMinutes: input.cooldownMinutes }
      : {}),
    ...(input.recipients !== undefined ? { recipients: input.recipients } : {}),
    ...(input.recipientsByUnion !== undefined
      ? { recipientsByUnion: input.recipientsByUnion }
      : {}),
    ...(input.emailFormat !== undefined
      ? { emailFormat: input.emailFormat }
      : {}),
    updatedBy: input.userId,
    updatedAt: new Date().toISOString(),
  };
  existing[idx] = next;
  await writeFileAlertRules(existing, env);
  return next;
}

export async function deleteFileAlertRule(
  id: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const existing = await listFileAlertRules(env);
  const next = existing.filter((r) => r.id !== id);
  if (next.length === existing.length) return false;
  await writeFileAlertRules(next, env);
  return true;
}

export async function listFileAcks(
  env: Record<string, string | undefined> = process.env,
): Promise<ObservabilityAck[]> {
  const filePath = resolveIssueAcksPath(env);
  if (!filePath) return [];
  const acks = await readJsonArray<ObservabilityAck>(filePath);
  return acks.sort(
    (a, b) => Date.parse(b.acknowledgedAt) - Date.parse(a.acknowledgedAt),
  );
}

export async function writeFileAcks(
  acks: ObservabilityAck[],
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const filePath = resolveIssueAcksPath(env);
  if (!filePath) throw new Error("Issue acks path is not configured");
  await ensureParent(filePath);
  await writeFile(filePath, `${JSON.stringify(acks, null, 2)}\n`, "utf8");
}

export async function acknowledgeFileIssue(input: {
  fingerprint: string;
  userId: string;
  note?: string;
  env?: Record<string, string | undefined>;
}): Promise<ObservabilityAck> {
  const env = input.env ?? process.env;
  const acks = await listFileAcks(env);
  const ack: ObservabilityAck = {
    fingerprint: input.fingerprint,
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: input.userId,
    note: input.note?.slice(0, 500) || undefined,
  };
  const next = [ack, ...acks.filter((a) => a.fingerprint !== input.fingerprint)];
  await writeFileAcks(next, env);
  return ack;
}

export async function unacknowledgeFileIssue(
  fingerprint: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const acks = await listFileAcks(env);
  const next = acks.filter((a) => a.fingerprint !== fingerprint);
  if (next.length === acks.length) return false;
  await writeFileAcks(next, env);
  return true;
}

export type FileAlertFiring = {
  id: string;
  ruleId: string;
  fingerprint?: string | null;
  unionId?: string | null;
  firedAt: string;
  eventCount: number;
  messageId?: string | null;
};

export async function getLastFileAlertFiring(
  ruleId: string,
  unionId: string | null = null,
  env: Record<string, string | undefined> = process.env,
): Promise<FileAlertFiring | null> {
  const filePath = resolveAlertFiringsPath(env);
  if (!filePath) return null;
  try {
    const raw = await readFile(filePath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        const row = JSON.parse(lines[i]) as FileAlertFiring;
        if (row.ruleId !== ruleId) continue;
        const rowUnion = row.unionId ?? null;
        if (rowUnion !== unionId) continue;
        return row;
      } catch {
        /* skip */
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function recordFileAlertFiring(
  input: {
    ruleId: string;
    fingerprint?: string | null;
    unionId?: string | null;
    eventCount: number;
    messageId?: string | null;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const filePath = resolveAlertFiringsPath(env);
  if (!filePath) return;
  await ensureParent(filePath);
  const row: FileAlertFiring = {
    id: `oaf-${randomUUID()}`,
    ruleId: input.ruleId,
    fingerprint: input.fingerprint || null,
    unionId: input.unionId ?? null,
    firedAt: new Date().toISOString(),
    eventCount: input.eventCount,
    messageId: input.messageId || null,
  };
  await appendFile(filePath, `${JSON.stringify(row)}\n`, "utf8");
}
