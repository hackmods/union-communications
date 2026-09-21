export function parsePage(
  params: URLSearchParams,
  defaults: { offset?: number; limit?: number; maxLimit?: number } = {},
) {
  const requestedOffset = Number(params.get("offset") ?? defaults.offset ?? 0);
  const requestedLimit = Number(params.get("limit") ?? defaults.limit ?? 100);
  return {
    offset: Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
    limit: Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, defaults.maxLimit ?? 200)
      : defaults.limit ?? 100,
  };
}
