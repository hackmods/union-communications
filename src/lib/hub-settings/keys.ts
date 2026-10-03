/** @deprecated per-user full kit key — prefer local + personal helpers */
export function hubSettingsKey(userId: string, unionId?: string): string {
  return `${unionId ?? "solo"}:${userId}`;
}

export function localBrandKey(unionId: string, localId: string): string {
  return `${unionId}:${localId}`;
}

export function personalBrandKey(userId: string, unionId?: string): string {
  return hubSettingsKey(userId, unionId);
}

/** Durable PK union when the session has no tenant yet. */
export function durableUnionId(unionId?: string): string {
  return unionId?.trim() ? unionId : "solo";
}
