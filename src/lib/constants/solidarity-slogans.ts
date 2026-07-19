export type PosterLayout = "stack" | "split" | "banner";

export interface SolidaritySlogan {
  id: string;
  leadIn: string;
  headline: string;
  closer: string;
  layout: PosterLayout;
}

export const SOLIDARITY_SLOGANS: readonly SolidaritySlogan[] = [
  {
    id: "solidarity-forever",
    leadIn: "Keep calm and",
    headline: "SOLIDARITY\nFOREVER",
    closer: "Together we win",
    layout: "stack",
  },
  {
    id: "united-bargain",
    leadIn: "Remember",
    headline: "UNITED WE\nBARGAIN",
    closer: "Divided we beg",
    layout: "split",
  },
  {
    id: "injury-to-one",
    leadIn: "An injury to one",
    headline: "IS AN INJURY\nTO ALL",
    closer: "Stand with your coworkers",
    layout: "stack",
  },
  {
    id: "organize",
    leadIn: "The time is now",
    headline: "ORGANIZE",
    closer: "Power in numbers",
    layout: "banner",
  },
  {
    id: "union-strong",
    leadIn: "We are",
    headline: "UNION\nSTRONG",
    closer: "And we are not alone",
    layout: "stack",
  },
  {
    id: "rise-together",
    leadIn: "When we rise",
    headline: "WE RISE\nTOGETHER",
    closer: "Solidarity in action",
    layout: "split",
  },
  {
    id: "fairness",
    leadIn: "Know this",
    headline: "FAIRNESS IS\nNON-NEGOTIABLE",
    closer: "Respect at work",
    layout: "banner",
  },
  {
    id: "stand-together",
    leadIn: "Stand up",
    headline: "STAND\nTOGETHER",
    closer: "Your local has your back",
    layout: "stack",
  },
  {
    id: "your-voice",
    leadIn: "Use it",
    headline: "YOUR VOICE\nYOUR UNION",
    closer: "Get involved",
    layout: "split",
  },
  {
    id: "nothing-about-us",
    leadIn: "Our principle",
    headline: "NOTHING ABOUT US\nWITHOUT US",
    closer: "Members first",
    layout: "banner",
  },
  {
    id: "join-today",
    leadIn: "Your union. Your voice.",
    headline: "JOIN\nTODAY",
    closer: "Scan to sign your membership card",
    layout: "stack",
  },
  {
    id: "stronger-together-join",
    leadIn: "Stronger together",
    headline: "SIGN UP\nTODAY",
    closer: "Membership builds power",
    layout: "split",
  },
  {
    id: "card-in-hand",
    leadIn: "Covered by the CA?",
    headline: "GET YOUR\nUNION CARD",
    closer: "Sign up — it only takes a minute",
    layout: "banner",
  },
] as const;

export type SolidaritySloganId = (typeof SOLIDARITY_SLOGANS)[number]["id"];

export function getSloganById(id: string): SolidaritySlogan | undefined {
  return SOLIDARITY_SLOGANS.find((s) => s.id === id);
}
