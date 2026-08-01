"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProfilePhotoCapture } from "@/components/hub/ProfilePhotoCapture";

export default function ProfilePage() {
  const t = useTranslations("hub");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/app/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const probe = async () => {
      try {
        const res = await fetch("/api/profile/avatar", { method: "GET" });
        if (cancelled) return;
        if (res.ok) {
          setImageUrl(`/api/profile/avatar?t=${Date.now()}`);
        } else {
          setImageUrl(null);
        }
      } catch {
        if (!cancelled) setImageUrl(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    void probe();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading" || !session?.user || !checked) {
    return (
      <div className="mx-auto w-full max-w-lg py-4 md:py-6">
        <p className="text-gray-600" aria-live="polite">
          {t("sessionLoading")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 py-2 md:py-4">
      <div>
        <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
          {t("profileTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          {t("profileSubtitle")}
        </p>
      </div>

      <Card>
        <CardTitle>{t("profilePhotoHeading")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("profilePhotoHint")}</p>
        <div className="mt-4">
          <ProfilePhotoCapture
            currentImageUrl={imageUrl}
            onSaved={setImageUrl}
          />
        </div>
      </Card>

      <Card density="compact">
        <h2 className="text-sm font-medium text-gray-700">
          {t("profileAccountHeading")}
        </h2>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t("profileName")}</dt>
            <dd>{session.user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t("email")}</dt>
            <dd>{session.user.email ?? "—"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
