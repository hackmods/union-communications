export interface CaptionTemplate {
  id: string;
  category: string;
  title: string;
  caption: string;
  hashtags: string[];
}

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: "welcome",
    category: "General",
    title: "Welcome new members",
    caption:
      "Welcome to the family! We're thrilled to have you join [Local Number] [Sub-text]. Together, we're stronger. Questions? Reach out to your steward or visit our page anytime.",
    hashtags: ["#OPSEU", "#UnionStrong", "#NewMember", "#Solidarity"],
  },
  {
    id: "agm",
    category: "AGM",
    title: "AGM announcement",
    caption:
      "📢 ANNUAL GENERAL MEETING\n\nDate: [Date]\nTime: [Time]\nLocation: [Location/Virtual link]\n\nAll members are encouraged to attend. Your participation shapes our local's direction. See you there!",
    hashtags: ["#AGM", "#OPSEU", "#MemberVoice", "#Democracy"],
  },
  {
    id: "bargaining",
    category: "Bargaining",
    title: "Bargaining update",
    caption:
      "Bargaining update: Our team met with management today to discuss [key issues]. We remain committed to fair wages, safe workplaces, and respect for every member. Stay tuned for updates.",
    hashtags: ["#Bargaining", "#FairWages", "#OPSEU", "#WorkersRights"],
  },
  {
    id: "strike",
    category: "Strike",
    title: "Strike action notice",
    caption:
      "⚠️ STRIKE ACTION\n\nOur members have voted to take strike action effective [Date]. We call on management to return to the table with a fair offer. Solidarity forever!",
    hashtags: ["#Strike", "#Solidarity", "#OPSEU", "#UnionStrong"],
  },
  {
    id: "spotlight",
    category: "Member spotlight",
    title: "Member spotlight",
    caption:
      "🌟 MEMBER SPOTLIGHT\n\nMeet [Name], who has served our local for [X] years. [Quote or achievement]. Thank you for everything you do for our members!",
    hashtags: ["#MemberSpotlight", "#OPSEU", "#UnionFamily"],
  },
  {
    id: "event-thanks",
    category: "Events",
    title: "Event thank-you",
    caption:
      "Thank you to everyone who joined us at [Event Name]! [X] members came out to show their solidarity. Together, we make a difference. 💪",
    hashtags: ["#ThankYou", "#OPSEU", "#Community", "#Solidarity"],
  },
];
