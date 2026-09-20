import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { OfficePackageValidationError, validateOfficePackage } from "./office-package-validator";

describe("office-package-validator", () => {
  it("rejects a non-ZIP payload", async () => {
    await expect(validateOfficePackage(new Blob(["not a zip"]), "docx")).rejects.toBeInstanceOf(OfficePackageValidationError);
  });

  it("rejects an unresolved relationship", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>');
    zip.file("word/document.xml", "<document/>");
    zip.file("word/_rels/document.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="missing.xml"/></Relationships>');
    const blob = new Blob([Buffer.from(await zip.generateAsync({ type: "uint8array" }))]);
    await expect(validateOfficePackage(blob, "docx")).rejects.toThrow("unresolved relationship");
  });
});
