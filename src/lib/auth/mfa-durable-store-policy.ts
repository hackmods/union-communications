/** A selected PostgreSQL MFA backend remains authoritative even outside hosted mode. */
export function mustFailClosedOnMfaDurableStoreError(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const hosted = ["true", "1", "yes"].includes(
    env.UNIONOPS_HOSTED_CUSTOMER_MODE?.trim().toLowerCase() ?? "",
  );
  return hosted || env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres";
}
