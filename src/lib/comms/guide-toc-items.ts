/** Build GuideLayout TOC items from [id, messageKey] pairs. */
export function guideTocItems<
  const Pairs extends readonly (readonly [string, string])[],
>(
  pairs: Pairs,
  label: (key: Pairs[number][1]) => string,
): { id: string; label: string }[] {
  return pairs.map(([id, key]) => ({ id, label: label(key) }));
}
