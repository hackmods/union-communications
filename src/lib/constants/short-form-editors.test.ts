import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  SHORT_FORM_EDITORS,
  SHORT_FORM_USE_CASE_IDS,
  type ShortFormEditorId,
} from "./short-form-editors";

describe("short-form editors registry", () => {
  it("leads with the native phone editor and does not rank CapCut first", () => {
    expect(SHORT_FORM_EDITORS[0]?.id).toBe("device-native");
    expect(SHORT_FORM_EDITORS[SHORT_FORM_EDITORS.length - 1]?.id).toBe(
      "capcut",
    );
  });

  it("keeps unique ids and known use-case keys", () => {
    const ids = SHORT_FORM_EDITORS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const editor of SHORT_FORM_EDITORS) {
      expect(editor.useCaseIds.length).toBeGreaterThan(0);
      for (const useCase of editor.useCaseIds) {
        expect(SHORT_FORM_USE_CASE_IDS).toContain(useCase);
      }
    }
  });

  it("has matching EN/FR copy for every editor and use-case", () => {
    const enGuide = en.shortFormGuide;
    const frGuide = fr.shortFormGuide;
    for (const editor of SHORT_FORM_EDITORS) {
      const id = editor.id as ShortFormEditorId;
      expect(enGuide.editors[id].name, `en editors.${id}.name`).toBeTruthy();
      expect(frGuide.editors[id].name, `fr editors.${id}.name`).toBeTruthy();
      expect(enGuide.editors[id].when).toBeTruthy();
      expect(frGuide.editors[id].when).toBeTruthy();
      expect(enGuide.pricing[editor.pricing]).toBeTruthy();
      expect(frGuide.pricing[editor.pricing]).toBeTruthy();
      expect(enGuide.privacy[editor.privacy]).toBeTruthy();
      expect(frGuide.privacy[editor.privacy]).toBeTruthy();
    }
    for (const useCase of SHORT_FORM_USE_CASE_IDS) {
      expect(enGuide.useCases[useCase]).toBeTruthy();
      expect(frGuide.useCases[useCase]).toBeTruthy();
    }
  });
});
