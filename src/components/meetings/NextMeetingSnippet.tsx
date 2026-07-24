import type { NextMeetingInfo } from "@/types/meetings";

/**
 * Pure, no-PII "next meeting" display — safe for the public page and for
 * embedding in other public surfaces. Never pass union/local identifiers in.
 */
export function NextMeetingSnippet({
  nextMeeting,
  labels,
}: {
  nextMeeting: NextMeetingInfo | null;
  labels: {
    title: string;
    noMeeting: string;
    at: string;
  };
}) {
  if (!nextMeeting) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-600">{labels.noMeeting}</p>
      </div>
    );
  }

  const date = new Date(nextMeeting.startsAt);

  return (
    <div className="rounded-xl border border-opseu-blue/20 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">
        {labels.title}
      </h2>
      <p className="mt-2 text-2xl font-bold text-opseu-dark">
        {date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <p className="mt-1 text-lg text-gray-700">
        {labels.at} {date.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      <p className="mt-1 text-gray-600">{nextMeeting.location}</p>
      {nextMeeting.publicBlurb && (
        <p className="mt-3 text-sm text-gray-500">{nextMeeting.publicBlurb}</p>
      )}
    </div>
  );
}
