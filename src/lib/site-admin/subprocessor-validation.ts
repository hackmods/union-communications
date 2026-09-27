import { z } from "zod";
import { toExclusiveEndBoundary } from "@/lib/site-admin/subprocessor-registry";

const dateOnly = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO calendar date.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date.");

const localizedText = (maxLength: number, required: boolean) => {
  const value = required
    ? z.string().trim().min(1).max(maxLength)
    : z.string().trim().max(maxLength);
  return z.object({ en: value, fr: value }).strict();
};

const localizedList = z.object({
  en: z.array(z.string().trim().min(1).max(160)).min(1).max(40),
  fr: z.array(z.string().trim().min(1).max(160)).min(1).max(40),
}).strict();

export const subprocessorFieldsSchema = z.object({
  serviceName: z.string().trim().min(1).max(160),
  purpose: localizedText(1000, true),
  dataCategories: localizedList,
  dataSubjects: localizedList,
  processingRegion: z.string().trim().min(1).max(160),
  transferStatus: z.enum([
    "within_canada",
    "cross_border",
    "not_applicable",
    "under_review",
  ]),
  effectiveFrom: dateOnly,
  effectiveTo: dateOnly.nullable(),
  publicNotes: localizedText(2000, false),
  internalNotes: z.string().trim().max(5000),
  verificationEvidence: z.string().trim().min(1).max(2000),
}).strict().superRefine((fields, ctx) => {
  if (fields.effectiveTo && fields.effectiveTo <= fields.effectiveFrom) {
    ctx.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "The end date must be after the effective date.",
    });
  }
}).transform(({ effectiveFrom, effectiveTo, ...fields }) => ({
  ...fields,
  effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
  // UI dates are inclusive; the database stores the exclusive next-day boundary.
  effectiveTo: effectiveTo ? new Date(toExclusiveEndBoundary(effectiveTo)) : null,
}));
