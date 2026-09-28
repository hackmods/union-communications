import { loginWithCredentials, type LoadCredentials } from "./auth";
import { sleep, thinkTimeMs, timedGet, type CookieJar } from "./http";
import type { Sample } from "./types";

const PUBLIC_STEPS: { path: string; name: string }[] = [
  { path: "/en/", name: "GET homepage" },
  { path: "/en/create/", name: "GET create catalog" },
  { path: "/en/utilities/", name: "GET utilities catalog" },
  { path: "/en/learn/", name: "GET learn" },
  { path: "/en/create/flyer-maker/", name: "GET flyer-maker" },
  { path: "/en/create/brand-kit/", name: "GET brand-kit" },
  // Intentionally omit /api/health — CapRover probes it; load-testing that
  // path can 503 the orchestrator and restart the container mid-run.
  { path: "/en/manifesto/", name: "GET manifesto" },
];

const HUB_READ_STEPS: { path: string; name: string }[] = [
  { path: "/en/app/", name: "GET hub dashboard" },
  { path: "/api/grievances", name: "GET grievances" },
  { path: "/api/tasks", name: "GET tasks" },
  { path: "/api/meetings/events", name: "GET meetings events" },
  { path: "/api/meetings/upcoming", name: "GET meetings upcoming" },
];

export async function runPublicIteration(
  baseUrl: string,
  jar: CookieJar,
  signal?: AbortSignal,
): Promise<Sample[]> {
  const samples: Sample[] = [];
  // Pick a short journey subset so VUs diverge.
  const start = Math.floor(Math.random() * PUBLIC_STEPS.length);
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    const step = PUBLIC_STEPS[(start + i) % PUBLIC_STEPS.length]!;
    samples.push(await timedGet(baseUrl, step.path, step.name, jar, signal));
    await sleep(thinkTimeMs(400, 1800), signal).catch(() => undefined);
  }
  return samples;
}

export async function runHubReadIteration(
  baseUrl: string,
  jar: CookieJar,
  signal?: AbortSignal,
): Promise<Sample[]> {
  const samples: Sample[] = [];
  const start = Math.floor(Math.random() * HUB_READ_STEPS.length);
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    const step = HUB_READ_STEPS[(start + i) % HUB_READ_STEPS.length]!;
    samples.push(await timedGet(baseUrl, step.path, step.name, jar, signal));
    await sleep(thinkTimeMs(500, 2200), signal).catch(() => undefined);
  }
  return samples;
}

export async function ensureHubSession(
  baseUrl: string,
  creds: LoadCredentials,
  signal?: AbortSignal,
): Promise<{ jar: CookieJar; samples: Sample[]; ok: boolean }> {
  const { jar, samples } = await loginWithCredentials(baseUrl, creds, signal);
  const ok = samples.some((s) => s.name === "auth.session" && s.ok);
  return { jar, samples, ok };
}

export { PUBLIC_STEPS, HUB_READ_STEPS };
