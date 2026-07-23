import { z } from "zod";

export const unionIdSchema = z.string().min(1);
export const localIdSchema = z.string().min(1);
export const bargainingUnitIdSchema = z.string().min(1).optional();

export const userRoleSchema = z.enum([
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
  "local_steward",
  "stability_member",
  "solo_account",
]);

export const isoDateTimeSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be an ISO 8601 datetime");
