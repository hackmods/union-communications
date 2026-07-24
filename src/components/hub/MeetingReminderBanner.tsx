"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";
import type { NextMeetingInfo } from "@/types/meetings";

/** Officer in-app reminder — no auto-email. Shows within this many days of the next meeting. */
const REMINDER_WINDOW_DAYS = 7;

export function MeetingReminderBanner() {
  const { status } = useSession();
  const t = useTranslations("hub");
  const [nextMeeting, setNextMeeting] = useState<NextMeetingInfo | null>(null);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/meetings/upcoming")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        setNextMeeting(json.nextMeeting ?? null);
        setDays(typeof json.daysUntil === "number" ? json.daysUntil : null);
      })
      .catch(() => {
        if (!cancelled) {
          setNextMeeting(null);
          setDays(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (
    status !== "authenticated" ||
    !nextMeeting ||
    days == null ||
    days < 0 ||
    days > REMINDER_WINDOW_DAYS
  ) {
    return null;
  }

  return (
    <div
      className="border-b border-opseu-blue/30 bg-opseu-blue/5 text-opseu-dark"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex flex-wrap items-center justify-between gap-2 py-2 text-sm",
        )}
      >
        <p>
          {t("meetingBanner", {
            days,
            date: new Date(nextMeeting.startsAt).toLocaleString(),
          })}
        </p>
        <Link href="/app/meetings" className="font-medium underline">
          {t("meetingBannerLink")}
        </Link>
      </div>
    </div>
  );
}
