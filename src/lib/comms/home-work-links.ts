/** Curated jobs and canonical public destinations on Home. */
export const HOME_WORK_GROUPS = [
  { id: "communications", links: [
    { id: "graphics", href: "/create/graphic-maker" },
    { id: "website", href: "/create/website-template" },
    { id: "create", href: "/create" },
  ] },
  { id: "workplace", links: [
    { id: "grievance", href: "/utilities/complaint-vs-grievance" },
    { id: "accommodation", href: "/utilities/rtw-accommodation" },
    { id: "utilities", href: "/utilities" },
  ] },
  { id: "learning", links: [
    { id: "learning", href: "/learn/officer" },
    { id: "meetings", href: "/utilities/rules-of-order" },
    { id: "learn", href: "/learn" },
  ] },
] as const;
