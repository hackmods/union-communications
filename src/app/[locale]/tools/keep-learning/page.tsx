import { redirect } from "next/navigation";

/** Hollow Create hub — Learn is the real surface. */
export default async function KeepLearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/learn/`);
}
