import { Link } from "@/i18n/navigation";
import {
  guideCtaClassBlock,
  guideCtaOutlineClassBlock,
} from "@/components/comms/guideCtaClasses";

export type GuideToolAsideLink = {
  href: string;
  label: string;
  variant?: "primary" | "outline";
};

type GuideToolAsideProps = {
  title: string;
  intro?: string;
  links: GuideToolAsideLink[];
};

/** Sticky tool handoff card for playbook guide sidebar @ lg+. */
export function GuideToolAside({ title, intro, links }: GuideToolAsideProps) {
  return (
    <div className="rounded-2xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.06] to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-opseu-blue">
        {title}
      </p>
      {intro ? (
        <p className="mt-2 text-sm leading-snug text-gray-700">{intro}</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {links.map(({ href, label, variant = "primary" }) => (
          <li key={href}>
            <Link
              href={href}
              className={
                variant === "outline"
                  ? guideCtaOutlineClassBlock
                  : guideCtaClassBlock
              }
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
