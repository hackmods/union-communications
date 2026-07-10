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
    { name: "OPSEU Dark Blue", hex: CAAT_OPSEU_COLORS.accent },
    { name: "White (graphics accent)", hex: CAAT_OPSEU_COLORS.secondary },
    { name: "Black", hex: CAAT_OPSEU_COLORS.black },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">CAAT OPSEU Asset Pack</h1>
      <p className="mt-2 text-gray-600">
        Official OPSEU/SEFPO brand colours, logos, and usage guidelines for local social media.
        This toolbox complements OPSEU&apos;s own resources — locals manage their own comms branding.
      </p>

      <Card className="mt-8">
        <CardTitle>Primary logo</CardTitle>
        <div className="mt-4 flex items-center gap-6">
          <Image
            src="/assets/caat-opseu/logo-primary.png"
            alt="OPSEU SEFPO primary logo"
            width={200}
            height={80}
            className="object-contain"
          />
          <a
            href="/assets/caat-opseu/logo-primary.png"
            download
            className="text-opseu-blue underline"
          >
            Download PNG
          </a>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle>Colour swatches</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.name} className="text-center">
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
          <li>Always maintain clear space around the logo equal to the height of the wordmark</li>
          <li>Do not stretch, rotate, or recolour the official logo</li>
          <li>Primary blue (#003DA5) is OPSEU Pantone 285 — the official union brand colour</li>
          <li>White is the graphics accent for text and highlights on blue or dark backgrounds</li>
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
