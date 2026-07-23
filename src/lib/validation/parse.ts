import { z } from "zod";

export function parseJsonBody<T>(
  schema: z.ZodType<T>,
  raw: unknown,
):
  | { ok: true; data: T }
  | { ok: false; issues: ReturnType<z.ZodError["flatten"]> } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.flatten() };
  }
  return { ok: true, data: parsed.data };
}
