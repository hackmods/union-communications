import { z } from "zod";
import { isCanvasFontId } from "@/lib/comms/canvas-fonts";
import { isWebsiteHttpUrl, toWebsiteNavLinks } from "@/lib/templates/website/brand-kit-fields";
import {
  isWebsiteHeroArtId,
  type WebsiteHeroArtId,
} from "@/lib/templates/website/hero-art";
import type {
  WebsiteNavLink,
  WebsiteOfficer,
  WebsiteTemplateData,
} from "@/types/website-template";
import { MAX_WEBSITE_OFFICERS } from "@/types/public-roster";

export const WEBSITE_CONFIG_KIND = "unionops-website" as const;
export const WEBSITE_CONFIG_VERSION = 1 as const;
export const WEBSITE_CONFIG_FILE = "unionops-website.json";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_LOGO_FILE = /^(logo)\.(png|jpe?g|webp|svg)$/i;
const SAFE_HERO_PHOTO_FILE = /^(hero)\.(png|jpe?g|webp)$/i;
const SAFE_ASSET_FILE = /^(logo|hero)\.(png|jpe?g|webp|svg)$/i;

export type WebsiteConfigParseCode = "invalid" | "wrongKind" | "missing";

export class WebsiteConfigParseError extends Error {
  readonly code: WebsiteConfigParseCode;

  constructor(code: WebsiteConfigParseCode) {
    super(code);
    this.name = "WebsiteConfigParseError";
    this.code = code;
  }
}

export type WebsiteConfigData = {
  localNumber: string;
  unionName: string;
  heroText: string;
  about1: string;
  about2: string;
  contactEmail: string;
  facebookUrl: string;
  officeAddress: string;
  officers: WebsiteOfficer[];
  customLinks: WebsiteNavLink[];
  membershipLinks: WebsiteNavLink[];
  primaryColor: string;
  secondaryColor: string;
  canvas?: WebsiteTemplateData["canvas"];
  logoFileName: string;
  logoAlt: string;
  includeOpseuResources: boolean;
  heroArtId?: WebsiteHeroArtId;
  heroImageFileName?: string;
  heroImageAlt?: string;
};

export type WebsiteConfigEnvelope = {
  kind: typeof WEBSITE_CONFIG_KIND;
  version: typeof WEBSITE_CONFIG_VERSION;
  exportedAt: string;
  data: WebsiteConfigData;
};

export type WebsiteImportedAsset = {
  fileName: string;
  bytes: Uint8Array;
  previewSrc: string;
};

export type WebsiteConfigImport = {
  envelope: WebsiteConfigEnvelope;
  logo?: WebsiteImportedAsset;
  heroImage?: WebsiteImportedAsset;
};

const text = (max: number) => z.string().max(max);

const officerSchema = z.object({
  name: text(200),
  role: text(200),
  location: text(200),
});

const navLinkSchema = z.object({
  label: text(200),
  url: text(2048),
});

const canvasSchema = z
  .object({
    surface: z
      .enum(["flat", "soft-gradient", "accent-band", "grain", "duotone"])
      .optional(),
    typeScale: z.enum(["display", "compact", "dense"]).optional(),
    density: z.enum(["roomy", "tight"]).optional(),
    headlineFontId: z.string().optional(),
    bodyFontId: z.string().optional(),
  })
  .optional();

const configDataSchema = z.object({
  localNumber: text(32),
  unionName: text(500),
  heroText: text(2000),
  about1: text(8000),
  about2: text(8000),
  contactEmail: text(254),
  facebookUrl: text(2048),
  officeAddress: text(2000),
  officers: z.array(officerSchema).max(MAX_WEBSITE_OFFICERS),
  customLinks: z.array(navLinkSchema).max(24).optional(),
  membershipLinks: z.array(navLinkSchema).max(24).optional(),
  primaryColor: z.string().regex(HEX_COLOR),
  secondaryColor: z.string().regex(HEX_COLOR),
  canvas: canvasSchema,
  logoFileName: text(64),
  logoAlt: text(500),
  includeOpseuResources: z.boolean(),
  heroArtId: z.string().optional(),
  heroImageFileName: text(64).optional(),
  heroImageAlt: text(500).optional(),
});

const envelopeSchema = z
  .object({
    kind: z.literal(WEBSITE_CONFIG_KIND),
    version: z.literal(WEBSITE_CONFIG_VERSION),
    exportedAt: z.string().min(1).max(64),
    data: configDataSchema,
  })
  .strict();

function trim(value: string): string {
  return value.trim();
}

function sanitizeCanvas(
  canvas: z.infer<typeof canvasSchema>,
): WebsiteTemplateData["canvas"] | undefined {
  if (!canvas) return undefined;
  const headlineFontId = isCanvasFontId(canvas.headlineFontId)
    ? canvas.headlineFontId
    : undefined;
  const bodyFontId = isCanvasFontId(canvas.bodyFontId)
    ? canvas.bodyFontId
    : undefined;
  const next: NonNullable<WebsiteTemplateData["canvas"]> = {};
  if (canvas.surface) next.surface = canvas.surface;
  if (canvas.typeScale) next.typeScale = canvas.typeScale;
  if (canvas.density) next.density = canvas.density;
  if (headlineFontId) next.headlineFontId = headlineFontId;
  if (bodyFontId) next.bodyFontId = bodyFontId;
  return Object.keys(next).length > 0 ? next : undefined;
}

function sanitizeFacebookUrl(url: string): string {
  const trimmed = trim(url);
  if (!trimmed) return "";
  return isWebsiteHttpUrl(trimmed) ? trimmed : "";
}

function sanitizeOfficers(officers: WebsiteOfficer[]): WebsiteOfficer[] {
  const next = officers.map((officer) => ({
    name: trim(officer.name),
    role: trim(officer.role),
    location: trim(officer.location),
  }));
  if (next.length === 0) {
    return [{ name: "", role: "", location: "" }];
  }
  return next;
}

function sanitizeAssetFileName(
  name: string | undefined,
  kind: "logo" | "hero",
): string {
  const trimmed = trim(name ?? "");
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\")) return "";
  if (kind === "logo") return SAFE_LOGO_FILE.test(trimmed) ? trimmed : "";
  return SAFE_HERO_PHOTO_FILE.test(trimmed) ? trimmed : "";
}

export function isSafeWebsiteAssetFileName(name: string): boolean {
  return SAFE_ASSET_FILE.test(name) && !name.includes("/") && !name.includes("\\");
}

export function isWebsiteHeroPhotoFileName(name: string): boolean {
  return (
    SAFE_HERO_PHOTO_FILE.test(name) &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}

export function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function findWebsiteConfigPath(names: readonly string[]): string | null {
  for (const name of names) {
    const normalized = normalizeZipPath(name);
    if (normalized.includes("..") || normalized.startsWith("/")) continue;
    if (
      normalized === WEBSITE_CONFIG_FILE ||
      normalized.endsWith(`/${WEBSITE_CONFIG_FILE}`)
    ) {
      return normalized;
    }
  }
  return null;
}

/** True when `path` is `assets/{fileName}` or `{theme}/assets/{fileName}` with no traversal. */
export function isSafeWebsiteZipAssetPath(
  path: string,
  fileName: string,
): boolean {
  if (!isSafeWebsiteAssetFileName(fileName)) return false;
  const normalized = normalizeZipPath(path);
  if (normalized.includes("..") || normalized.startsWith("/")) return false;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  if (parts[parts.length - 1] !== fileName) return false;
  return parts[parts.length - 2] === "assets";
}

function findZipAssetPath(
  names: readonly string[],
  fileName: string,
): string | null {
  for (const name of names) {
    if (isSafeWebsiteZipAssetPath(name, fileName)) {
      return normalizeZipPath(name);
    }
  }
  return null;
}

function mimeForAssetFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  return "image/jpeg";
}

export function websiteBytesToDataUrl(
  bytes: Uint8Array,
  mime: string,
): string {
  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function toImportedAsset(
  fileName: string,
  bytes: Uint8Array,
): WebsiteImportedAsset {
  return {
    fileName,
    bytes,
    previewSrc: websiteBytesToDataUrl(bytes, mimeForAssetFileName(fileName)),
  };
}

function normalizeParsedData(
  raw: z.infer<typeof configDataSchema>,
): WebsiteConfigData {
  const heroArtId = isWebsiteHeroArtId(raw.heroArtId)
    ? raw.heroArtId
    : undefined;
  const canvas = sanitizeCanvas(raw.canvas);
  const data: WebsiteConfigData = {
    localNumber: trim(raw.localNumber),
    unionName: trim(raw.unionName),
    heroText: trim(raw.heroText),
    about1: trim(raw.about1),
    about2: trim(raw.about2),
    contactEmail: trim(raw.contactEmail),
    facebookUrl: sanitizeFacebookUrl(raw.facebookUrl),
    officeAddress: trim(raw.officeAddress),
    officers: sanitizeOfficers(raw.officers),
    customLinks: toWebsiteNavLinks(raw.customLinks ?? []),
    membershipLinks: toWebsiteNavLinks(raw.membershipLinks ?? []),
    primaryColor: raw.primaryColor,
    secondaryColor: raw.secondaryColor,
    logoFileName: sanitizeAssetFileName(raw.logoFileName, "logo"),
    logoAlt: trim(raw.logoAlt),
    includeOpseuResources: raw.includeOpseuResources,
    heroImageFileName: sanitizeAssetFileName(raw.heroImageFileName, "hero") || undefined,
    heroImageAlt: trim(raw.heroImageAlt ?? ""),
  };
  if (heroArtId) data.heroArtId = heroArtId;
  if (canvas) data.canvas = canvas;
  return data;
}

export function parseWebsiteConfigValue(value: unknown): WebsiteConfigEnvelope {
  if (!value || typeof value !== "object") {
    throw new WebsiteConfigParseError("invalid");
  }
  const kind = (value as { kind?: unknown }).kind;
  const version = (value as { version?: unknown }).version;
  if (kind !== WEBSITE_CONFIG_KIND || version !== WEBSITE_CONFIG_VERSION) {
    throw new WebsiteConfigParseError("wrongKind");
  }
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new WebsiteConfigParseError("invalid");
  }
  return {
    kind: WEBSITE_CONFIG_KIND,
    version: WEBSITE_CONFIG_VERSION,
    exportedAt: parsed.data.exportedAt,
    data: normalizeParsedData(parsed.data.data),
  };
}

export function parseWebsiteConfigJson(raw: string): WebsiteConfigEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new WebsiteConfigParseError("invalid");
  }
  return parseWebsiteConfigValue(value);
}

export function serializeWebsiteConfig(
  data: WebsiteTemplateData,
  exportedAt: string = new Date().toISOString(),
): WebsiteConfigEnvelope {
  const heroArtId = isWebsiteHeroArtId(data.heroArtId)
    ? data.heroArtId
    : undefined;
  const canvas = sanitizeCanvas(data.canvas);
  const payload: WebsiteConfigData = {
    localNumber: trim(data.localNumber),
    unionName: trim(data.unionName),
    heroText: trim(data.heroText),
    about1: trim(data.about1),
    about2: trim(data.about2),
    contactEmail: trim(data.contactEmail),
    facebookUrl: sanitizeFacebookUrl(data.facebookUrl),
    officeAddress: trim(data.officeAddress),
    officers: sanitizeOfficers(data.officers),
    customLinks: toWebsiteNavLinks(data.customLinks ?? []),
    membershipLinks: toWebsiteNavLinks(data.membershipLinks ?? []),
    primaryColor: HEX_COLOR.test(data.primaryColor)
      ? data.primaryColor
      : "#111111",
    secondaryColor: HEX_COLOR.test(data.secondaryColor)
      ? data.secondaryColor
      : "#FFFFFF",
    logoFileName: sanitizeAssetFileName(data.logoFileName, "logo"),
    logoAlt: trim(data.logoAlt),
    includeOpseuResources: Boolean(data.includeOpseuResources),
    heroImageAlt: trim(data.heroImageAlt ?? ""),
  };
  if (heroArtId) payload.heroArtId = heroArtId;
  if (canvas) payload.canvas = canvas;
  const heroImageFileName = sanitizeAssetFileName(
    data.heroImageFileName,
    "hero",
  );
  if (heroImageFileName) payload.heroImageFileName = heroImageFileName;
  return {
    kind: WEBSITE_CONFIG_KIND,
    version: WEBSITE_CONFIG_VERSION,
    exportedAt,
    data: payload,
  };
}

export function buildWebsiteConfigJson(data: WebsiteTemplateData): string {
  return `${JSON.stringify(serializeWebsiteConfig(data), null, 2)}\n`;
}

type ZipLike = {
  files: Record<string, { dir?: boolean }>;
  file: (name: string) => {
    async: (type: "string" | "uint8array") => Promise<string | Uint8Array>;
  } | null;
};

function zipFileNames(zip: ZipLike): string[] {
  return Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .map(([name]) => normalizeZipPath(name));
}

async function readZipAsset(
  zip: ZipLike,
  path: string,
  fileName: string,
): Promise<WebsiteImportedAsset | undefined> {
  const entry = zip.file(path);
  if (!entry) return undefined;
  const raw = await entry.async("uint8array");
  if (!(raw instanceof Uint8Array) || raw.length === 0) return undefined;
  return toImportedAsset(fileName, raw);
}

export async function parseWebsiteConfigZip(
  buffer: ArrayBuffer | Uint8Array,
): Promise<WebsiteConfigImport> {
  const JSZip = (await import("jszip")).default;
  const zip = (await JSZip.loadAsync(buffer)) as ZipLike;
  const names = zipFileNames(zip);
  const configPath = findWebsiteConfigPath(names);
  if (!configPath) {
    throw new WebsiteConfigParseError("missing");
  }
  const configFile = zip.file(configPath);
  if (!configFile) {
    throw new WebsiteConfigParseError("missing");
  }
  const raw = await configFile.async("string");
  if (typeof raw !== "string") {
    throw new WebsiteConfigParseError("invalid");
  }
  const envelope = parseWebsiteConfigJson(raw);
  const result: WebsiteConfigImport = { envelope };

  const logoName = envelope.data.logoFileName;
  if (logoName) {
    const logoPath = findZipAssetPath(names, logoName);
    if (logoPath) {
      result.logo = await readZipAsset(zip, logoPath, logoName);
    }
  }

  const heroName = envelope.data.heroImageFileName;
  if (heroName && isWebsiteHeroPhotoFileName(heroName)) {
    const heroPath = findZipAssetPath(names, heroName);
    if (heroPath) {
      result.heroImage = await readZipAsset(zip, heroPath, heroName);
    }
  }

  return result;
}

export async function parseWebsiteConfigFile(
  file: File,
): Promise<WebsiteConfigImport> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const looksZip =
    name.endsWith(".zip") ||
    type === "application/zip" ||
    type === "application/x-zip-compressed";
  if (looksZip) {
    return parseWebsiteConfigZip(await file.arrayBuffer());
  }
  const textContent = await file.text();
  return { envelope: parseWebsiteConfigJson(textContent) };
}
