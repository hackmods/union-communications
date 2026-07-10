import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { CAAT_OPSEU_COLORS } from "@/lib/constants/brand";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import Image from "next/image";

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ts = await getTranslations("sources");

  const swatches = [
    { name: "OPSEU Blue (Pantone 285)", hex: CAAT_OPSEU_COLORS.primary },
    { name: "CAAT Accent Yellow", hex: CAAT_OPSEU_COLORS.secondary },
    { name: "OPSEU Dark Blue", hex: CAAT_OPSEU_COLORS.accent },
    { name: "White", hex: CAAT_OPSEU_COLORS.white },
    { name: "Black", hex: CAAT_OPSEU_COLORS.black },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">CAAT OPSEU Asset Pack</h1>
      <p className="mt-2 text-gray-600">
        Official OPSEU and CAAT Support brand colours, logos, and usage guidelines for local social media.
        This toolbox complements OPSEU&apos;s own resources — locals manage their own comms branding.
      </p>

      <Card className="mt-8">
        <CardTitle>Primary logo</CardTitle>
        <div className="mt-4 flex items-center gap-6">
          <Image
            src="/assets/caat-opseu/logo-primary.svg"
            alt="CAAT OPSEU primary logo"
            width={120}
            height={120}
          />
          <a
            href="/assets/caat-opseu/logo-primary.svg"
            download
            className="text-opseu-blue underline"
          >
            Download SVG
          </a>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle>Colour swatches</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.hex} className="text-center">
              <div
                className="mx-auto h-16 w-16 rounded-lg border border-gray-200"
                style={{ backgroundColor: s.hex }}
              />
              <p className="mt-2 text-sm font-medium">{s.name}</p>
              <p className="text-xs text-gray-500">{s.hex}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle>Usage guidelines</CardTitle>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          <li>Always maintain clear space around the logo equal to the height of the &quot;CAAT&quot; text</li>
          <li>Do not stretch, rotate, or recolour the official logo</li>
          <li>Primary blue (#003DA5) is OPSEU Pantone 285 — the official union brand colour</li>
          <li>Yellow (#FFD200) is a CAAT Support campaign accent for graphics, not the main OPSEU brand colour</li>
          <li>Use primary blue on light backgrounds; white logo on dark backgrounds</li>
          <li>Local numbers and sub-text may be added below the logo using approved fonts</li>
          <li>For questions about brand usage, contact your division communications chair</li>
          <li>
            Official source:{" "}
            <a
              href="https://opseu.org/information/opseu-graphics-logos-and-letterhead-templates/12263"
              target="_blank"
              rel="noopener noreferrer"
              className="text-opseu-blue underline"
            >
              OPSEU/SEFPO graphics, logos &amp; letterhead
            </a>
          </li>
        </ul>
      </Card>

      <SourcesBlock pageId="assets" title={ts("title")} intro={ts("intro")} />
    </div>
  );
}
