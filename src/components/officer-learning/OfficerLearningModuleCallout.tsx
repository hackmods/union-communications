import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";

export type OfficerLearningCalloutFocus = "bargaining" | "strike" | "crisis";

type Props = {
  slug: string;
  moduleNumber: number;
  /** Optional page-specific lead under officerLearning.callout.focus.* */
  focus?: OfficerLearningCalloutFocus;
  className?: string;
};

/** Points peer steward playbooks at the matching Officer Learning module. */
export async function OfficerLearningModuleCallout({
  slug,
  moduleNumber,
  focus,
  className,
}: Props) {
  const t = await getTranslations("officerLearning");
  const variant =
    moduleNumber % 3 === 1
      ? "practice"
      : moduleNumber % 3 === 2
        ? "file"
        : "meeting";
  const body = focus
    ? t(`callout.focus.${focus}`, { number: moduleNumber })
    : t(`deepen.variants.${variant}`, { number: moduleNumber });

  return (
    <Callout tone="brand" className={className ?? "mb-8 max-w-3xl"}>
      <p className="font-semibold text-opseu-dark">{t("deepen.title")}</p>
      <p className="mt-2 leading-relaxed text-gray-700">{body}</p>
      <Link
        href={`/learn/officer/${slug}`}
        className="mt-3 inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2"
      >
        {t(`modules.${slug}.title`)} →
      </Link>
    </Callout>
  );
}
