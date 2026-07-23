import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HubNotFound() {
  const t = await getTranslations("routeUi");

  return (
    <div className="mx-auto max-w-lg py-4">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-2 text-gray-600">{t("hubNotFoundBody")}</p>
      <p className="mt-6">
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        >
          {t("backToHub")}
        </Link>
      </p>
    </div>
  );
}
