import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OutreachListsBoard } from "@/components/hub/OutreachListsBoard";

export const dynamic = "force-dynamic";

export default async function OutreachListsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <OutreachListsBoard />
    </main>
  );
}
