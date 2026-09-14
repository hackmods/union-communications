import { z } from "zod";

/**
 * Parse JSON with a Zod schema and return the **output** type (defaults /
 * transforms applied). Prefer `z.ZodTypeAny` + `z.output<S>` over `ZodType<T>`
 * so optional+default fields are not left `T | undefined` under Next's tsc.
 */
export function parseJsonBody<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
):
  | { ok: true; data: z.output<S> }
  | { ok: false; issues: ReturnType<z.ZodError["flatten"]> } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.flatten() };
  }
  return { ok: true, data: parsed.data };
}
