# Session knowledge — Office engine uplift (2026-09-20)

## Root cause

The generating libraries produced healthy packages. Corruption entered during custom font post-processing: Word bytes were XORed twice, font-table relationships used a target relative to the wrong directory, the generated font table was replaced, and PowerPoint received Word-obfuscated data plus non-schema embedded-font markup. The OFL notice also lacked a content type.

## Contract now

- Word merges `word/fontTable.xml`, points font-table relationships to `fonts/*`, applies reversed-GUID XOR to only the first 32 bytes, embeds referenced regular/bold faces, and enables embedded TrueType settings.
- PowerPoint stores raw supported TTF bytes as `application/x-fontdata`; `presentation.xml` uses `p:font`, `p:regular`, and `p:bold` relationship references.
- `NOTICE.txt` is covered by a `text/plain` default. System-font selections remain a no-op.
- `validateOfficePackage` rejects invalid ZIPs, missing main parts, uncovered package parts, duplicate or unresolved relationships, and invalid raw PowerPoint font signatures.
- Every Word preset can render as DOCX or DOTX. DOTX changes the main-part content type and retains the preset's styles, page geometry, branding, and embedded-font package.

## Verification

Run the focused unit slice:

```bash
npm run test:unit -- src/lib/export/ooxml-font-embed.test.ts src/lib/export/office-export.test.ts src/lib/export/office-docx-builders.test.ts
```

Then run typecheck, lint, standard unit/smoke, and the optional Windows Office desktop verifier where Word, Excel, and PowerPoint are installed.

Fixture and installed-Office verification:

```bash
npm run office:fixtures
npm run office:verify:windows -- .office-smoke
```

The 2026-09-20 pass generated and opened 22 files across every supported preset: DOCX, DOTX, XLSX, and PPTX all opened read-only in the installed Windows Office applications without a repair prompt.

## Lessons learned

1. **Validate after the final mutation.** A healthy `docx`, ExcelJS, or PptxGenJS output proves nothing after JSZip edits. Validation belongs after font injection and after the DOCX-to-DOTX content-type conversion, immediately before download.
2. **OOXML paths are relative to the relationship source part.** `word/_rels/fontTable.xml.rels` targets `fonts/font1.odttf`, not `../fonts/font1.odttf`. Resolve targets from the owning part directory in tests and in the package validator.
3. **Word and PowerPoint font embedding are different formats.** Word needs GUID-obfuscated `.odttf` bytes and `w:embedRegular` / `w:embedBold`; PowerPoint needs raw TTF bytes, `application/x-fontdata`, and `p:regular` / `p:bold` relationship references. Do not restore a generic OOXML font patcher.
4. **The Word GUID transform is reversible and deserves a fixed vector.** Reverse all 16 GUID bytes, XOR that sequence twice over the first 32 font bytes, and leave the remainder untouched. A round-trip assertion alone is insufficient because two equally wrong transforms can round-trip; retain the known-byte vector.
5. **Package only referenced faces.** The font catalog may expose several weights. If the font table or presentation references only regular and bold, packaging intermediate weights creates orphan relationships. Select one regular face nearest 400 and one bold face nearest 700 before loading bytes.
6. **Merge generated metadata instead of replacing it.** `docx` already emits a font table and settings. Preserve unrelated entries, replace only matching Brand Kit families, and add embed settings idempotently.
7. **Licensing files are package parts too.** `NOTICE.txt` must have a declared `text/plain` content type. Content-type coverage tests must include non-XML support files, not only Office main parts.
8. **A ZIP signature is not an Office integrity test.** Browser smoke now opens the downloaded package, checks the required main part, verifies the DOTX main content type, confirms the notice, and inspects font relationship targets.
9. **Use both portable and native verification.** The portable validator catches deterministic structural defects in every environment. COM automation catches Office-specific repair behaviour that a ZIP/XML validator cannot model. Keep both lanes.
10. **Do not trust a reused Playwright localhost.** The broad local smoke initially reused another repository's server on port 3000 and returned unrelated 404s. For export verification, start this worktree on an unused port and set `PLAYWRIGHT_BASE_URL` explicitly.
11. **Fixture generation should use production renderers.** `office:fixtures` exercises the same public render APIs as the UI and avoids maintaining parallel sample builders. Keep generated `.office-smoke` files ephemeral and out of Git.
12. **System fonts remain a meaningful test path.** No embedded parts is correct for system-only selections, but the package must still pass the structural validator.

## Future goals

### Next hardening pass

- Add an XML-schema validation lane using the Microsoft Open XML SDK validator (or an equivalent maintained validator) in Windows CI. The portable validator proves well-formedness and relationship integrity, not full ECMA schema conformance.
- Run `office:fixtures` and the portable validator automatically in CI for every preset and both locales. The current generator covers every preset with English labels; French formula/list and template fixtures should become a first-class matrix.
- Add macOS Microsoft 365 and LibreOffice secondary smoke coverage when runners are available. Windows Office 2021+/Microsoft 365 remains the primary compatibility gate.
- Capture representative rendered DOCX pages, worksheet print previews, and slides for visual regression review. Native open-without-repair does not detect clipping, substitution, overflow, wrapping, or pagination defects.
- Add explicit validator regression fixtures for malformed XML, duplicate relationship IDs, orphan font relationships, missing content types, bad font signatures, and corrupted CRC entries.
- Teach `office:fixtures` to emit a machine-readable manifest containing preset, locale, format, font selection, package size, and validation result. Use it to prove coverage rather than infer coverage from filenames.

### Design-system follow-up

- Move Hub minutes and election ballot document construction onto `OfficeDesignTokens` semantic styles, not only the shared font finalizer. Preserve their data, tenancy, filenames, and API contracts.
- Replace remaining one-off Excel cell styling with named helpers for title, header, body, input, table, caption, and small text. Add assertions for freeze panes, print areas, row heights, widths, wrapping, body-font coverage, and calculation properties.
- Define and use explicit reusable PowerPoint title, content, and closing masters. The current uplift sets the theme-level heading/body faces and preserves the existing slide builders; masters are the next maintainability step.
- Add locale to PowerPoint theme generation instead of the current `en-CA` default, and verify French language metadata in generated decks.
- Audit whether Word table and small-text runs consistently consume semantic styles. Existing builders still contain deliberate direct-run formatting that should only be migrated with visual parity tests.

### Product follow-up

- Add a visible, localized integrity-specific error message instead of relying on the generic export failure copy. It should tell the user that the file was stopped before download and suggest retrying or selecting system fonts.
- Decide whether ZIP output controls should name the automatically included Word template. The `.dotx` is currently included whenever Word is selected, without adding another checkbox.
- Consider a template-only flow that clears example content while retaining preset structure. Current DOTX files intentionally preserve the same populated layout as their matching DOCX.
- Keep LEC directory roster population deferred until there is an explicit Org Chart product ticket; do not silently connect Hub data to an on-device Comms export.

### Operational follow-up

- Add a clean-port wrapper for local Playwright runs so `reuseExistingServer` cannot accidentally target another checkout.
- Decide whether installed-Office verification belongs on a dedicated self-hosted Windows CI runner. Do not make COM automation a requirement on Linux/macOS contributors.
- Track Office application version/build in native smoke output so a future repair regression can be tied to the exact Microsoft 365 or Office 2021 build.

## Guardrails for future edits

- Never obfuscate PowerPoint font data.
- Never replace the full Word font table.
- Never package a font relationship that is not referenced by the owning XML part.
- Never bypass `validateOfficePackage` in a new Office renderer or download path.
- Never commit generated `.office-smoke` artifacts.
- Preserve dynamic imports for heavy Office libraries on public tool routes.
- Preserve system-font no-op behaviour and OFL notice packaging for repository fonts.
