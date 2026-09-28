"use client";

import Link from "next/link";

const LABS = [
  { href: "/viewport-lab/", label: "Viewport Lab" },
  { href: "/load-test-lab/", label: "Load Test Lab" },
] as const;

export function LabsNav({ active }: { active: "viewport" | "load-test" }) {
  return (
    <nav
      aria-label="QA Labs"
      className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3"
    >
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        QA Labs
      </span>
      {LABS.map((lab) => {
        const isActive =
          (active === "viewport" && lab.href.startsWith("/viewport-lab")) ||
          (active === "load-test" && lab.href.startsWith("/load-test-lab"));
        return (
          <Link
            key={lab.href}
            href={lab.href}
            className={
              isActive
                ? "rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900"
                : "rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }
            aria-current={isActive ? "page" : undefined}
          >
            {lab.label}
          </Link>
        );
      })}
    </nav>
  );
}
