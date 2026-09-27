import { randomUUID } from "node:crypto";

/** Server-generated per-request ID; never trust a client-supplied correlation value. */
export function createAuditRequestContext() {
  const requestId = randomUUID();
  return {
    requestId,
    responseHeaders(input?: HeadersInit): Headers {
      const headers = new Headers(input);
      headers.set("X-Request-ID", requestId);
      return headers;
    },
  };
}
