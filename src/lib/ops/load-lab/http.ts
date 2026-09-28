import type { Sample } from "./types";

export type CookieJar = Map<string, string>;

export function mergeSetCookie(
  jar: CookieJar,
  headers: Headers,
): void {
  const raw = headers.getSetCookie?.() ?? [];
  const fallback = headers.get("set-cookie");
  const list = raw.length ? raw : fallback ? [fallback] : [];
  for (const line of list) {
    const part = line.split(";")[0];
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
}

export function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Think-time with jitter (ms). */
export function thinkTimeMs(min = 800, max = 2500): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export async function timedGet(
  baseUrl: string,
  path: string,
  name: string,
  jar: CookieJar,
  signal?: AbortSignal,
  timeoutMs = 15000,
): Promise<Sample> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const started = performance.now();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: jar.size ? { Cookie: cookieHeader(jar) } : undefined,
      redirect: "follow",
      signal: controller.signal,
    });
    mergeSetCookie(jar, res.headers);
    const ms = performance.now() - started;
    const ok = res.status >= 200 && res.status < 400;
    return {
      name,
      ms,
      ok,
      status: res.status,
      authFailure: res.status === 401 || res.status === 403,
    };
  } catch (err) {
    const ms = performance.now() - started;
    const aborted =
      signal?.aborted ||
      (err instanceof Error && err.name === "AbortError");
    return {
      name,
      ms,
      ok: false,
      timeout: aborted && !signal?.aborted,
      authFailure: false,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function timedPostForm(
  baseUrl: string,
  path: string,
  name: string,
  body: URLSearchParams,
  jar: CookieJar,
  signal?: AbortSignal,
  timeoutMs = 20000,
): Promise<Sample & { bodyText?: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const started = performance.now();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(jar),
      },
      body,
      redirect: "manual",
      signal: controller.signal,
    });
    mergeSetCookie(jar, res.headers);
    const text = await res.text().catch(() => "");
    const ms = performance.now() - started;
    // Auth.js often returns 200 JSON or 302 on success.
    const ok =
      (res.status >= 200 && res.status < 400) ||
      res.status === 302 ||
      res.status === 303;
    return {
      name,
      ms,
      ok,
      status: res.status,
      authFailure: res.status === 401 || res.status === 403,
      bodyText: text,
    };
  } catch (err) {
    const ms = performance.now() - started;
    const aborted =
      signal?.aborted ||
      (err instanceof Error && err.name === "AbortError");
    return {
      name,
      ms,
      ok: false,
      timeout: aborted && !signal?.aborted,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
