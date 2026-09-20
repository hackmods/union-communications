import type { PublicToolSettingsAdapter } from "./adapter";
import type { PublicToolSettingsRecord } from "./visibility";

function nowIso() {
  return new Date().toISOString();
}

function emptyRecord(): PublicToolSettingsRecord {
  return { disabledToolSlugs: [], updatedById: "", updatedAt: nowIso() };
}

export class MemoryPublicToolSettingsAdapter
  implements PublicToolSettingsAdapter
{
  private platform: PublicToolSettingsRecord = emptyRecord();
  private unions = new Map<string, PublicToolSettingsRecord>();
  private locals = new Map<string, PublicToolSettingsRecord>();

  async getPlatform(): Promise<PublicToolSettingsRecord> {
    return { ...this.platform, disabledToolSlugs: [...this.platform.disabledToolSlugs] };
  }

  async setPlatform(
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord> {
    this.platform = {
      disabledToolSlugs: [...disabledToolSlugs],
      updatedById,
      updatedAt: nowIso(),
    };
    return this.getPlatform();
  }

  async getUnion(unionId: string): Promise<PublicToolSettingsRecord | null> {
    const row = this.unions.get(unionId);
    if (!row) return null;
    return { ...row, disabledToolSlugs: [...row.disabledToolSlugs] };
  }

  async setUnion(
    unionId: string,
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord> {
    const next: PublicToolSettingsRecord = {
      disabledToolSlugs: [...disabledToolSlugs],
      updatedById,
      updatedAt: nowIso(),
    };
    this.unions.set(unionId, next);
    return { ...next, disabledToolSlugs: [...next.disabledToolSlugs] };
  }

  async getLocal(
    unionId: string,
    localId: string,
  ): Promise<PublicToolSettingsRecord | null> {
    const row = this.locals.get(`${unionId}:${localId}`);
    if (!row) return null;
    return { ...row, disabledToolSlugs: [...row.disabledToolSlugs] };
  }

  async setLocal(
    unionId: string,
    localId: string,
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord> {
    const next: PublicToolSettingsRecord = {
      disabledToolSlugs: [...disabledToolSlugs],
      updatedById,
      updatedAt: nowIso(),
    };
    this.locals.set(`${unionId}:${localId}`, next);
    return { ...next, disabledToolSlugs: [...next.disabledToolSlugs] };
  }

  /** @internal */
  reset(): void {
    this.platform = emptyRecord();
    this.unions.clear();
    this.locals.clear();
  }
}

export const memoryPublicToolSettingsStore =
  new MemoryPublicToolSettingsAdapter();
