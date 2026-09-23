import { z } from "zod";
import { CANVAS_FONT_ORDER } from "@/lib/comms/canvas-fonts";
import { toolConfigurationSchema } from "@/lib/customization/registry";

export const SCHEMA_VERSION = 1;
export const MAX_DOCUMENT_BYTES = 256 * 1024;
export const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const resourceKeySchema = z.string().regex(/^(guide|tool|brand|workflow|source):[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const audienceSchema = z.enum(["public", "verified_member", "local_officer"]);
const textSchema = z.string().trim().min(1).max(10000);
export const localizedTextSchema = z.object({ en: textSchema, fr: textSchema }).strict();
const safeUrlSchema = z.string().max(2048).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use an HTTPS URL without credentials");

const scopeBase = { id: idSchema, archived: z.boolean().default(false) };
export const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ ...scopeBase, kind: z.literal("system") }).strict(),
  z.object({ ...scopeBase, kind: z.literal("union"), parentScopeId: idSchema, unionId: idSchema }).strict(),
  z.object({ ...scopeBase, kind: z.literal("division"), parentScopeId: idSchema, unionId: idSchema, divisionId: idSchema }).strict(),
  z.object({ ...scopeBase, kind: z.literal("local"), parentScopeId: idSchema, unionId: idSchema, divisionId: idSchema.optional(), localId: idSchema }).strict(),
  z.object({ ...scopeBase, kind: z.literal("unit"), parentScopeId: idSchema, unionId: idSchema, divisionId: idSchema.optional(), localId: idSchema, bargainingUnitId: idSchema }).strict(),
]);

const inlineSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: textSchema }).strict(),
  z.object({ type: z.literal("emphasis"), text: textSchema }).strict(),
  z.object({ type: z.literal("link"), text: textSchema, url: safeUrlSchema }).strict(),
]);
const inlineListSchema = z.array(inlineSchema).min(1).max(100);
const localizedInlinesSchema = z.object({ en: inlineListSchema, fr: inlineListSchema }).strict();
const sourceIdSchema = z.string().regex(/^source:[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const blockBase = {
  id: idSchema,
  audience: audienceSchema,
  sourceIds: z.array(sourceIdSchema).max(100),
};
export const blockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("heading"), level: z.enum(["h2", "h3"]), content: localizedTextSchema }).strict(),
  z.object({ ...blockBase, type: z.literal("paragraph"), content: localizedInlinesSchema }).strict(),
  z.object({ ...blockBase, type: z.literal("callout"), tone: z.enum(["info", "warning"]), content: localizedInlinesSchema }).strict(),
  z.object({ ...blockBase, type: z.literal("list"), ordered: z.boolean(), content: z.object({ en: z.array(inlineListSchema).min(1).max(100), fr: z.array(inlineListSchema).min(1).max(100) }).strict() }).strict(),
  z.object({ ...blockBase, type: z.literal("steps"), content: z.object({ en: z.array(textSchema).min(1).max(100), fr: z.array(textSchema).min(1).max(100) }).strict() }).strict(),
  z.object({ ...blockBase, type: z.literal("sourceList"), content: localizedTextSchema }).strict(),
]);

export const sourceReferenceSchema = z.object({ id: sourceIdSchema, revisionId: idSchema }).strict();
export const guidePayloadSchema = z.object({
  kind: z.literal("guide"), title: localizedTextSchema,
  blocks: z.array(blockSchema).max(100), sources: z.array(sourceReferenceSchema).max(100),
}).strict();
const fontSchema = z.string().refine((value) => CANVAS_FONT_ORDER.some((font) => font === value), "Unknown bundled font");
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const brandPayloadSchema = z.object({
  kind: z.literal("brand"), label: localizedTextSchema,
  primaryColor: colorSchema, secondaryColor: colorSchema, accentColor: colorSchema,
  headlineFontId: fontSchema, bodyFontId: fontSchema,
  logoAssetId: idSchema.nullable(),
}).strict();
export const sourcePayloadSchema = z.object({
  kind: z.literal("source"), label: localizedTextSchema, note: localizedTextSchema,
  url: safeUrlSchema, publisher: textSchema, jurisdiction: textSchema,
  applicability: localizedTextSchema, checkedAt: z.string().date(),
  reviewDueAt: z.string().date(), rightsNote: textSchema.nullable(),
}).strict();
export const workflowPayloadSchema = z.object({
  kind: z.literal("workflow"), workflowId: z.literal("grievance"),
  effectiveFrom: z.string().date(),
  steps: z.array(z.object({
    id: idSchema, number: z.number().int().min(1).max(100), name: localizedTextSchema,
    responseDays: z.number().int().min(0).max(3650).nullable(),
    appealDays: z.number().int().min(0).max(3650).nullable().optional(),
  }).strict()).min(1).max(100),
}).strict();
export const toolPayloadSchema = z.object({ kind: z.literal("tool"), configuration: toolConfigurationSchema }).strict();
export const payloadSchema = z.discriminatedUnion("kind", [guidePayloadSchema, brandPayloadSchema, sourcePayloadSchema, workflowPayloadSchema, toolPayloadSchema]);

export const editableFieldSchema = z.enum([
  "title", "blocks", "sources", "label", "primaryColor", "secondaryColor", "accentColor",
  "headlineFontId", "bodyFontId", "logoAssetId", "configuration", "replacement",
]);
export const policySchema = z.object({
  audience: audienceSchema, enabled: z.boolean(), editableFields: z.array(editableFieldSchema).max(20),
}).strict();
const setLocalized = z.object({ op: z.literal("set"), value: localizedTextSchema }).strict();
const setColor = z.object({ op: z.literal("set"), value: colorSchema }).strict();
const setFont = z.object({ op: z.literal("set"), value: fontSchema }).strict();
export const blockOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), value: blockSchema }).strict(),
  z.object({ op: z.literal("replace"), value: blockSchema }).strict(),
  z.object({ op: z.literal("remove"), id: idSchema }).strict(),
  z.object({ op: z.literal("order"), ids: z.array(idSchema).max(100) }).strict(),
]);
export const sourceOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), value: sourceReferenceSchema }).strict(),
  z.object({ op: z.literal("replace"), value: sourceReferenceSchema }).strict(),
  z.object({ op: z.literal("remove"), id: sourceIdSchema }).strict(),
  z.object({ op: z.literal("order"), ids: z.array(sourceIdSchema).max(100) }).strict(),
]);
export const patchSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guide"), title: setLocalized.optional(), blocks: z.array(blockOperationSchema).max(200).optional(), sources: z.array(sourceOperationSchema).max(200).optional() }).strict(),
  z.object({
    kind: z.literal("brand"), label: setLocalized.optional(), primaryColor: setColor.optional(),
    secondaryColor: setColor.optional(), accentColor: setColor.optional(), headlineFontId: setFont.optional(), bodyFontId: setFont.optional(),
    logoAssetId: z.discriminatedUnion("op", [z.object({ op: z.literal("set"), value: idSchema }).strict(), z.object({ op: z.literal("clear") }).strict()]).optional(),
  }).strict(),
  z.object({ kind: z.literal("source"), replacement: sourcePayloadSchema }).strict(),
  z.object({ kind: z.literal("workflow"), replacement: workflowPayloadSchema }).strict(),
  z.object({ kind: z.literal("tool"), configuration: toolConfigurationSchema }).strict(),
]);
export const resourceSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION), key: resourceKeySchema, payload: payloadSchema, policy: policySchema,
}).strict();
const layerBase = { scopeId: idSchema, revisionId: idSchema, key: resourceKeySchema, schemaVersion: z.literal(SCHEMA_VERSION) };
/** Each scope has one active operation. Inherit removes that scope's override. */
export const layerSchema = z.discriminatedUnion("mode", [
  z.object({ ...layerBase, mode: z.literal("inherit") }).strict(),
  z.object({ ...layerBase, mode: z.literal("withdraw") }).strict(),
  z.object({ ...layerBase, mode: z.literal("define"), resource: resourceSchema }).strict(),
  z.object({ ...layerBase, mode: z.literal("patch"), patch: patchSchema, policy: policySchema.partial().optional() }).strict(),
]);
export const sourceDependencySchema = z.object({
  id: sourceIdSchema, revisionId: idSchema, scopeId: idSchema,
  audience: audienceSchema, payload: sourcePayloadSchema,
}).strict();

/** Bound JSON before Zod traverses it; errors propagate, never mean "no override". */
export function parseBounded<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const json = JSON.stringify(input);
  if (json === undefined || new TextEncoder().encode(json).byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("Customization document exceeds the JSON size limit");
  }
  return schema.parse(input);
}
