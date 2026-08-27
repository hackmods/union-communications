import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";

type Props = {
  slug: string;
  moduleNumber: number;
  className?: string;
};

/** Points peer steward playbooks at the matching Officer Learning module. */
export async function OfficerLearningModuleCallout({
  slug,
  moduleNumber,
  className,
}: Props) {
  const t = await getTranslations("officerLearning");

  return (
    <Callout tone="brand" className={className ?? "mb-8 max-w-3xl"}>
      <p className="font-semibold text-opseu-dark">{t("deepen.title")}</p>
      <p className="mt-2 leading-relaxed text-gray-700">
        {t("deepen.body", { number: moduleNumber })}
      </p>
      <Link
        href={`/guide/officer-learning/${slug}`}
        className="mt-3 inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2"
      >
        {t(`modules.${slug}.title`)} →
      </Link>
    </Callout>
  );
}
