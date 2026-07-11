"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { ExamplePostMockup } from "@/components/examples/ExamplePostMockup";
import {
  captionHref,
  primaryToolHref,
  type ExamplePost,
} from "@/lib/constants/examples";
import { cn } from "@/lib/utils";

const ctaClass =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";

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
    <Card className="mb-4 flex break-inside-avoid flex-col">
      <ExamplePostMockup
        layout={post.layout}
        aspect={post.aspect}
        platformLabel={t(`platforms.${post.platform}`)}
        copy={{ headline, body, detail, initials }}
      />
      <CardTitle className="mt-3">{title}</CardTitle>
      <p className="mt-2 text-sm text-gray-600">{description}</p>

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
        <Link
          href={toolHref}
          className={cn(ctaClass, "bg-opseu-blue text-white hover:bg-opseu-dark")}
        >
          {toolLabel}
        </Link>
        {post.captionId && (
          <Link
            href={captionHref(post.captionId)}
            className={cn(
              ctaClass,
              "border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5",
            )}
          >
            {t("cta.caption")}
          </Link>
        )}
      </div>
    </Card>
  );
}
