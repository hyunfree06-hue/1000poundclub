// Single source of truth for the tier system. Tier is computed from total_lb.
// Colors per spec. The badge is the one visually loud element on the site.

export interface Tier {
  name: string;
  min: number; // inclusive lower bound in lb
  color: string; // border + text color
  bg: string; // tinted background
  fg?: string; // text override (BEAST only)
}

// Ordered high -> low so the first match wins.
export const TIERS: Tier[] = [
  { name: "BEAST", min: 1400, color: "#111111", bg: "#111111", fg: "#c9a227" },
  { name: "FREAK", min: 1200, color: "#e0402c", bg: "#fdecea" },
  { name: "1000 LB CLUB", min: 1000, color: "#7b2fd4", bg: "#f2ebfb" },
  { name: "DIAMOND", min: 950, color: "#3b7dd8", bg: "#eaf1fb" },
  { name: "PLATINUM", min: 800, color: "#4a90a4", bg: "#eaf3f6" },
  { name: "GOLD", min: 600, color: "#c9a227", bg: "#faf5e3" },
  { name: "SILVER", min: 400, color: "#9aa0a6", bg: "#f2f3f4" },
  { name: "BRONZE", min: 0, color: "#8c6239", bg: "#f5efe8" },
];

export function getTier(totalLb: number): Tier {
  return TIERS.find((t) => totalLb >= t.min) ?? TIERS[TIERS.length - 1];
}

// Look up a tier by its snapshot name (used for post/comment snapshots so old
// posts keep their original badge even if the schema colors change).
export function tierByName(name: string): Tier | undefined {
  return TIERS.find((t) => t.name === name);
}

// Neutral chips for non-ranked authors.
export const UNRANKED: Pick<Tier, "name" | "color" | "bg"> = {
  name: "UNRANKED",
  color: "#767676",
  bg: "#f2f3f4",
};

export const GUEST: Pick<Tier, "name" | "color" | "bg"> = {
  name: "GUEST",
  color: "#767676",
  bg: "#f2f3f4",
};
