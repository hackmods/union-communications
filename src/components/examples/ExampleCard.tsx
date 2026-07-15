"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ExamplePostMockup } from "@/components/examples/ExamplePostMockup";
import {
  captionHref,
  primaryToolHref,
  type ExamplePost,
} from "@/lib/constants/examples";

interface ExampleCardProps {
  post: ExamplePost;
}

export function ExampleCard({ post }: ExampleCardProps) {
  const t = useTranslations("examples");
  const title = t(`posts.${post.id}.title`);
  const description = t(`posts.${post.id}.description`);
  const why1 = t(`posts.${post.id}.why.0`);
  const why2 = t(`posts.${post.id}.why.1`);
  const headline = t(`posts.${post.id}.mockup.headline`);
  const body = t(`posts.${post.id}.mockup.body`);
  const detail = t.has(`posts.${post.id}.mockup.detail`)
    ? t(`posts.${post.id}.mockup.detail`)
    : undefined;
  const initials = t.has(`posts.${post.id}.mockup.initials`)
    ? t(`posts.${post.id}.mockup.initials`)
    : undefined;

  const toolHref = primaryToolHref(post);
  const toolLabel =
    post.primaryTool === "quote-card"
      ? t("cta.quoteCard")
      : post.primaryTool === "flyer-maker"
        ? t("cta.flyer")
        : t("cta.graphic");

  return (
    <article className="mb-5 break-inside-avoid rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <Link
        href={toolHref}
        className="block rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-opseu-blue"
        aria-label={toolLabel}
      >
        <ExamplePostMockup
          layout={post.layout}
          aspect={post.aspect}
          platformLabel={t(`platforms.${post.platform}`)}
          copy={{ headline, body, detail, initials }}
        />
      </Link>
      <h2 className="mt-3 text-base font-bold text-opseu-dark">{title}</h2>
      <p className="mt-1.5 text-sm text-gray-600">{description}</p>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-opseu-dark">
          {t("whyHeading")}
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-600">
          <li>{why1}</li>
          <li>{why2}</li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={toolHref}>
          <Button size="sm">{toolLabel}</Button>
        </Link>
        {post.captionId && (
          <Link href={captionHref(post.captionId)}>
            <Button variant="outline" size="sm">
              {t("cta.caption")}
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}
