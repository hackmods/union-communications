/** Detect an OOXML relationship Type attribute without substring false positives. */
export function ooxmlRelationshipTypePresent(relsXml: string, relationshipType: string): boolean {
  const escaped = relationshipType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<Relationship\\b[^>]*\\bType="${escaped}"[^>]*/?>`,
    "i",
  );
  return re.test(relsXml);
}
