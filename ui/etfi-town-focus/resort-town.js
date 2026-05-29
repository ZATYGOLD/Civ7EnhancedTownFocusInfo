// File Path: ui/etfi-town-focus/resort-town.js
//
// Author: Zatygold
//
// Resort Town (PROJECT_TOWN_RESORT): +1 Happiness and +1 Gold on Appealing
// tiles (listed by improvement), +50% Natural Wonder tile yields, and +4
// Tourism on improved Breathtaking tiles when 7+ (Modern, Globalism's Mastery).

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, composeWithFallback } from "../../etfi-utilities.js";

const PER_APPEALING = 1;
const TOURISM_PER = 4;
const BREATHTAKING_MIN = 7;

export function buildResortModel(city) {
  const d = getResortData(city);
  const tourismActive =
    getCurrentAgeType() === "AGE_MODERN" && d.breathtakingImprovedCount >= BREATHTAKING_MIN;

  // Appealing tiles, grouped by improvement, with +1 Happiness / +1 Gold each.
  const rows = d.appealingImproved.map((g) => ({
    iconId: g.iconId,
    name: g.name,
    count: g.count,
    yields: [
      { yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * PER_APPEALING },
      { yieldType: ETFI_YIELDS.GOLD, value: g.count * PER_APPEALING },
    ],
  }));
  if (d.appealingUnimprovedCount) {
    rows.push({
      name: composeWithFallback("LOC_MOD_ETFI_UNIMPROVED", "Unimproved"),
      count: d.appealingUnimprovedCount,
      yields: [
        { yieldType: ETFI_YIELDS.HAPPINESS, value: d.appealingUnimprovedCount * PER_APPEALING },
        { yieldType: ETFI_YIELDS.GOLD, value: d.appealingUnimprovedCount * PER_APPEALING },
      ],
    });
  }

  // Breathtaking tourism progress (n / 7), with the tourism pill.
  const sections = [{
    title: null,
    rows: [{
      name: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking"),
      countText: `${d.breathtakingImprovedCount}/${BREATHTAKING_MIN}`,
      yields: [{ yieldType: TOURISM_ICON, value: tourismActive ? TOURISM_PER * d.breathtakingImprovedCount : 0 }],
      subText: composeWithFallback("LOC_MOD_ETFI_REQUIRES_GLOBALISM", "Requires Globalism's Mastery"),
    }],
  }];

  const header = [
    { yieldType: ETFI_YIELDS.HAPPINESS, value: d.appealingTotal * PER_APPEALING },
    { yieldType: ETFI_YIELDS.GOLD, value: d.appealingTotal * PER_APPEALING },
  ];
  if (tourismActive) {
    header.push({ yieldType: TOURISM_ICON, value: TOURISM_PER * d.breathtakingImprovedCount });
  }

  const notes = [];
  if (d.naturalWonders) {
    notes.push(`+50% tile yields from Natural Wonders (${d.naturalWonders})`);
  }

  return { header, rows, sections, notes };
}
