import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";

const chapters = [
  {
    title: "Which platforms to choose",
    content:
      "Facebook reaches a broad member demographic and supports longer posts and event pages. Instagram works well for visual storytelling and younger members. Start with one platform, do it well, then expand. For CAAT Support Staff locals, Facebook is often the primary channel.",
  },
  {
    title: "Tone of voice",
    content:
      "Be professional but human. Speak as a collective ('we', 'our members') not as management. Celebrate wins, explain setbacks honestly, and always centre member voices. Avoid jargon — write for members reading on their phone during a break.",
  },
  {
    title: "Posting frequency",
    content:
      "Aim for 2–3 posts per week minimum during normal times. Increase during bargaining or strike action. Consistency beats volume — a steady rhythm builds trust. Use a simple content mix: 40% updates, 30% member stories, 20% education, 10% solidarity/culture.",
  },
  {
    title: "Dealing with trolls and management",
    content:
      "Do not engage with bad-faith comments. Hide or delete spam, harassment, and misinformation. For management pushback, stick to facts, cite the collective agreement, and escalate to your communications chair or national rep. Never post confidential bargaining details.",
  },
  {
    title: "Accessibility — alt-text",
    content:
      "Every image post needs alt-text describing what's in the image for visually impaired members. Use the Alt-Text Assistant tool in this toolbox. Keep descriptions concise but complete: who, what, where, and any text shown in the graphic.",
  },
];

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nav = await getTranslations("nav");
  const crisis = await getTranslations("crisisGuide");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">The Blueprint</h1>
      <p className="mt-2 text-lg text-gray-600">
        A step-by-step handbook for starting and running your local&apos;s social media.
      </p>

      <Card className="mt-8 border-opseu-blue/20 bg-opseu-blue/5">
        <CardTitle>{crisis("title")}</CardTitle>
        <p className="mt-2 text-sm text-gray-700">{crisis("subtitle")}</p>
        <a
          href={`/${locale}/guide/crisis/`}
          className="mt-3 inline-block text-sm font-medium text-opseu-blue underline"
        >
          {nav("strikeGuide")} →
        </a>
      </Card>

      <div className="mt-10 space-y-6">
        {chapters.map((chapter, i) => (
          <Card key={chapter.title}>
            <CardTitle>
              {i + 1}. {chapter.title}
            </CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">{chapter.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
