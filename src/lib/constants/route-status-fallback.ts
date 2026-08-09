/**
 * English fallback copy for root `not-found` / `global-error` — those
 * surfaces may not have next-intl providers. Locale segment UIs use `routeUi`.
 */
export const ROUTE_STATUS_FALLBACK = {
  notFoundTitle: "Local 404",
  notFoundBody: "This page isn’t on the roster.",
  notFoundQuip:
    "This URL never joined the bargaining unit — or it’s off at a membership meeting.",
  errorTitle: "Needs a steward",
  errorBody: "Something unexpected broke on the floor.",
  errorQuip: "Try again, or head somewhere safe. Solidarity.",
  slogan: "Solidarity.",
  statusCode: "404",
  tryAgain: "Try again",
  backHomeEn: "Home (EN)",
  backHomeFr: "Accueil (FR)",
  backToToolsEn: "Browse tools (EN)",
  local243Footnote: "P.S. Empty local previews still land on 243.",
} as const;

export const SNOWMOBILE_EGG_SRC =
  "/easter-eggs/just-be-loved-snowmobile.png";
