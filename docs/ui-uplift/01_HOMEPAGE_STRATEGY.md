# Homepage strategy

Status: implementation in progress; initial narrative and direct links implemented. Headline and first-screen copy now name concrete tasks and make clear that the platform extends beyond communications.

## Starting gap

Before implementation, `HomeContent` led unconfigured visitors to Brand Kit. `HomeHeroPreview` chose among three communications examples; Hub/Portal shared a short text band. That sequence put setup before immediate value. The current implementation replaces it with a direct tool action, outcome links and a separate Brand Kit advantage.

## Proposed narrative

1. **Union work, ready to do.** The headline names materials, workplace cases and keeping local work moving. Supporting copy names communications, agreement reference, grievance preparation and accommodation planning, then separate Officer Learning and member participation. Primary action opens useful public choices; secondary action explains the platform. Do not make configuration the primary anonymous action.
2. **Show three real jobs.** Compose a communications output, a structured steward worksheet excerpt, and a real learning or hosted interface state. Use labelled, readable examples with direct task links. Do not build a pretend unified dashboard. On phones use one substantial example with compact access to the others, not shrunken desktop screenshots.
3. **Choose today's work.** A short set of outcome-led links reaches canonical tools or filtered catalogs. The homepage explains the jobs; the existing catalogs own exhaustive discovery.
4. **One local identity across applicable outputs.** Show a single identity appearing on a graphic, a document and a website where the actual engines support it. Place Brand Kit here as a useful advantage. Do not imply it sets Hub membership or automatically replaces a local's saved kit.
5. **Carry work with the local.** Give Officer Hub and Local Portal a substantial paired presentation. Officer work stays permissioned; member spaces show appropriate participation and information. Explain intentional sharing rather than a fictional automatic pipeline.
6. **Control people can understand.** Distinguish on-device preparation, explicit hosted work and local permissions. Link existing Trust/Privacy/Security material and end with a clear task or platform next step.

These are narrative responsibilities, not six mandatory boxed sections. Avoid repeating identical CTA pairs after every paragraph. Keep the existing availability gates when presenting access actions.

## Capability evidence

| Outcome | Source proving an implemented surface | Presentation boundary |
|---|---|---|
| Graphics and print | `src/app/[locale]/tools/graphic-maker/page.tsx`, flyer and board tools | Preserve supported formats and capture geometry |
| Documents and letters | `src/components/tools/DocumentGeneratorEditor.tsx` | Office mock previews are illustrative, not exact rendering |
| Local website | `src/app/[locale]/tools/website-template/page.tsx` | Exportable website; do not promise automatic hosting |
| Grievance preparation | `src/app/[locale]/tools/complaint-vs-grievance/page.tsx` and public catalog | Preparation is distinct from a hosted case and legal advice |
| Accommodation and return to work | `src/app/[locale]/tools/rtw-accommodation/page.tsx` | Structured preparation, not automated decisions |
| Notes, CA reference, governance | `src/lib/comms/public-catalog.ts`, `TOOL_DELIVERABLE` | Device work and optional authorized Hub handoff stay distinct |
| Officer Learning | `src/components/officer-learning/ModuleViewer.tsx` and `ModuleQuiz.tsx` | Real progression/assessment; no invented accreditation |
| Officer work | `src/components/hub/HubDashboard.tsx`, `hub-dashboard-model.ts`, `hub-tool-catalog.ts` | Role, module, MFA and tenant context determine availability |
| Member participation | `src/components/portal/CircleWorkspace.tsx`, `docs/modules/LOCAL_PORTAL.md` | Circle membership and member-safe projections; private casework excluded |

Direct Home destinations are linked to canonical routes in the shared tool catalog. This table is source evidence, not runtime verification. Operational Hub and Portal examples still need synthetic browser captures and permission-boundary review.
