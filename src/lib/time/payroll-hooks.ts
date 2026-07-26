import type {
  EntryOtBreakdown,
  PayrollExportProfile,
  PayrollFieldMapping,
  PayrollVendor,
  TimeEntry,
  TimeWorker,
} from "@/types/time";
import { entryDurationHours } from "./pay-period";

const VENDOR_DEFAULTS: Record<PayrollVendor, PayrollFieldMapping> = {
  generic_csv: {
    workerName: "employee_name",
    employeeNumber: "employee_id",
    clockIn: "clock_in",
    clockOut: "clock_out",
    durationHours: "hours",
    jobCode: "job_code",
    category: "pay_type",
    regularHours: "regular_hours",
    otHours: "ot_hours",
    doubleHours: "double_hours",
  },
  adp_workforce: {
    workerName: "Associate Name",
    employeeNumber: "Associate ID",
    clockIn: "In Time",
    clockOut: "Out Time",
    durationHours: "Hours",
    jobCode: "Labor Code",
    category: "Pay Code",
    regularHours: "Reg Hours",
    otHours: "OT Hours",
    doubleHours: "DT Hours",
  },
  quickbooks: {
    workerName: "Employee",
    employeeNumber: "Employee No.",
    clockIn: "Start Time",
    clockOut: "End Time",
    durationHours: "Duration",
    jobCode: "Service Item",
    category: "Class",
    regularHours: "Regular",
    otHours: "Overtime",
    doubleHours: "Double OT",
  },
  ceridian: {
    workerName: "EmployeeName",
    employeeNumber: "EmployeeNumber",
    clockIn: "PunchIn",
    clockOut: "PunchOut",
    durationHours: "TotalHours",
    jobCode: "JobCode",
    category: "EarningCode",
    regularHours: "RegHours",
    otHours: "OTHours",
    doubleHours: "DTHours",
  },
  custom: {},
};

export function resolveFieldMapping(
  profile: PayrollExportProfile,
): PayrollFieldMapping {
  return {
    ...VENDOR_DEFAULTS[profile.vendor],
    ...profile.fieldMapping,
  };
}

export type PayrollExportRow = Record<string, string>;

export function buildPayrollExportRows(input: {
  profile: PayrollExportProfile;
  entries: TimeEntry[];
  workers: TimeWorker[];
  otBreakdown?: Map<string, EntryOtBreakdown>;
}): PayrollExportRow[] {
  const mapping = resolveFieldMapping(input.profile);
  const workerById = new Map(input.workers.map((w) => [w.id, w]));

  return input.entries
    .filter((e) => e.clockOutAt)
    .map((entry) => {
      const worker = workerById.get(entry.workerId);
      const ot = input.otBreakdown?.get(entry.id);
      const duration = entryDurationHours(entry).toFixed(2);
      const row: PayrollExportRow = {};

      const set = (key: keyof PayrollFieldMapping, value: string) => {
        const col = mapping[key];
        if (col) row[col] = value;
      };

      set("workerName", entry.workerName);
      set("employeeNumber", worker?.employeeNumber ?? entry.workerId);
      set("clockIn", entry.clockInAt);
      set("clockOut", entry.clockOutAt ?? "");
      set("durationHours", duration);
      set("jobCode", entry.jobCodeLabel);
      set("category", entry.category);

      if (input.profile.includeOtBreakdown && ot) {
        set("regularHours", ot.regularHours.toFixed(2));
        set("otHours", ot.otHours.toFixed(2));
        set("doubleHours", ot.doubleHours.toFixed(2));
      }

      return row;
    });
}

export function payrollRowsToCsv(rows: PayrollExportRow[]): string {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => `"${(row[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

/** Fire-and-forget webhook hook — returns fetch result for caller to audit. */
export async function postPayrollWebhook(
  profile: PayrollExportProfile,
  payload: { rows: PayrollExportRow[]; from: string; to: string },
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!profile.webhookUrl?.trim()) {
    return { ok: true };
  }
  try {
    const res = await fetch(profile.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor: profile.vendor,
        profileId: profile.id,
        from: payload.from,
        to: payload.to,
        rowCount: payload.rows.length,
        rows: payload.rows,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "webhook failed",
    };
  }
}
