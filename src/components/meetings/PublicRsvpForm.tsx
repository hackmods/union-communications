"use client";

import { useState, type FormEvent } from "react";
import type {
  PublicRsvpMeeting,
  RsvpAttending,
  RsvpJoinMode,
} from "@/types/meetings";

export function PublicRsvpForm({
  token,
  meeting,
  labels,
}: {
  token: string;
  meeting: PublicRsvpMeeting;
  labels: {
    attending: string;
    attendingYes: string;
    attendingMaybe: string;
    attendingNo: string;
    joinMode: string;
    onSite: string;
    remote: string;
    displayName: string;
    email: string;
    phone: string;
    guests: string;
    dietary: string;
    accessibility: string;
    roleOrOffice: string;
    consent: string;
    submit: string;
    submitting: string;
    success: string;
    closed: string;
    error: string;
    required: string;
  };
}) {
  const [attending, setAttending] = useState<RsvpAttending | "">("");
  const [joinMode, setJoinMode] = useState<RsvpJoinMode | "">("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState("0");
  const [dietary, setDietary] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [roleOrOffice, setRoleOrOffice] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (meeting.tokenRevoked || meeting.tokenExpired) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {labels.closed}
      </p>
    );
  }

  if (done) {
    return (
      <p
        className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
        role="status"
      >
        {labels.success}
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim() || !attending) {
      setError(labels.required);
      return;
    }
    if ((attending === "yes" || attending === "maybe") && !joinMode) {
      setError(labels.required);
      return;
    }
    if (!consent) {
      setError(labels.required);
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        attending,
        consentAccepted: true,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        dietaryNote: dietary.trim() || undefined,
        accessibilityNote: accessibility.trim() || undefined,
        roleOrOffice: roleOrOffice.trim() || undefined,
      };
      if (attending !== "no") {
        body.joinMode = joinMode;
        if (joinMode === "on_site") {
          body.guestsOnSite = Number.parseInt(guests, 10) || 0;
        }
      }
      const res = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("fail");
      setDone(true);
    } catch {
      setError(labels.error);
    } finally {
      setSubmitting(false);
    }
  }

  const showJoin = attending === "yes" || attending === "maybe";
  const showOnSiteExtras = showJoin && joinMode === "on_site";

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-name">
          {labels.displayName}
        </label>
        <input
          id="rsvp-name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-900">
          {labels.attending}
        </legend>
        {(
          [
            ["yes", labels.attendingYes],
            ["maybe", labels.attendingMaybe],
            ["no", labels.attendingNo],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="attending"
              checked={attending === value}
              onChange={() => {
                setAttending(value);
                if (value === "no") setJoinMode("");
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {showJoin && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-900">
            {labels.joinMode}
          </legend>
          {(
            [
              ["on_site", labels.onSite],
              ["remote", labels.remote],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="joinMode"
                checked={joinMode === value}
                onChange={() => setJoinMode(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}

      {showOnSiteExtras && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-guests">
              {labels.guests}
            </label>
            <input
              id="rsvp-guests"
              type="number"
              min={0}
              max={20}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-dietary">
              {labels.dietary}
            </label>
            <input
              id="rsvp-dietary"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-access">
          {labels.accessibility}
        </label>
        <input
          id="rsvp-access"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-role">
          {labels.roleOrOffice}
        </label>
        <input
          id="rsvp-role"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={roleOrOffice}
          onChange={(e) => setRoleOrOffice(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-email">
          {labels.email}
        </label>
        <input
          id="rsvp-email"
          type="email"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="rsvp-phone">
          {labels.phone}
        </label>
        <input
          id="rsvp-phone"
          type="tel"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>{labels.consent}</span>
      </label>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 py-2 text-sm font-semibold text-white hover:bg-opseu-dark disabled:opacity-50"
      >
        {submitting ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
