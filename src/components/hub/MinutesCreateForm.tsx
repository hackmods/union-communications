"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  MeetingType,
  Motion,
  MotionResult,
} from "@/types/minutes";

const EMPTY_MOTION: Motion = {
  text: "",
  movedBy: "",
  secondedBy: "",
  vote: { for: 0, against: 0, abstain: 0 },
  result: "carried",
};

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function MinutesCreateForm() {
  const t = useTranslations("minutes");
  const router = useRouter();
  const [meetingDate, setMeetingDate] = useState(() =>
    toDateInputValue(new Date().toISOString()),
  );
  const [meetingType, setMeetingType] = useState<MeetingType>("exec");
  const [attendeesText, setAttendeesText] = useState("");
  const [notes, setNotes] = useState("");
  const [motions, setMotions] = useState<Motion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateMotion(index: number, patch: Partial<Motion>) {
    setMotions((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
  }

  function updateVote(
    index: number,
    key: "for" | "against" | "abstain",
    value: string,
  ) {
    const n = Math.max(0, Number.parseInt(value, 10) || 0);
    setMotions((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, vote: { ...m.vote, [key]: n } } : m,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const attendees = attendeesText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const dateIso = new Date(`${meetingDate}T12:00:00`).toISOString();

    const res = await fetch("/api/minutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingDate: dateIso,
        meetingType,
        attendees,
        motions,
        notes,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      setError(t("createError"));
      return;
    }
    const data = (await res.json()) as { minutes: { id: string } };
    router.push(`/app/minutes/${data.minutes.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-opseu-dark">{t("createTitle")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("createSubtitle")}</p>
      </div>

      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="minutes-date"
                className="mb-1 block text-sm font-medium text-opseu-dark"
              >
                {t("fields.meetingDate")}
              </label>
              <Input
                id="minutes-date"
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="minutes-type"
                className="mb-1 block text-sm font-medium text-opseu-dark"
              >
                {t("fields.meetingType")}
              </label>
              <Select
                id="minutes-type"
                value={meetingType}
                onChange={(e) =>
                  setMeetingType(e.target.value as MeetingType)
                }
              >
                <option value="exec">{t("meetingType.exec")}</option>
                <option value="general">{t("meetingType.general")}</option>
                <option value="committee">{t("meetingType.committee")}</option>
              </Select>
            </div>
          </div>

          <div>
            <label
              htmlFor="minutes-attendees"
              className="mb-1 block text-sm font-medium text-opseu-dark"
            >
              {t("fields.attendees")}
            </label>
            <Textarea
              id="minutes-attendees"
              rows={3}
              value={attendeesText}
              onChange={(e) => setAttendeesText(e.target.value)}
              placeholder={t("fields.attendeesHint")}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <CardTitle className="text-base">{t("fields.motions")}</CardTitle>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setMotions((prev) => [...prev, { ...EMPTY_MOTION }])
                }
              >
                {t("addMotion")}
              </Button>
            </div>
            {motions.length === 0 ? (
              <p className="text-sm text-gray-600">{t("noMotionsYet")}</p>
            ) : (
              <ul className="space-y-4">
                {motions.map((motion, index) => (
                  <li
                    key={index}
                    className="space-y-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-medium text-opseu-dark">
                        {t("motionN", { n: index + 1 })}
                      </span>
                      <button
                        type="button"
                        className="text-sm text-red-700 hover:underline"
                        onClick={() =>
                          setMotions((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        {t("removeMotion")}
                      </button>
                    </div>
                    <Textarea
                      required
                      rows={2}
                      value={motion.text}
                      onChange={(e) =>
                        updateMotion(index, { text: e.target.value })
                      }
                      placeholder={t("fields.motionText")}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        required
                        value={motion.movedBy}
                        onChange={(e) =>
                          updateMotion(index, { movedBy: e.target.value })
                        }
                        placeholder={t("fields.movedBy")}
                        aria-label={t("fields.movedBy")}
                      />
                      <Input
                        required
                        value={motion.secondedBy}
                        onChange={(e) =>
                          updateMotion(index, { secondedBy: e.target.value })
                        }
                        placeholder={t("fields.secondedBy")}
                        aria-label={t("fields.secondedBy")}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={motion.vote.for}
                        onChange={(e) =>
                          updateVote(index, "for", e.target.value)
                        }
                        aria-label={t("fields.voteFor")}
                        placeholder={t("fields.voteFor")}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={motion.vote.against}
                        onChange={(e) =>
                          updateVote(index, "against", e.target.value)
                        }
                        aria-label={t("fields.voteAgainst")}
                        placeholder={t("fields.voteAgainst")}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={motion.vote.abstain}
                        onChange={(e) =>
                          updateVote(index, "abstain", e.target.value)
                        }
                        aria-label={t("fields.voteAbstain")}
                        placeholder={t("fields.voteAbstain")}
                      />
                    </div>
                    <Select
                      value={motion.result}
                      onChange={(e) =>
                        updateMotion(index, {
                          result: e.target.value as MotionResult,
                        })
                      }
                      aria-label={t("fields.result")}
                    >
                      <option value="carried">{t("result.carried")}</option>
                      <option value="defeated">{t("result.defeated")}</option>
                      <option value="tabled">{t("result.tabled")}</option>
                    </Select>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="minutes-notes"
              className="mb-1 block text-sm font-medium text-opseu-dark"
            >
              {t("fields.notes")}
            </label>
            <Textarea
              id="minutes-notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
            <Link
              href="/app/minutes"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              {t("cancel")}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
