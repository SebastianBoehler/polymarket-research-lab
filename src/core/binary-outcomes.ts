export type BinaryOutcome = "yes" | "no";

export function binaryOutcome(value: unknown): BinaryOutcome | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toLowerCase();
  if (label === "yes" || label === "up") return "yes";
  if (label === "no" || label === "down") return "no";
  return null;
}

export function jsonArray(value: unknown): unknown[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
  return parsed;
}

export function binaryIndices(outcomes: unknown): { yes: number; no: number } | null {
  const labels = jsonArray(outcomes).map(binaryOutcome);
  if (labels.length !== 2 || !labels.includes("yes") || !labels.includes("no")) return null;
  return { yes: labels.indexOf("yes"), no: labels.indexOf("no") };
}
