import { z } from "zod";

const employmentType = z.enum([
  "full_time",
  "part_time",
  "casual",
  "contract",
]);

export const upsertWorkerSchema = z.object({
  displayName: z.string().min(1),
  userId: z.string().optional(),
  trackGaps: z.boolean().optional(),
  active: z.boolean().optional(),
  id: z.string().optional(),
  gpsConsentAt: z.string().nullable().optional(),
  employeeNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  employmentType: employmentType.optional(),
  defaultJobCodeId: z.string().optional(),
  supervisorWorkerId: z.string().optional(),
  notes: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
});

export const upsertWorkerGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  memberWorkerIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  id: z.string().optional(),
});

export const upsertOtPolicySchema = z.object({
  name: z.string().min(1),
  payPeriodType: z
    .enum(["weekly", "biweekly", "semi_monthly", "custom_days"])
    .optional(),
  payPeriodDays: z.number().int().positive().optional(),
  payPeriodAnchor: z.string().optional(),
  dailyRegularHours: z.number().positive().optional(),
  dailyOtThreshold: z.number().positive().optional(),
  weeklyRegularHours: z.number().positive().optional(),
  dailyDoubleThreshold: z.number().positive().optional(),
  otMultiplier: z.number().positive().optional(),
  doubleTimeMultiplier: z.number().positive().optional(),
  holidayDates: z.array(z.string()).optional(),
  holidayMultiplier: z.number().positive().optional(),
  categoryOtEligible: z.record(z.boolean()).optional(),
  active: z.boolean().optional(),
  id: z.string().optional(),
});

const shiftRecurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly"]),
  interval: z.number().int().positive().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  startsOn: z.string().min(1),
  endsOn: z.string().optional(),
  maxOccurrences: z.number().int().positive().optional(),
});

export const createShiftSeriesSchema = z.object({
  label: z.string().min(1),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  durationMinutes: z.number().int().positive(),
  category: z.enum([
    "staff",
    "release",
    "duty_bank",
    "action",
    "volunteer",
  ]),
  siteId: z.string().optional(),
  jobCodeId: z.string().optional(),
  assignedWorkerIds: z.array(z.string()),
  recurrence: shiftRecurrenceSchema,
  status: z.enum(["draft", "published"]).optional(),
});

export const upsertAccrualPolicySchema = z.object({
  name: z.string().min(1),
  ptoType: z.enum(["vacation", "sick", "personal", "other"]),
  formulaType: z.enum(["hours_worked", "fixed_per_period", "tenure_tier"]),
  hoursWorkedRate: z.number().nonnegative().optional(),
  eligibleCategories: z
    .array(
      z.enum(["staff", "release", "duty_bank", "action", "volunteer"]),
    )
    .optional(),
  fixedHoursPerPeriod: z.number().nonnegative().optional(),
  periodDays: z.number().int().positive().optional(),
  tenureTiers: z
    .array(
      z.object({
        minMonths: z.number().int().nonnegative(),
        hoursPerPeriod: z.number().nonnegative(),
      }),
    )
    .optional(),
  active: z.boolean().optional(),
  id: z.string().optional(),
});

export const upsertPayrollProfileSchema = z.object({
  name: z.string().min(1),
  vendor: z.enum([
    "generic_csv",
    "adp_workforce",
    "quickbooks",
    "ceridian",
    "custom",
  ]),
  fieldMapping: z.record(z.string()).optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  includeOtBreakdown: z.boolean().optional(),
  active: z.boolean().optional(),
  id: z.string().optional(),
});
