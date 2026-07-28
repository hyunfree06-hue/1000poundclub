export type Unit = "lb" | "kg";

// Everything is stored in lb. These helpers convert for input/display only.
const LB_PER_KG = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

// Convert a stored lb value into the viewer's unit, rounded to a whole number
// for the dense table look.
export function toDisplay(lb: number, unit: Unit): number {
  const v = unit === "kg" ? lbToKg(lb) : lb;
  return Math.round(v);
}

// "725 lb" / "329 kg"
export function formatWeight(lb: number, unit: Unit): string {
  return `${toDisplay(lb, unit)} ${unit}`;
}

export function isUnit(v: unknown): v is Unit {
  return v === "lb" || v === "kg";
}
