// File Path: ui/etfi-town-focus/resort-town.js
//
// Author: Zatygold
//
// Resort Town (PROJECT_TOWN_RESORT): +1 Happiness and +1 Gold on Appealing
// tiles, +50% tile yields from Natural Wonders, and +4 Tourism on improved
// Breathtaking tiles when there are 7+ of them (Modern, after Globalism's
// Mastery). Lists each improved Breathtaking tile's improvement.

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, composeWithFallback } from "../../etfi-utilities.js";

const PER_APPEALING = 1;
const TOURISM_PER = 4;
const BREATHTAKING_MIN = 7;

export function buildResortModel(city) {
  const data = getResortData(city);
  const tourismActive =
    getCurrentAgeType() === "AGE_MODERN" && data.breathtakingImprovedCount >= BREATHTAKING_MIN;

  const rows = [];
  if (data.appealing) {
    rows.push({
      name: composeWithFallback("LOC_MOD_ETFI_APPEALING_TILES", "Appealing Tiles"),
      count: data.appealing,
      yields: [
        { yieldType: ETFI_YIELDS.HAPPINESS, value: data.appealing * PER_APPEALING },
        { yieldType: ETFI_YIELDS.GOLD, value: data.appealing * PER_APPEALING },
      ],
    });
  }

  const sections = [];
  if (data.breathtakingImproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking (Improved)"),
      rows: data.breathtakingImproved.map((b) => ({
        iconId: b.iconId,
        name: b.name,
        count: b.count,
        yields: tourismActive ? [{ yieldType: TOURISM_ICON, value: TOURISM_PER * b.count }] : [],
      })),
    });
  }

  const notes = [];
  if (data.naturalWonders) {
    notes.push(`+50% tile yields from Natural Wonders (${data.naturalWonders})`);
  }
  notes.push(
    `+${TOURISM_PER} [icon:${TOURISM_ICON}] Tourism on improved Breathtaking tiles when 7+ (Modern, after Globalism's Mastery) — ${data.breathtakingImprovedCount} improved`
  );

  return {
    header: [
      { yieldType: ETFI_YIELDS.HAPPINESS, value: data.appealing * PER_APPEALING },
      { yieldType: ETFI_YIELDS.GOLD, value: data.appealing * PER_APPEALING },
    ],
    rows,
    sections,
    notes,
  };
}
