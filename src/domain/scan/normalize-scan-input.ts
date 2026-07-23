/** Clean raw scanner / camera output before resolving targets. */
export function normalizeScanInput(input: string): string {
  return input
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "");
}
