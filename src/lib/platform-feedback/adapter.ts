import type {
  CreateSiteFeedbackInput,
  CreateSiteFeedbackMeta,
  SiteFeedbackListFilters,
  SiteFeedbackSubmission,
  UpdateSiteFeedbackInput,
} from "@/types/platform-feedback";

export interface PlatformFeedbackAdapter {
  create(
    input: CreateSiteFeedbackInput,
    meta: CreateSiteFeedbackMeta,
  ): Promise<SiteFeedbackSubmission>;
  list(filters?: SiteFeedbackListFilters): Promise<SiteFeedbackSubmission[]>;
  getById(id: string): Promise<SiteFeedbackSubmission | null>;
  update(
    id: string,
    input: UpdateSiteFeedbackInput,
  ): Promise<SiteFeedbackSubmission | null>;
  delete(id: string): Promise<boolean>;
}
