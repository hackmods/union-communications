import type {
  CreateSharedTemplateInput,
  SharedTemplate,
} from "@/types/qol";

export interface MarketplaceListFilters {
  unionId: string;
  kind?: string;
  query?: string;
}

export interface MarketplaceAdapter {
  list(filters: MarketplaceListFilters): Promise<SharedTemplate[]>;
  getById(id: string): Promise<SharedTemplate | null>;
  create(
    input: CreateSharedTemplateInput,
    meta: {
      unionId: string;
      localId: string;
      sharedById: string;
      sharedByName: string;
    },
  ): Promise<SharedTemplate>;
  remove(id: string): Promise<boolean>;
}
