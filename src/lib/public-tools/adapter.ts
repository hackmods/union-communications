import type { PublicToolSettingsRecord } from "./visibility";

export interface PublicToolSettingsAdapter {
  getPlatform(): Promise<PublicToolSettingsRecord>;
  setPlatform(
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord>;
  getUnion(unionId: string): Promise<PublicToolSettingsRecord | null>;
  setUnion(
    unionId: string,
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord>;
  getLocal(
    unionId: string,
    localId: string,
  ): Promise<PublicToolSettingsRecord | null>;
  setLocal(
    unionId: string,
    localId: string,
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord>;
}
