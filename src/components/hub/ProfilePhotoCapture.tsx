"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

const TARGET_SIZE = 512;
const JPEG_QUALITY = 0.85;

async function fileToResizedJpeg(file: File): Promise<{
  mimeType: "image/jpeg";
  contentBase64: string;
  previewUrl: string;
}> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TARGET_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const contentBase64 = dataUrl.split(",")[1] ?? "";
  return { mimeType: "image/jpeg", contentBase64, previewUrl: dataUrl };
}

function canvasFromVideo(video: HTMLVideoElement): {
  mimeType: "image/jpeg";
  contentBase64: string;
  previewUrl: string;
} {
  const scale = Math.min(
    1,
    TARGET_SIZE / Math.max(video.videoWidth || 1, video.videoHeight || 1),
  );
  const width = Math.max(1, Math.round((video.videoWidth || TARGET_SIZE) * scale));
  const height = Math.max(
    1,
    Math.round((video.videoHeight || TARGET_SIZE) * scale),
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const contentBase64 = dataUrl.split(",")[1] ?? "";
  return { mimeType: "image/jpeg", contentBase64, previewUrl: dataUrl };
}

type ProfilePhotoCaptureProps = {
  currentImageUrl: string | null;
  onSaved: (imageUrl: string | null) => void;
};

export function ProfilePhotoCapture({
  currentImageUrl,
  onSaved,
}: ProfilePhotoCaptureProps) {
  const t = useTranslations("hub");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [pending, setPending] = useState<{
    mimeType: "image/jpeg";
    contentBase64: string;
    previewUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("profileCameraUnsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setError(t("profileCameraDenied"));
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError(t("profileCaptureFailed"));
      return;
    }
    try {
      setPending(canvasFromVideo(video));
      stopCamera();
      setError(null);
    } catch {
      setError(t("profileCaptureFailed"));
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      setPending(await fileToResizedJpeg(file));
      stopCamera();
    } catch {
      setError(t("profileCaptureFailed"));
    }
  };

  const save = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: pending.mimeType,
          contentBase64: pending.contentBase64,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? t("profileSaveFailed"));
        return;
      }
      const body = (await res.json()) as { imageUrl?: string };
      setPending(null);
      onSaved(body.imageUrl ?? `/api/profile/avatar?t=${Date.now()}`);
    } catch {
      setError(t("profileSaveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        setError(t("profileRemoveFailed"));
        return;
      }
      setPending(null);
      onSaved(null);
    } catch {
      setError(t("profileRemoveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const preview = pending?.previewUrl ?? currentImageUrl;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated blob/API URL
            <img
              src={preview}
              alt={t("profilePhotoAlt")}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-gray-400">{t("profileNoPhoto")}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!cameraOn ? (
            <Button type="button" variant="outline" onClick={startCamera}>
              {t("profileTakePhoto")}
            </Button>
          ) : (
            <>
              <Button type="button" onClick={captureFrame}>
                {t("profileCapture")}
              </Button>
              <Button type="button" variant="ghost" onClick={stopCamera}>
                {t("profileCancelCamera")}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            {t("profileChoosePhoto")}
          </Button>
          {(pending || currentImageUrl) && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={remove}
            >
              {t("profileRemovePhoto")}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="sr-only"
        onChange={onFileChange}
      />

      {cameraOn ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="mx-auto max-h-72 w-full object-contain"
            aria-label={t("profileCameraPreview")}
          />
        </div>
      ) : null}

      {pending ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={save}>
            {busy ? t("profileSaving") : t("profileSavePhoto")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            {t("profileDiscard")}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
