import localFont from "next/font/local";

/**
 * Self-hosted OFL canvas faces (ADR-014). CSS variables only —
 * platform chrome stays on the system stack in globals.css.
 */
export const fontMontserrat = localFont({
  src: [
    {
      path: "../../public/fonts/montserrat/latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/montserrat/latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/montserrat/latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
});

export const fontSourceSans = localFont({
  src: [
    {
      path: "../../public/fonts/source-sans-3/latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/source-sans-3/latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/source-sans-3/latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-source-sans",
  display: "swap",
  preload: true,
});

export const fontBarlowCondensed = localFont({
  src: [
    {
      path: "../../public/fonts/barlow-condensed/latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/barlow-condensed/latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/barlow-condensed/latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  preload: false,
});

export const fontOswald = localFont({
  src: [
    {
      path: "../../public/fonts/oswald/latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/oswald/latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-oswald",
  display: "swap",
  preload: false,
});

export const fontSourceSerif = localFont({
  src: [
    {
      path: "../../public/fonts/source-serif-4/latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/source-serif-4/latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/source-serif-4/latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-source-serif",
  display: "swap",
  preload: false,
});

export const fontRobotoSlab = localFont({
  src: [
    {
      path: "../../public/fonts/roboto-slab/latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/roboto-slab/latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-roboto-slab",
  display: "swap",
  preload: false,
});

/** Space-separated class names that define all canvas font CSS variables. */
export const canvasFontVariablesClassName = [
  fontMontserrat.variable,
  fontSourceSans.variable,
  fontBarlowCondensed.variable,
  fontOswald.variable,
  fontSourceSerif.variable,
  fontRobotoSlab.variable,
].join(" ");
