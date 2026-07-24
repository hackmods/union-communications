import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MeetingScheduleSettings } from "@/components/meetings/MeetingScheduleSettings";
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
  if (!session.user.mfaVerified) {
    redirect(`/${locale}/app/mfa`);
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessMeetingsModule(roles) || !session.user.unionId) {
    redirect(`/${locale}/app`);
  }

  return <MeetingScheduleSettings canWrite={canWriteMeetingSchedule(roles)} />;
}
