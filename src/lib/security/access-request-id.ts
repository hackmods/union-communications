const ACCESS_REQUEST_ID_RE = /^access-[0-9]+-[a-z0-9]{6,12}$/i;

export function isAccessRequestId(value: string): boolean {
  return ACCESS_REQUEST_ID_RE.test(value.trim());
}
