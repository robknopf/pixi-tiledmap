export function parseTintColor(hex: string): number {
  const clean = hex.replace('#', '')
  // #AARRGGBB → strip alpha, use RRGGBB
  if (clean.length === 8) {
    return parseInt(clean.slice(2), 16)
  }
  // #RRGGBB
  return parseInt(clean, 16)
}
