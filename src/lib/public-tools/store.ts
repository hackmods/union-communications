import { platformSettingsDbBackend } from "@/lib/db/backend";
import type { PublicToolSettingsAdapter } from "./adapter";
import { DrizzlePublicToolSettingsAdapter } from "./drizzle-adapter";
import { memoryPublicToolSettingsStore } from "./memory-adapter";
import {
  resolvePublicToolEnabled,
  type PublicToolResolveContext,
} from "./visibility";

let store: PublicToolSettingsAdapter | null = null;

export function getPublicToolSettingsStore(): PublicToolSettingsAdapter {
  if (!store) {
    store =
      platformSettingsDbBackend() === "postgres"
        ? new DrizzlePublicToolSettingsAdapter()
        : memoryPublicToolSettingsStore;
  }
  return store;
}

/** @internal */
export function resetPublicToolSettingsStore(): void {
  store = null;
  memoryPublicToolSettingsStore.reset();
}

export const publicToolSettingsStore: PublicToolSettingsAdapter = new Proxy(
  {} as PublicToolSettingsAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getPublicToolSettingsStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);

/** Async resolve using current store layers. */
export async function isPublicToolEnabled(
  slug: string,
  ctx: PublicToolResolveContext = {},
): Promise<boolean> {
  const platform = await publicToolSettingsStore.getPlatform();
  const union = ctx.unionId
    ? await publicToolSettingsStore.getUnion(ctx.unionId)
    : null;
  const local =
    ctx.unionId && ctx.localId
      ? await publicToolSettingsStore.getLocal(ctx.unionId, ctx.localId)
      : null;
  return resolvePublicToolEnabled(slug, {
    platformDisabled: platform.disabledToolSlugs,
    unionDisabled: union?.disabledToolSlugs,
    localDisabled: local?.disabledToolSlugs,
  });
}

export async function getPlatformDisabledToolSlugs(): Promise<string[]> {
  const platform = await publicToolSettingsStore.getPlatform();
  return platform.disabledToolSlugs;
}
