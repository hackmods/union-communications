import { describe, expect, it } from "vitest";
import {
  buildRtwEarlyResolutionSuggestions,
  buildRtwScripts,
  createEmptyRtwDraft,
  hasActiveWsibLtd,
  hasPhysicalLimits,
  isRtwIntakeDraft,
  maybePrefillGradualHours,
  maybeSuggestTaskBundlingMeasure,
  rtwDraftToMarkdown,
} from "@/lib/steward-guides/rtw";
import {
  buildPreDisciplinaryScripts,
  createEmptyPreDisciplinaryDraft,
  detectCriminalKeywords,
  isCriminalAllegation,
  shouldEscalateCriminal,
  suggestLetterOfCounsel,
  suggestObeyNowGrieveLater,
} from "@/lib/steward-guides/pre-disciplinary";
import {
  buildAllAlternateRouteDrafts,
  buildFarDraftText,
  complaintDraftToMarkdown,
  createEmptyComplaintDraft,
  grievanceViabilityIndex,
  unlocksGrievanceForm,
} from "@/lib/steward-guides/complaint-diagnostic";

const rtwLabels = {
  dear: "Dear",
  basedOn: "Based on",
  propose: "We propose",
  preserve:
    "We ask that accommodations preserve pre-injury wage rate and bargaining-unit standing.",
  closing: "In solidarity,",
  verbalLead: "Talking points:",
  memberFallback: "the member",
  hrFallback: "HR",
  measuresHeading: "Proposed measures",
  measureLabels: {
    modifiedHours: "Modified hours",
    lightDuties: "Light duties",
    ergonomicEquipment: "Ergonomic equipment",
    taskBundling: "Task bundling",
    alternativeLocation: "Alternative location",
  },
  customMeasureLabel: "Other",
  groundLabels: {
    creed: "Creed",
    disability: "Disability",
    familyStatus: "Family status",
    sex: "Sex",
    genderIdentity: "Gender identity",
    race: "Race",
    age: "Age",
    other: "Other",
  },
  groundLead: "This is an active accommodation request under prohibited grounds",
};

const preLabels = {
  counselProposal: "COACH",
  obeyNowGrieveLaterProposal: "OBEY",
  representationPoints: "REP",
  checklistGapsLead: "Gaps:",
  rightsLabels: {
    advanceNotice: "Notice",
    representation: "Rep",
    disclosure: "Disclosure",
  },
  mitigatorLabels: {
    lengthOfService: "Service",
    cleanPastRecord: "Clean",
    provocation: "Provocation",
    personalMedicalDistress: "Distress",
    sincereRemorse: "Remorse",
  },
  allegationTypeLabels: {
    attendance: "Attendance",
    insubordination: "Insubordination",
    performance: "Performance",
    harassment: "Harassment",
    theft: "Theft",
    fraud: "Fraud",
    criminal: "Criminal",
    other: "Other",
  },
  none: "None",
};

const complaintScripts = {
  pointLabels: {
    caViolation: "CA",
    misinterpretation: "Misread",
    statutory: "Law",
    pastPractice: "Practice",
    memberRights: "Rights",
  },
  routeLabels: {
    lmc: "LMC",
    jhsc: "JHSC",
    informalSupervisor: "Supervisor",
    mobilization: "Mobilize",
  },
  routeDrafts: {
    lmc: "Refer to LMC",
    jhsc: "Refer to JHSC",
    informalSupervisor: "Talk to supervisor",
    mobilization: "Survey members",
  },
  grievanceDraftHeading: "Draft",
  farDraftHeading: "FAR",
  who: "Who",
  what: "What",
  when: "When",
  where: "Where",
  why: "Why",
  want: "Want",
  facts: "Facts",
  argument: "Argument",
  resolution: "Resolution",
  article: "Article",
  indexLabel: "Index",
  grievancePath: "Grievance path",
  alternatePath: "Alternate path",
};

describe("rtw intake", () => {
  it("validates empty draft shape", () => {
    expect(isRtwIntakeDraft(createEmptyRtwDraft())).toBe(true);
    expect(isRtwIntakeDraft({})).toBe(false);
  });

  it("builds an HR email with member and measures", () => {
    const draft = createEmptyRtwDraft();
    draft.memberName = "Alex";
    draft.hrContact = "Jordan";
    draft.functionalLimitations = "no lifting over 10 lb";
    draft.gradualHours = "15 hours/week for 4 weeks";
    draft.measures = ["taskBundling", "modifiedHours"];
    const { email } = buildRtwScripts(draft, rtwLabels);
    expect(email).toContain("Dear Jordan");
    expect(email).toContain("Alex");
    expect(email).toContain("Task bundling");
    expect(
      rtwDraftToMarkdown(draft, {
        title: "RTW",
        modeRtw: "RTW",
        modeAccommodation: "Accommodation",
        fields: {
          mode: "Mode",
          memberName: "Member",
          classification: "Class",
          meetingDate: "Date",
          hrContact: "HR",
          returnDate: "Return",
          gradualHours: "Hours",
          wsibLtdStatus: "Status",
          medicalRestrictions: "Restrictions",
          prohibitedGround: "Ground",
          requestedModifications: "Mods",
          functionalLimitations: "Limits",
          measures: "Measures",
          emailScript: "Email",
          verbalScript: "Verbal",
        },
        measureLabels: rtwLabels.measureLabels,
        groundLabels: rtwLabels.groundLabels,
        scripts: rtwLabels,
      }),
    ).toContain("# RTW");
  });

  it("suggests work-hardening, bundling, and joint review", () => {
    const draft = createEmptyRtwDraft();
    draft.wsibLtdStatus = "WSIB claim active";
    draft.functionalLimitations = "no lifting over 10 lb";
    expect(hasActiveWsibLtd(draft)).toBe(true);
    expect(hasPhysicalLimits(draft)).toBe(true);
    const suggestions = buildRtwEarlyResolutionSuggestions(draft, {
      workHardening: "HARDEN",
      taskBundling: "BUNDLE",
      jointReview: "REVIEW",
    });
    expect(suggestions.map((s) => s.id)).toEqual([
      "workHardening",
      "taskBundling",
      "jointReview",
    ]);
    expect(maybePrefillGradualHours(draft).gradualHours).toContain("15 hrs");
    expect(maybeSuggestTaskBundlingMeasure(draft).measures).toEqual([
      "taskBundling",
    ]);
  });
});

describe("pre-disciplinary", () => {
  it("flags criminal allegation types", () => {
    expect(isCriminalAllegation("theft")).toBe(true);
    expect(isCriminalAllegation("fraud")).toBe(true);
    expect(isCriminalAllegation("criminal")).toBe(true);
    expect(isCriminalAllegation("attendance")).toBe(false);
  });

  it("escalates on free-text criminal keywords", () => {
    expect(detectCriminalKeywords("alleged theft from till")).toBe(true);
    expect(detectCriminalKeywords("late twice this week")).toBe(false);
    const draft = createEmptyPreDisciplinaryDraft();
    draft.allegationType = "attendance";
    draft.allegations = "Police were called about fraud";
    expect(shouldEscalateCriminal(draft)).toBe(true);
  });

  it("suggests letter of counsel for minor + mitigators", () => {
    const draft = createEmptyPreDisciplinaryDraft();
    draft.allegationType = "attendance";
    draft.mitigators = ["cleanPastRecord", "lengthOfService"];
    draft.rights = {
      advanceNotice: "yes",
      representation: "yes",
      disclosure: "yes",
    };
    expect(suggestLetterOfCounsel(draft)).toBe(true);
    const scripts = buildPreDisciplinaryScripts(draft, preLabels);
    expect(scripts.primary).toBe("COACH");
  });

  it("suggests obey-now-grieve-later for insubordination", () => {
    const draft = createEmptyPreDisciplinaryDraft();
    draft.allegationType = "insubordination";
    expect(suggestObeyNowGrieveLater(draft)).toBe(true);
    expect(suggestLetterOfCounsel(draft)).toBe(false);
    const scripts = buildPreDisciplinaryScripts(draft, preLabels);
    expect(scripts.primary).toBe("OBEY");
  });

  it("does not suggest counsel for theft", () => {
    const draft = createEmptyPreDisciplinaryDraft();
    draft.allegationType = "theft";
    draft.mitigators = ["sincereRemorse"];
    expect(suggestLetterOfCounsel(draft)).toBe(false);
  });
});

describe("complaint diagnostic", () => {
  it("scores viability and unlocks grievance form", () => {
    const draft = createEmptyComplaintDraft();
    expect(grievanceViabilityIndex(draft)).toBe(0);
    expect(unlocksGrievanceForm(0)).toBe(false);
    draft.answers.caViolation = "yes";
    draft.answers.pastPractice = "yes";
    expect(grievanceViabilityIndex(draft)).toBe(2);
    expect(unlocksGrievanceForm(2)).toBe(true);
  });

  it("exports all alternate pathways at score 0 when none selected", () => {
    const draft = createEmptyComplaintDraft();
    const md = complaintDraftToMarkdown(draft, {
      title: "Diagnostic",
      scripts: complaintScripts,
    });
    expect(md).toContain("Alternate path");
    expect(md).toContain("Refer to LMC");
    expect(md).toContain("Refer to JHSC");
    expect(md).toContain("Talk to supervisor");
    expect(md).toContain("Survey members");
    expect(buildAllAlternateRouteDrafts(complaintScripts)).toHaveLength(4);
  });

  it("exports markdown for selected alternate path at score 0", () => {
    const draft = createEmptyComplaintDraft();
    draft.alternateRoutes = ["lmc"];
    const md = complaintDraftToMarkdown(draft, {
      title: "Diagnostic",
      scripts: complaintScripts,
    });
    expect(md).toContain("Alternate path");
    expect(md).toContain("Refer to LMC");
  });

  it("includes FAR when grievance path unlocks", () => {
    const draft = createEmptyComplaintDraft();
    draft.answers.caViolation = "yes";
    draft.facts = "OT denied twice";
    draft.argument = "Article 12.03";
    draft.resolution = "Pay OT";
    const text = buildFarDraftText(draft, complaintScripts);
    expect(text).toContain("OT denied twice");
    expect(text).toContain("FAR");
  });
});
