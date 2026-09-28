import {
  type CookieJar,
  mergeSetCookie,
  cookieHeader,
  timedGet,
  timedPostForm,
} from "./http";
import type { Sample } from "./types";

export type LoadCredentials = {
  username: string;
  password: string;
};

/**
 * Auth.js Credentials sign-in via CSRF + callback.
 * Session cookies stay in the jar for subsequent Hub requests.
 */
export async function loginWithCredentials(
  baseUrl: string,
  creds: LoadCredentials,
  signal?: AbortSignal,
): Promise<{ jar: CookieJar; samples: Sample[] }> {
  const jar: CookieJar = new Map();
  const samples: Sample[] = [];

  const csrfStarted = performance.now();
  let csrfToken = "";
  try {
    const csrfRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/csrf`, {
      signal,
      headers: jar.size ? { Cookie: cookieHeader(jar) } : undefined,
    });
    mergeSetCookie(jar, csrfRes.headers);
    const json = (await csrfRes.json()) as { csrfToken?: string };
    csrfToken = json.csrfToken ?? "";
    samples.push({
      name: "auth.csrf",
      ms: performance.now() - csrfStarted,
      ok: csrfRes.ok && Boolean(csrfToken),
      status: csrfRes.status,
      authFailure: !csrfToken,
    });
  } catch {
    samples.push({
      name: "auth.csrf",
      ms: performance.now() - csrfStarted,
      ok: false,
      timeout: true,
      authFailure: true,
    });
    return { jar, samples };
  }

  if (!csrfToken) return { jar, samples };

  const body = new URLSearchParams({
    csrfToken,
    email: creds.username,
    password: creds.password,
    redirect: "false",
    json: "true",
    callbackUrl: `${baseUrl.replace(/\/$/, "")}/en/app`,
  });

  const login = await timedPostForm(
    baseUrl,
    "/api/auth/callback/credentials",
    "auth.login",
    body,
    jar,
    signal,
  );
  samples.push(login);

  // Session probe
  const session = await timedGet(
    baseUrl,
    "/api/auth/session",
    "auth.session",
    jar,
    signal,
  );
  const sessionOk = session.ok && session.status === 200;
  samples.push({
    ...session,
    ok: sessionOk,
    authFailure: !sessionOk,
  });

  return { jar, samples };
}
