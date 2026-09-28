/** EN/FR chrome copy for Load Test Lab (outside next-intl locale routes). */

export type LoadLabLocale = "en" | "fr";

export const LOAD_LAB_COPY = {
  en: {
    title: "Load Test Lab",
    subtitle:
      "On-box capacity testing. The load engine runs on this host and shares CPU/RAM with the app.",
      offHours:
      "Run off-hours only. Do not start a capacity sweep during steward working hours.",
    safetyHarness:
      "Safeguards: single run at a time, VU/duration/wall-clock caps, target allowlist (this host only), mid-tier abort on high errors/latency, auth login pool, read-only profiles. Abort stops the run immediately.",
    disabled:
      "Load Lab is disabled on this host. An operator must set LOAD_LAB_ENABLED=true.",
    productionBanner:
      "Production requires ALLOW_PRODUCTION_LOAD_TEST=true and an explicit confirmation below.",
    environment: "Environment",
    profile: "Profile",
    vus: "Virtual users (VUs)",
    duration: "Steady duration (seconds)",
    ramp: "Ramp (seconds)",
    baseUrl: "Base URL override",
    baseUrlHint: "Leave blank to use loopback on this host (recommended).",
    username: "Load-test username",
    password: "Load-test password",
    allowProduction: "I confirm an off-hours production capacity test",
    start: "Start run",
    abort: "Abort",
    refresh: "Refresh status",
    importLabel: "Import summary.json",
    copyCommand: "Copy CLI equivalent",
    status: "Status",
    capacityHeadline: "Capacity headline",
    lastHealthy: "Last healthy",
    firstDegraded: "First degraded",
    firstFailed: "First failed",
    sustainableRps: "Sustainable req/s (at last healthy)",
    tierTable: "Capacity table",
    endpoints: "Endpoint performance",
    hints: "Bottleneck signals (HTTP only)",
    metricHelpP95: "95% of requests finished within this time.",
    metricHelpRps: "Server requests per second achieved — not the same as VU count.",
    metricHelpVu:
      "Concurrent simulated users with think-time between actions.",
    none: "none",
    profiles: {
      smoke: "Smoke",
      public: "Public browse",
      "hub-read": "Officer Hub read",
      capacity: "Capacity sweep (50→1000)",
    },
    envs: {
      local: "Local (loopback)",
      staging: "Staging",
      production: "Production",
    },
    signInHint:
      "Start/Abort require a platform_admin session. Open /en/app/login first if status calls fail.",
  },
  fr: {
    title: "Labo de charge",
    subtitle:
      "Test de capacité sur la même machine. Le moteur de charge partage le CPU/RAM avec l’application.",
      offHours:
      "À lancer hors des heures de travail seulement. Ne démarrez pas un balayage de capacité pendant les heures des délégués.",
    safetyHarness:
      "Protections : une seule exécution à la fois, plafonds VU/durée/horloge, liste d’hôtes autorisés (cette machine seulement), arrêt en cours de palier si erreurs/latence élevées, pool de connexions, profils en lecture seule. Interrompre arrête immédiatement.",
    disabled:
      "Le labo de charge est désactivé sur cet hôte. Un opérateur doit définir LOAD_LAB_ENABLED=true.",
    productionBanner:
      "La production exige ALLOW_PRODUCTION_LOAD_TEST=true et une confirmation explicite ci-dessous.",
    environment: "Environnement",
    profile: "Profil",
    vus: "Utilisateurs virtuels (VU)",
    duration: "Durée stable (secondes)",
    ramp: "Montée (secondes)",
    baseUrl: "URL de base (override)",
    baseUrlHint: "Laissez vide pour utiliser le loopback sur cet hôte (recommandé).",
    username: "Nom d’utilisateur de test",
    password: "Mot de passe de test",
    allowProduction: "Je confirme un test de capacité hors heures en production",
    start: "Démarrer",
    abort: "Interrompre",
    refresh: "Actualiser",
    importLabel: "Importer summary.json",
    copyCommand: "Copier la commande CLI",
    status: "État",
    capacityHeadline: "Capacité",
    lastHealthy: "Dernier niveau sain",
    firstDegraded: "Premier niveau dégradé",
    firstFailed: "Premier niveau en échec",
    sustainableRps: "Req/s soutenables (dernier niveau sain)",
    tierTable: "Tableau de capacité",
    endpoints: "Performance par endpoint",
    hints: "Signaux de goulot (HTTP seulement)",
    metricHelpP95: "95 % des requêtes se sont terminées dans ce délai.",
    metricHelpRps:
      "Requêtes serveur par seconde — ce n’est pas le nombre de VU.",
    metricHelpVu:
      "Utilisateurs simulés concurrents avec temps de réflexion entre les actions.",
    none: "aucun",
    profiles: {
      smoke: "Fumée",
      public: "Navigation publique",
      "hub-read": "Lecture Officer Hub",
      capacity: "Balayage de capacité (50→1000)",
    },
    envs: {
      local: "Local (loopback)",
      staging: "Préproduction",
      production: "Production",
    },
    signInHint:
      "Démarrer/Interrompre exige une session platform_admin. Ouvrez /en/app/login d’abord si les appels d’état échouent.",
  },
} as const;
