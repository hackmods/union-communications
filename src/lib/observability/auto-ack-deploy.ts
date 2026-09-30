import { auditLog } from "@/lib/audit/store";
import {
  acknowledgeObservabilityIssue,
  listObservabilityAcks,
} from "@/lib/observability/acks";
import { isObservabilityAutoAckOnDeploy } from "@/lib/observability/alert-rules";
import { observabilityStore } from "@/lib/observability/store";

export type AutoAckOnDeployResult = {
  skipped?: "disabled" | "store_disabled" | "no_commit";
  acknowledged: number;
  fingerprints: string[];
};

/**
 * Ack fingerprints whose latest event build differs from the current deploy commit.
 */
export async function autoAckIssuesOnDeploy(input: {
  commit: string;
}): Promise<AutoAckOnDeployResult> {
  if (!isObservabilityAutoAckOnDeploy()) {
    return { skipped: "disabled", acknowledged: 0, fingerprints: [] };
  }
  if (!observabilityStore.isEnabled()) {
    return { skipped: "store_disabled", acknowledged: 0, fingerprints: [] };
  }
  const commit = input.commit.trim();
  if (!commit || commit === "unknown") {
    return { skipped: "no_commit", acknowledged: 0, fingerprints: [] };
  }

  const events = await observabilityStore.query({ limit: 500 });
  const latestByFp = new Map<
    string,
    { build?: string; ts: string }
  >();
  for (const ev of events) {
    const fp = ev.fingerprint;
    if (!fp) continue;
    const existing = latestByFp.get(fp);
    if (!existing || Date.parse(ev.ts) > Date.parse(existing.ts)) {
      latestByFp.set(fp, { build: ev.build, ts: ev.ts });
    }
  }

  const existingAcks = await listObservabilityAcks();
  const already = new Set(existingAcks.map((a) => a.fingerprint));
  const short = commit.slice(0, 7);
  const note = `auto-ack on deploy ${short}`;
  const fingerprints: string[] = [];

  for (const [fp, meta] of latestByFp) {
    if (already.has(fp)) continue;
    if (meta.build && meta.build === commit) continue;
    // Ack when build is missing or from a prior image.
    await acknowledgeObservabilityIssue({
      fingerprint: fp,
      userId: "system-deploy",
      note,
    });
    fingerprints.push(fp);
  }

  if (fingerprints.length > 0) {
    await auditLog.log({
      userId: "system-deploy",
      action: "observability.ack.auto_deploy",
      resourceType: "site_admin",
      resourceId: short,
      metadata: {
        acknowledged: String(fingerprints.length),
        commit: short,
      },
    });
  }

  return { acknowledged: fingerprints.length, fingerprints };
}
