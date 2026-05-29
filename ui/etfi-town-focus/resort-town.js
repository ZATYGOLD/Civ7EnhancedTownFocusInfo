// File Path: ui/etfi-town-focus/resort-town.js
//
// Author: Zatygold
//
// Resort Town (PROJECT_TOWN_RESORT):
//   * APPEALING category: improved Appealing tiles, each with +1 Happiness /
//     +1 Gold pills (header shows the totals).
//   * TOURISM category (separate panel): improved Breathtaking tiles out of all
//     Breathtaking tiles in the town, with the calculated Tourism (+4 each).
//     When all requirements are met (Modern, 7+ improved Breathtaking, and
//     Globalism's Mastery), the Tourism pill is also shown next to the name.

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, hasGlobalismMastery, composeWithFallback } from "../../etfi-utilities.js";

const PER_TILE = 1;
const TOURISM_PER = 4;
const BREATHTAKING_MIN = 7;

export function buildResortModel(city) {
  const d = getResortData(city);

  const reqsMet =
    getCurrentAgeType() === "AGE_MODERN" &&
    d.breathtakingImproved >= BREATHTAKING_MIN &&
    hasGlobalismMastery();
  const tourism = reqsMet ? TOURISM_PER * d.breathtakingImproved : 0;

  const sections = [];

  // Appealing category (main panel).
  if (d.appealingImproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_APPEALING", "Appealing"),
      rows: d.appealingImproved.map((g) => ({
        iconId: g.iconId,
        name: g.name,
        count: g.count,
        yields: [
          { yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * PER_TILE },
          { yieldType: ETFI_YIELDS.GOLD, value: g.count * PER_TILE },
        ],
      })),
    });
  }

  // Tourism category (separate panel).
  sections.push({
    title: composeWithFallback("LOC_MOD_ETFI_TOURISM", "Tourism"),
    separatePanel: true,
    rows: [{
      name: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking"),
      countText: `${d.breathtakingImproved}/${d.breathtakingTotal}`,
      yields: [{ yieldType: TOURISM_ICON, value: tourism }],
    }],
    notes: reqsMet ? [] : [composeWithFallback("LOC_MOD_ETFI_REQUIRES_GLOBALISM", "Requires Globalism's Mastery")],
  });

  const appealingTotal = d.appealingImproved.reduce((s, g) => s + g.count, 0);
  const header = [
    { yieldType: ETFI_YIELDS.HAPPINESS, value: appealingTotal * PER_TILE },
    { yieldType: ETFI_YIELDS.GOLD, value: appealingTotal * PER_TILE },
  ];
  if (reqsMet) {
    header.push({ yieldType: TOURISM_ICON, value: tourism });
  }

  const notes = [];
  if (d.naturalWonders) {
    notes.push(`+50% tile yields from Natural Wonders (${d.naturalWonders})`);
  }

  return { header, rows: [], sections, notes };
}
