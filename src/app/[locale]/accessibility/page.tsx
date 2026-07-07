import { setRequestLocale } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Accessibility Statement</h1>
      <p className="mt-2 text-sm text-gray-500">AODA / WCAG 2.1 Level AA commitment</p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardTitle>Our commitment</CardTitle>
          <p className="mt-3 text-gray-700">
            The OPSEU Local Social Media Toolbox is committed to ensuring digital accessibility
            for all members, including those with disabilities. We aim to conform to the
            Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and the Accessibility
            for Ontarians with Disabilities Act (AODA).
          </p>
        </Card>

        <Card>
          <CardTitle>Accessibility features</CardTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>Semantic HTML with proper heading hierarchy</li>
            <li>Keyboard navigation support throughout</li>
            <li>Visible focus indicators on all interactive elements</li>
            <li>Colour contrast checked against WCAG AA standards</li>
            <li>Alt-text on all informational images</li>
            <li>Reduced motion support via prefers-reduced-motion</li>
            <li>English and French language options</li>
            <li>Alt-Text Assistant tool to help create accessible social media posts</li>
          </ul>
        </Card>

        <Card>
          <CardTitle>Known limitations</CardTitle>
          <p className="mt-3 text-gray-700">
            Canvas-based image preview areas may not be fully accessible to screen reader
            users. All inputs that control the preview are accessible via standard form
            controls. Exported images should include alt-text added via the Alt-Text Assistant.
          </p>
        </Card>

        <Card>
          <CardTitle>Feedback</CardTitle>
          <p className="mt-3 text-gray-700">
            If you encounter accessibility barriers while using this toolbox, please contact
            your local communications chair. We welcome feedback and are committed to
            continuous improvement.
          </p>
        </Card>
      </div>
    </div>
  );
}
