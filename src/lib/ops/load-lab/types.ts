/** Shared types for the on-box Load Test Lab. */

export type LoadLabProfile =
  | "smoke"
  | "public"
  | "hub-read"
  | "capacity";

export type LoadLabEnvName = "local" | "staging" | "production";

export type TierVerdict = "healthy" | "degraded" | "failed" | "not_attempted";

export type LoadLabStartRequest = {
  profile: LoadLabProfile;
  envName: LoadLabEnvName;
  /** Override base URL; empty means resolve from env/loopback. */
  baseUrl?: string;
  /** Single-tier VU count (ignored for capacity sweep). */
  vus?: number;
  /** Steady-state seconds per tier (or whole run for non-capacity). */
  durationSec?: number;
  /** Ramp seconds into each tier. */
  rampSec?: number;
  /** Hub credentials — never persisted to disk by the API. */
  username?: string;
  password?: string;
  allowProduction?: boolean;
};

export type EndpointStats = {
  name: string;
  count: number;
  errors: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
};

export type TierResult = {
  vus: number;
  reqPerSec: number;
  iterations: number;
  successful: number;
  failed: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  authFailures: number;
  timeouts: number;
  verdict: TierVerdict;
  endpoints: EndpointStats[];
  /** Why a higher tier was skipped. */
  skipReason?: string;
};

export type BottleneckHint = {
  id: string;
  label: string;
  detail: string;
};

export type LoadLabSummary = {
  schemaVersion: 1;
  measurementMode: "on-box-colocated";
  runId: string;
  startedAt: string;
  finishedAt: string;
  profile: LoadLabProfile;
  envName: LoadLabEnvName;
  baseUrl: string;
  commit?: string;
  version?: string;
  tiers: TierResult[];
  lastHealthyVus: number | null;
  firstDegradedVus: number | null;
  firstFailedVus: number | null;
  sustainableReqPerSec: number | null;
  hints: BottleneckHint[];
  aborted: boolean;
  abortReason?: string;
  notes: string[];
};

export type LoadLabRunStatus =
  | "idle"
  | "starting"
  | "running"
  | "aborting"
  | "completed"
  | "failed";

export type LoadLabLiveStatus = {
  status: LoadLabRunStatus;
  runId: string | null;
  profile: LoadLabProfile | null;
  envName: LoadLabEnvName | null;
  baseUrl: string | null;
  currentVus: number | null;
  currentTierIndex: number | null;
  message: string;
  startedAt: string | null;
  summary: LoadLabSummary | null;
  enabled: boolean;
  productionAllowed: boolean;
  /** Seconds until a new Start is allowed (0 = ready). */
  cooldownRemainingSec: number;
  caps: {
    maxVus: number;
    maxDurationSec: number;
    maxRunSec: number;
    cooldownSec: number;
  };
};

export type Sample = {
  name: string;
  ms: number;
  ok: boolean;
  timeout?: boolean;
  authFailure?: boolean;
  status?: number;
};
