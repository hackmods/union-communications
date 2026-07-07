import { setRequestLocale } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: July 2026</p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardTitle>Privacy by design</CardTitle>
          <p className="mt-3 text-gray-700">
            The OPSEU Local Social Media Toolbox is designed so that all image processing,
            branding configuration, and file uploads happen entirely on your device. We do
            not collect, store, or transmit any personal information, member photos, or local
            branding data to any server.
          </p>
        </Card>

        <Card>
          <CardTitle>No data collection</CardTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>No user accounts or login required</li>
            <li>No analytics, tracking cookies, or third-party scripts</li>
            <li>No member photos or branding data sent over the network</li>
            <li>Brand kit settings stored only in your browser&apos;s local storage</li>
          </ul>
        </Card>

        <Card>
          <CardTitle>Ontario privacy legislation</CardTitle>
          <p className="mt-3 text-gray-700">
            This tool is designed to comply with the principles of Ontario&apos;s privacy
            framework, including the Personal Information Protection and Electronic Documents
            Act (PIPEDA) and, where applicable, the Freedom of Information and Protection of
            Privacy Act (FIPPA) for public-sector members. Because no personal information
            is collected by this application, the risk of privacy breaches through the tool
            itself is eliminated.
          </p>
        </Card>

        <Card>
          <CardTitle>Your responsibilities</CardTitle>
          <p className="mt-3 text-gray-700">
            While this tool protects your data, you remain responsible for obtaining member
            consent before using photos in social media graphics, and for ensuring posts comply
            with your local&apos;s communications policies and the collective agreement.
          </p>
        </Card>

        <Card>
          <CardTitle>Contact</CardTitle>
          <p className="mt-3 text-gray-700">
            For questions about this privacy policy or the toolbox, contact your local
            communications chair or CAAT division representative.
          </p>
        </Card>
      </div>
    </div>
  );
}
