import { SITE_NAME } from "@/lib/seo/site";

export { default } from "./opengraph-image";

export const runtime = "edge";
export const alt = `${SITE_NAME} - Solidarity.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
