import { setRequestLocale } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";

const scenarios = [
  {
    title: "Strike action",
    items: [
      "Designate one spokesperson — all public statements go through them",
      "Use pre-approved graphics from this toolbox for consistency",
      "Post picket line times, locations, and safety reminders daily",
      "Do not post photos of members without consent",
      "Coordinate messaging with your national rep before major announcements",
    ],
  },
  {
    title: "Layoffs and restructuring",
    items: [
      "Acknowledge member anxiety — be empathetic and factual",
      "Direct members to stewards and EAP resources",
      "Do not speculate about outcomes — share only confirmed information",
      "Use quote cards from elected leaders to show unified leadership",
      "Document management communications for grievance purposes (offline)",
    ],
  },
  {
    title: "Management pushback",
    items: [
      "Never respond emotionally — stick to facts and the collective agreement",
      "If management posts misinformation, counter with a brief factual correction",
      "Escalate harassment or threats to your national rep immediately",
      "Do not engage in public arguments with management accounts",
      "Keep members informed through official local channels only",
    ],
  },
];

export default async function CrisisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Crisis Comms Playbook</h1>
      <p className="mt-2 text-lg text-gray-600">
        Guidance for high-stakes communications during strikes, layoffs, and management conflicts.
      </p>

      <div className="mt-10 space-y-6">
        {scenarios.map((scenario) => (
          <Card key={scenario.title}>
            <CardTitle>{scenario.title}</CardTitle>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {scenario.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
