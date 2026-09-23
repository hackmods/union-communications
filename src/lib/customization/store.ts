import { isPostgresConfigured } from "@/lib/db/client";
import type { CustomizationAdapter } from "./adapter";
import { DrizzleCustomizationAdapter } from "./drizzle-adapter";
import { MemoryCustomizationAdapter, type MemoryCustomizationOptions } from "./memory-adapter";

let durable: CustomizationAdapter | undefined;
/** No automatic memory fallback, including after a database failure. */
export function getCustomizationAdapter(): CustomizationAdapter {
  if (!isPostgresConfigured()) throw new Error("Customization requires PostgreSQL; use an explicitly constructed test/demo adapter for fixtures");
  return durable ??= new DrizzleCustomizationAdapter();
}
export function createCustomizationDemoAdapter(options: MemoryCustomizationOptions): CustomizationAdapter {
  return new MemoryCustomizationAdapter(options);
}
