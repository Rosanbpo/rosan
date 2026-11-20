export type NpsClass = "PROMOTOR" | "NEUTRO" | "DETRATOR";
export const classifyNps = (score: number): NpsClass => (score >= 9 ? "PROMOTOR" : score >= 7 ? "NEUTRO" : "DETRATOR");

/** NPS = % promotores − % detratores (de −100 a 100). Null sem respostas. */
export function npsScore(scores: number[]): number | null {
  if (!scores.length) return null;
  const p = scores.filter((s) => s >= 9).length;
  const d = scores.filter((s) => s <= 6).length;
  return Math.round(((p - d) / scores.length) * 100);
}
