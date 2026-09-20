import type { BylawBuilderMode, BylawFormValues } from "@/lib/bylaws/build-template";

export type HubBylawStatus =
  | "draft"
  | "committee"
  | "pending_gmm"
  | "adopted"
  | "archived";

export type HubBylawDraft = {
  id: string;
  unionId: string;
  localId: string;
  title: string;
  status: HubBylawStatus;
  mode: BylawBuilderMode;
  form: BylawFormValues & {
    articleOverrides?: Record<string, string>;
    committeeNotes?: Record<string, string>;
    articleSet?: string;
    existingBylaws?: string;
  };
  updatedById: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateHubBylawDraftInput = {
  unionId: string;
  localId: string;
  title: string;
  mode?: BylawBuilderMode;
  form: HubBylawDraft["form"];
  status?: HubBylawStatus;
  updatedById: string;
};

export type UpdateHubBylawDraftInput = Partial<
  Pick<HubBylawDraft, "title" | "status" | "mode" | "form">
> & { updatedById: string };
