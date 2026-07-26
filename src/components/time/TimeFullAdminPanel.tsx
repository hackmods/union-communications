"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import type {
  PayrollExportProfile,
  PtoAccrualPolicy,
  TimeOtPolicy,
  TimeShiftSeries,
  TimeWorker,
  TimeWorkerGroup,
} from "@/types/time";

export function TimeFullAdminPanel() {
  const t = useTranslations("time");
  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [groups, setGroups] = useState<TimeWorkerGroup[]>([]);
  const [otPolicies, setOtPolicies] = useState<TimeOtPolicy[]>([]);
  const [series, setSeries] = useState<TimeShiftSeries[]>([]);
  const [accrualPolicies, setAccrualPolicies] = useState<PtoAccrualPolicy[]>(
    [],
  );
  const [payrollProfiles, setPayrollProfiles] = useState<PayrollExportProfile[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const [workerName, setWorkerName] = useState("");
  const [workerEmployeeNumber, setWorkerEmployeeNumber] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerJobTitle, setWorkerJobTitle] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [otPolicyName, setOtPolicyName] = useState("");
  const [seriesLabel, setSeriesLabel] = useState("");
  const [seriesStartTime, setSeriesStartTime] = useState("09:00");
  const [seriesDuration, setSeriesDuration] = useState("480");
  const [seriesStartsOn, setSeriesStartsOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [accrualName, setAccrualName] = useState("");
  const [accrualRate, setAccrualRate] = useState("0.0385");
  const [payrollName, setPayrollName] = useState("");
  const [payrollVendor, setPayrollVendor] =
    useState<PayrollExportProfile["vendor"]>("generic_csv");
  const [exportProfileId, setExportProfileId] = useState("");
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [exportTo, setExportTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const reload = useCallback(async () => {
    const [
      workersRes,
      groupsRes,
      otRes,
      seriesRes,
      accrualRes,
      payrollRes,
    ] = await Promise.all([
      fetch("/api/time/workers?includeInactive=true"),
      fetch("/api/time/groups"),
      fetch("/api/time/ot-policies"),
      fetch("/api/time/shift-series"),
      fetch("/api/time/pto/accrual-policies"),
      fetch("/api/time/payroll-profiles"),
    ]);
    if (
      !workersRes.ok ||
      !groupsRes.ok ||
      !otRes.ok ||
      !seriesRes.ok ||
      !accrualRes.ok ||
      !payrollRes.ok
    ) {
      setError(t("full8LoadError"));
      return;
    }
    const workersData = (await workersRes.json()) as { workers: TimeWorker[] };
    const groupsData = (await groupsRes.json()) as { groups: TimeWorkerGroup[] };
    const otData = (await otRes.json()) as { policies: TimeOtPolicy[] };
    const seriesData = (await seriesRes.json()) as { series: TimeShiftSeries[] };
    const accrualData = (await accrualRes.json()) as {
      policies: PtoAccrualPolicy[];
    };
    const payrollData = (await payrollRes.json()) as {
      profiles: PayrollExportProfile[];
    };
    setWorkers(workersData.workers);
    setGroups(groupsData.groups);
    setOtPolicies(otData.policies);
    setSeries(seriesData.series);
    setAccrualPolicies(accrualData.policies);
    setPayrollProfiles(payrollData.profiles);
    if (!exportProfileId && payrollData.profiles[0]) {
      setExportProfileId(payrollData.profiles[0].id);
    }
    setError(null);
  }, [exportProfileId, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function saveWorker() {
    if (!workerName.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: workerName.trim(),
          employeeNumber: workerEmployeeNumber || undefined,
          email: workerEmail || undefined,
          jobTitle: workerJobTitle || undefined,
        }),
      });
      if (!res.ok) throw new Error("worker");
      setWorkerName("");
      setWorkerEmployeeNumber("");
      setWorkerEmail("");
      setWorkerJobTitle("");
      await reload();
    } catch {
      setError(t("workerError"));
    } finally {
      setWorking(false);
    }
  }

  async function saveGroup() {
    if (!groupName.trim()) return;
    setWorking(true);
    try {
      const res = await fetch("/api/time/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          memberWorkerIds: groupMemberIds,
        }),
      });
      if (!res.ok) throw new Error("group");
      setGroupName("");
      setGroupMemberIds([]);
      await reload();
    } catch {
      setError(t("full8GroupError"));
    } finally {
      setWorking(false);
    }
  }

  async function saveOtPolicy() {
    if (!otPolicyName.trim()) return;
    setWorking(true);
    try {
      const res = await fetch("/api/time/ot-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: otPolicyName.trim(),
          payPeriodType: "biweekly",
          weeklyRegularHours: 40,
          dailyOtThreshold: 8,
        }),
      });
      if (!res.ok) throw new Error("ot");
      setOtPolicyName("");
      await reload();
    } catch {
      setError(t("full8OtError"));
    } finally {
      setWorking(false);
    }
  }

  async function saveShiftSeries() {
    if (!seriesLabel.trim()) return;
    setWorking(true);
    try {
      const res = await fetch("/api/time/shift-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: seriesLabel.trim(),
          startTime: seriesStartTime,
          durationMinutes: Number(seriesDuration),
          category: "staff",
          assignedWorkerIds: workers.slice(0, 1).map((w) => w.id),
          recurrence: {
            frequency: "weekly",
            weekdays: [1, 2, 3, 4, 5],
            startsOn: seriesStartsOn,
          },
          status: "draft",
        }),
      });
      if (!res.ok) throw new Error("series");
      setSeriesLabel("");
      await reload();
    } catch {
      setError(t("full8SeriesError"));
    } finally {
      setWorking(false);
    }
  }

  async function expandSeries(id: string) {
    setWorking(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      to.setDate(to.getDate() + 28);
      const res = await fetch(`/api/time/shift-series/${id}/expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("expand");
      await reload();
    } catch {
      setError(t("full8ExpandError"));
    } finally {
      setWorking(false);
    }
  }

  async function saveAccrualPolicy() {
    if (!accrualName.trim()) return;
    setWorking(true);
    try {
      const res = await fetch("/api/time/pto/accrual-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accrualName.trim(),
          ptoType: "vacation",
          formulaType: "hours_worked",
          hoursWorkedRate: Number(accrualRate),
          eligibleCategories: ["staff", "release"],
        }),
      });
      if (!res.ok) throw new Error("accrual");
      setAccrualName("");
      await reload();
    } catch {
      setError(t("full8AccrualError"));
    } finally {
      setWorking(false);
    }
  }

  async function runAccrual() {
    setWorking(true);
    try {
      const res = await fetch("/api/time/pto/accrual-policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: new Date(exportFrom).toISOString(),
          to: new Date(exportTo).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("run");
      await reload();
    } catch {
      setError(t("full8AccrualRunError"));
    } finally {
      setWorking(false);
    }
  }

  async function savePayrollProfile() {
    if (!payrollName.trim()) return;
    setWorking(true);
    try {
      const res = await fetch("/api/time/payroll-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payrollName.trim(),
          vendor: payrollVendor,
          includeOtBreakdown: true,
        }),
      });
      if (!res.ok) throw new Error("payroll");
      setPayrollName("");
      await reload();
    } catch {
      setError(t("full8PayrollError"));
    } finally {
      setWorking(false);
    }
  }

  async function runPayrollExport() {
    if (!exportProfileId) return;
    setWorking(true);
    try {
      const res = await fetch("/api/time/payroll-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: exportProfileId,
          from: new Date(exportFrom).toISOString(),
          to: new Date(exportTo).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payroll-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("full8PayrollExportError"));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <Card className="mt-6">
        <p className="text-sm text-gray-600">{t("full8Loading")}</p>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Card density="compact">
        <CardTitle>{t("directoryTitle")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("directoryHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder={t("workerNamePlaceholder")}
          />
          <Input
            value={workerEmployeeNumber}
            onChange={(e) => setWorkerEmployeeNumber(e.target.value)}
            placeholder={t("directoryEmployeeNumber")}
          />
          <Input
            value={workerEmail}
            onChange={(e) => setWorkerEmail(e.target.value)}
            placeholder={t("directoryEmail")}
            type="email"
          />
          <Input
            value={workerJobTitle}
            onChange={(e) => setWorkerJobTitle(e.target.value)}
            placeholder={t("directoryJobTitle")}
          />
        </div>
        <Button className="mt-3" onClick={saveWorker} disabled={working}>
          {t("addWorker")}
        </Button>
        <ul className="mt-4 space-y-2 text-sm">
          {workers.map((w) => (
            <li key={w.id} className="flex flex-wrap gap-2">
              <span className="font-medium">{w.displayName}</span>
              {w.employeeNumber && (
                <span className="text-gray-600">#{w.employeeNumber}</span>
              )}
              {w.jobTitle && (
                <span className="text-gray-600">{w.jobTitle}</span>
              )}
              {!w.active && (
                <span className="text-gray-500">{t("directoryInactive")}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card density="compact">
        <CardTitle>{t("groupsTitle")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("groupsHint")}</p>
        <Input
          className="mt-3"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t("groupsNamePlaceholder")}
        />
        <fieldset className="mt-3 space-y-2">
          <legend className="text-sm font-medium text-gray-700">
            {t("groupsMembers")}
          </legend>
          {workers.map((w) => (
            <Checkbox
              key={w.id}
              label={w.displayName}
              checked={groupMemberIds.includes(w.id)}
              onChange={(checked) =>
                setGroupMemberIds((prev) =>
                  checked
                    ? [...prev, w.id]
                    : prev.filter((id) => id !== w.id),
                )
              }
            />
          ))}
        </fieldset>
        <Button className="mt-3" onClick={saveGroup} disabled={working}>
          {t("groupsSave")}
        </Button>
        <ul className="mt-4 space-y-1 text-sm">
          {groups.map((g) => (
            <li key={g.id}>
              {g.name} · {t("groupsMemberCount", { count: g.memberWorkerIds.length })}
            </li>
          ))}
        </ul>
      </Card>

      <Card density="compact">
        <CardTitle>{t("otPolicyTitle")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("otPolicyHint")}</p>
        <Input
          className="mt-3"
          value={otPolicyName}
          onChange={(e) => setOtPolicyName(e.target.value)}
          placeholder={t("otPolicyNamePlaceholder")}
        />
        <Button className="mt-3" onClick={saveOtPolicy} disabled={working}>
          {t("otPolicySave")}
        </Button>
        <ul className="mt-4 space-y-1 text-sm">
          {otPolicies.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.active ? "" : ` (${t("directoryInactive")})`}
              {" · "}
              {t("otPolicyWeeklyHours", { hours: p.weeklyRegularHours })}
            </li>
          ))}
        </ul>
      </Card>

      <Card density="compact">
        <CardTitle>{t("seriesTitle")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("seriesHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            value={seriesLabel}
            onChange={(e) => setSeriesLabel(e.target.value)}
            placeholder={t("shiftsLabel")}
          />
          <Input
            value={seriesStartTime}
            onChange={(e) => setSeriesStartTime(e.target.value)}
            placeholder="09:00"
          />
          <Input
            value={seriesDuration}
            onChange={(e) => setSeriesDuration(e.target.value)}
            placeholder={t("seriesDurationMinutes")}
            type="number"
          />
          <Input
            value={seriesStartsOn}
            onChange={(e) => setSeriesStartsOn(e.target.value)}
            type="date"
          />
        </div>
        <Button className="mt-3" onClick={saveShiftSeries} disabled={working}>
          {t("seriesSave")}
        </Button>
        <ul className="mt-4 space-y-2 text-sm">
          {series.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2">
              <span>{s.label}</span>
              <span className="text-gray-600">
                {s.recurrence.frequency} · {s.startTime}
              </span>
              <Button
                variant="outline"
                onClick={() => expandSeries(s.id)}
                disabled={working}
              >
                {t("seriesExpand")}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card density="compact">
        <CardTitle>{t("accrualTitle")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("accrualHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            value={accrualName}
            onChange={(e) => setAccrualName(e.target.value)}
            placeholder={t("accrualNamePlaceholder")}
          />
          <Input
            value={accrualRate}
            onChange={(e) => setAccrualRate(e.target.value)}
            placeholder={t("accrualRatePlaceholder")}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={saveAccrualPolicy} disabled={working}>
            {t("accrualSave")}
          </Button>
          <Button variant="outline" onClick={runAccrual} disabled={working}>
            {t("accrualRun")}
          </Button>
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          {accrualPolicies.map((p) => (
            <li key={p.id}>
              {p.name} · {p.formulaType} · {p.ptoType}
            </li>
          ))}
        </ul>
      </Card>

      <Card density="compact">
        <CardTitle>{t("payrollTitle")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("payrollHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            value={payrollName}
            onChange={(e) => setPayrollName(e.target.value)}
            placeholder={t("payrollNamePlaceholder")}
          />
          <Select
            value={payrollVendor}
            onChange={(e) =>
              setPayrollVendor(e.target.value as PayrollExportProfile["vendor"])
            }
          >
            <option value="generic_csv">{t("payrollVendors.generic_csv")}</option>
            <option value="adp_workforce">
              {t("payrollVendors.adp_workforce")}
            </option>
            <option value="quickbooks">{t("payrollVendors.quickbooks")}</option>
            <option value="ceridian">{t("payrollVendors.ceridian")}</option>
            <option value="custom">{t("payrollVendors.custom")}</option>
          </Select>
          <Input value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} type="date" />
          <Input value={exportTo} onChange={(e) => setExportTo(e.target.value)} type="date" />
          <Select
            value={exportProfileId}
            onChange={(e) => setExportProfileId(e.target.value)}
          >
            <option value="">{t("payrollSelectProfile")}</option>
            {payrollProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={savePayrollProfile} disabled={working}>
            {t("payrollSave")}
          </Button>
          <Button variant="outline" onClick={runPayrollExport} disabled={working}>
            {t("payrollExport")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
