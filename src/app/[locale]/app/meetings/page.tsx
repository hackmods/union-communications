import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MeetingEventsBoard } from "@/components/meetings/MeetingEventsBoard";
import { MeetingScheduleSettings } from "@/components/meetings/MeetingScheduleSettings";
import { meetingsRsvpDbBackend } from "@/lib/db/backend";
import {
  canAccessMeetingsModule,
  canWriteMeetingSchedule,
} from "@/lib/meetings/access";
import type { UserRole } from "@/types/tenant";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!sessionMfaOk(session)) {
    redirect(`/${locale}/app/mfa`);
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessMeetingsModule(roles) || !session.user.unionId) {
    redirect(`/${locale}/app`);
  }

  const canWrite = canWriteMeetingSchedule(roles);

  return (
    <div className="space-y-2">
      <MeetingScheduleSettings canWrite={canWrite} />
      <MeetingEventsBoard
        canWrite={canWrite}
        showMemoryBanner={meetingsRsvpDbBackend() === "memory"}
      />
    </div>
  );
}
