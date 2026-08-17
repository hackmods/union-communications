import { feedbackDbBackend } from "@/lib/db/backend";

export function isFeedbackMemoryBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return feedbackDbBackend(env) === "memory";
}

/** When true, public POST returns 503 on the memory adapter. */
export function feedbackRequireDurable(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.FEEDBACK_REQUIRE_DURABLE?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
