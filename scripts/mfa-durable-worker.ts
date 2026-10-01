import { readFileSync } from "node:fs";
import { consumeMfaGrant } from "../src/lib/auth/mfa-grants";
import { getPendingSecret } from "../src/lib/auth/mfa-enrollment-store";
import { getDb } from "../src/lib/db/client";

type Request =
  | { action: "read-pending"; userId: string; expectedSecret: string }
  | { action: "consume-grant"; userId: string; nonce: string };

async function main(): Promise<void> {
  const request = JSON.parse(readFileSync(0, "utf8")) as Request;
  process.env.AUTH_USERS_BACKEND = "postgres";
  const db = getDb();

  try {
    if (request.action === "read-pending") {
      const secret = await getPendingSecret(request.userId);
      if (secret !== request.expectedSecret) {
        throw new Error("fresh worker process could not read the durable pending secret");
      }
      process.stdout.write("pending-ok\n");
      return;
    }

    if (request.action === "consume-grant") {
      const consumed = await consumeMfaGrant(
        request.userId,
        request.nonce,
        Date.now(),
        0,
      );
      process.stdout.write(consumed ? "consumed\n" : "rejected\n");
      return;
    }

    throw new Error("unsupported MFA durable worker action");
  } finally {
    await db.$client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(
    "[mfa-durable-worker] failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});
