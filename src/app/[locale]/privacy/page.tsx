import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const hubPublic = isOfficerHubPublic();

  return (
    <GuideLayout title="Privacy Policy" subtitle="Last updated: July 2026">
      <div className="space-y-8">
        <Callout>
          <p className="font-semibold text-opseu-dark">
            {hubPublic ? "Two surfaces, two rules" : "On-device Comms"}
          </p>
          <p className="mt-2 text-gray-700">
            {hubPublic ? (
              <>
                UnionOps separates public communications tools from the Officer Hub. Comms
                graphics and brand settings are designed to stay on your device. The Officer
                Hub runs on whatever host operates that instance — and that operator becomes
                responsible for the data it holds.
              </>
            ) : (
              <>
                UnionOps public tools are local-first Comms: graphics and brand settings are
                designed to stay on your device. An Officer Hub for casework is in development
                and is not part of the public launch surface yet.
              </>
            )}
          </p>
        </Callout>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            Comms tools (on your device)
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>Image processing, templates, and file preparation happen in your browser</li>
            <li>Brand kit settings are stored in browser local storage</li>
            <li>No analytics, tracking cookies, or third-party ad scripts</li>
            <li>Member photos used in graphics are not uploaded to UnionOps servers by the Comms tools</li>
          </ul>
        </section>

        {hubPublic ? (
          <section className="border-l-2 border-opseu-blue/30 pl-5">
            <h2 className="text-xl font-bold text-opseu-dark">
              Officer Hub (hosted instance)
            </h2>
            <p className="mt-3 max-w-prose text-gray-700">
              Signing in to an Officer Hub means that instance processes account sessions and
              any grievance, bumping, or related records it stores. Today&apos;s evaluation
              builds may use in-memory stores for demos; a production host should configure
              secure secrets and, when available, a proper database with tenant isolation.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              <li>
                <strong>If you self-host or operate CapRover / Docker:</strong> you are the
                data controller for that instance. Prefer Canadian hosting for confidential
                modules. Set a unique <code>AUTH_SECRET</code>. Do not use demo passwords for
                real member casework.
              </li>
              <li>
                <strong>Encrypted hybrid export:</strong> backup passphrases are entered in
                the browser and are not sent to the server as part of the hybrid encrypt flow.
              </li>
              <li>
                Demo accounts exist for workshops and CI only — not for live confidential
                files.
              </li>
            </ul>
          </section>
        ) : null}

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            Ontario privacy legislation
          </h2>
          <p className="mt-3 max-w-prose text-gray-700">
            {hubPublic ? (
              <>
                UnionOps is designed around the principles of Canada&apos;s privacy framework,
                including PIPEDA and, where applicable, FIPPA for public-sector members. Comms
                tools minimize collection by keeping work on-device. Hosted Officer Hub operators
                must apply access control, retention, and breach practices appropriate to
                confidential labour records.
              </>
            ) : (
              <>
                UnionOps is designed around the principles of Canada&apos;s privacy framework,
                including PIPEDA and, where applicable, FIPPA for public-sector members. Comms
                tools minimize collection by keeping work on-device.
              </>
            )}
          </p>
        </section>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">Your responsibilities</p>
          <p className="mt-2 text-gray-700">
            You remain responsible for obtaining member consent before using photos in
            social media graphics, and for ensuring posts and case handling comply with your
            local&apos;s policies and collective agreement. This tool does not provide legal
            advice. See the{" "}
            <Link href="/guide/photo-consent" className="text-opseu-blue underline">
              photo consent checklist
            </Link>{" "}
            for a short steward practice guide.
          </p>
        </Callout>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">Desktop / install as an app</p>
          <p className="mt-2 text-gray-700">
            On unionops.org, supported browsers can install UnionOps as a local app window
            (progressive web app). The offline shell stays on-device; hub case data still
            needs a network when live. See the quiet{" "}
            <Link href="/install" className="text-opseu-blue underline">
              install guide
            </Link>
            .
          </p>
        </Callout>

        <Callout tone="plain">
          <p className="font-semibold text-opseu-dark">Contact</p>
          <p className="mt-2 text-gray-700">
            UnionOps is stewarded by Ryan Morris. For questions about this privacy policy,
            contact your local communications chair or see{" "}
            <Link href="/support" className="text-opseu-blue underline">
              Support
            </Link>
            .
          </p>
        </Callout>
      </div>
    </GuideLayout>
  );
}
