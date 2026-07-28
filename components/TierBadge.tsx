import { getTier, tierByName, UNRANKED, GUEST, type Tier } from "@/lib/tiers";
import { formatWeight, type Unit } from "@/lib/units";

// The loud element. Small rectangular chip: uppercase, 10px bold, letter-spacing,
// colored 1px border + tinted background. Rendered as e.g. [ GOLD · 725 lb ].
//
// - guest              -> [ GUEST ]
// - totalLb null/undef -> [ UNRANKED ]  (logged-in but not verified)
// - otherwise ranked, showing the value in the viewer's unit. If tierName is
//   given (a snapshot), that tier's colors/name are used verbatim.
export default function TierBadge({
  totalLb,
  tierName,
  unit = "lb",
  guest = false,
}: {
  totalLb?: number | null;
  tierName?: string | null;
  unit?: Unit;
  guest?: boolean;
}) {
  let label: string;
  let color: string;
  let bg: string;
  let fg: string | undefined;

  if (guest) {
    label = GUEST.name;
    color = GUEST.color;
    bg = GUEST.bg;
  } else if (totalLb == null) {
    label = UNRANKED.name;
    color = UNRANKED.color;
    bg = UNRANKED.bg;
  } else {
    const tier: Tier =
      (tierName ? tierByName(tierName) : undefined) ?? getTier(totalLb);
    label = `${tier.name} · ${formatWeight(totalLb, unit)}`;
    color = tier.color;
    bg = tier.bg;
    fg = tier.fg;
  }

  return (
    <span
      className="inline-block align-middle"
      style={{
        border: `1px solid ${color}`,
        background: bg,
        color: fg ?? color,
        borderRadius: 2,
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
