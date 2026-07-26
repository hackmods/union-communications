import { attachmentStore } from "@/lib/attachments/store";
import { timeStore } from "@/lib/time/store";
import type { PunchPhotoInput, TimePunchPhotoKind } from "@/types/time";

const PUNCH_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validatePunchPhoto(photo: PunchPhotoInput): string | null {
  if (!PUNCH_IMAGE_MIMES.has(photo.mimeType)) {
    return "Punch photos must be JPEG, PNG, or WebP";
  }
  if (!photo.contentBase64?.trim()) {
    return "Photo content is required";
  }
  if (photo.kind !== "clock_in" && photo.kind !== "clock_out") {
    return "Invalid punch photo kind";
  }
  return null;
}

export async function savePunchPhoto(input: {
  entryId: string;
  photo: PunchPhotoInput;
  unionId: string;
  localId: string;
  uploadedById: string;
}): Promise<{ attachmentId?: string; error?: string }> {
  const validation = validatePunchPhoto(input.photo);
  if (validation) return { error: validation };

  const result = await attachmentStore.createForTimeEntry(
    input.entryId,
    {
      fileName: input.photo.fileName,
      mimeType: input.photo.mimeType,
      sizeBytes: input.photo.sizeBytes,
      contentBase64: input.photo.contentBase64,
    },
    {
      unionId: input.unionId,
      localId: input.localId,
      uploadedById: input.uploadedById,
      punchKind: input.photo.kind,
    },
  );

  if (result.error || !result.attachment) {
    return { error: result.error ?? "Upload failed" };
  }

  const linked = await timeStore.linkPunchPhoto(
    input.entryId,
    input.photo.kind as TimePunchPhotoKind,
    result.attachment.id,
  );
  if (!linked) {
    return { error: "Could not link punch photo to entry" };
  }

  return { attachmentId: result.attachment.id };
}
