export interface WebsiteOfficer {
  name: string;
  role: string;
  location: string;
}

export interface WebsiteTemplateData {
  localNumber: string;
  unionName: string;
  heroText: string;
  about1: string;
  about2: string;
  contactEmail: string;
  facebookUrl: string;
  officeAddress: string;
  primaryColor: string;
  secondaryColor: string;
  officers: WebsiteOfficer[];
}

export const DEFAULT_WEBSITE_OFFICERS: WebsiteOfficer[] = [
  { name: "President Name", role: "President", location: "" },
  { name: "Vice President Name", role: "Vice President", location: "" },
  { name: "Secretary Name", role: "Secretary", location: "" },
  { name: "Treasurer Name", role: "Treasurer", location: "" },
];
