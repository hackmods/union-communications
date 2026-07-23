import { attachmentsDbBackend } from "@/lib/db/backend";
import type { AttachmentAdapter } from "./adapter";
import { DrizzleAttachmentAdapter } from "./drizzle-adapter";
import { MemoryAttachmentAdapter } from "./memory-adapter";

let store: AttachmentAdapter | null = null;

/** Singleton attachment store — memory meta by default; Postgres when flagged. Bytes always via object storage. */
export function getAttachmentStore(): AttachmentAdapter {
  if (!store) {
    store =
      attachmentsDbBackend() === "postgres"
        ? new DrizzleAttachmentAdapter()
        : new MemoryAttachmentAdapter();
  }
  return store;
}

/** @internal test helper */
export function resetAttachmentStore(): void {
  store = null;
}

export const attachmentStore: AttachmentAdapter = new Proxy(
  {} as AttachmentAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getAttachmentStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
