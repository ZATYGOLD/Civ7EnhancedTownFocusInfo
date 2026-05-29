// File Path: ui/etfi-town-focus/resort-town.js
//
// Author: Zatygold
//
// Resort Town (PROJECT_TOWN_RESORT):
//   * TOURISM category (top, separate panel): improved Breathtaking tiles out
//     of the 7 required, with the total calculated Tourism (+4 each). When all
//     requirements are met (Modern, 7+ improved Breathtaking, Globalism's
//     Mastery), the Tourism pill is also shown next to the focus name.
//   * APPEALING tiles split into Improved (+1 Happiness / +1 Gold) and
//     Unimproved (no yield), like the other focuses.

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, hasGlobalismMastery, composeWithFallback } from "../../etfi-utilities.js";

const PER_TILE = 1;
const TOURISM_PER = 4;
const BREATHTAKING_MIN = 7;

// The appeal "Breathtaking" hex, tinted, reused from the appeal lens legend.
const HEX_ICON_CLASS = "general-appeal-legend-hex size-5 bg-contain bg-no-repeat";
const HEX_ICON_STYLE = "fxs-background-image-tint: rgb(26, 90, 0);";

export function buildResortModel(city) {
  const d = getResortData(city);

  const reqsMet =
    getCurrentAgeType() === "AGE_MODERN" &&
    d.breathtakingImproved >= BREATHTAKING_MIN &&
    hasGlobalismMastery();
  const tourism = TOURISM_PER * d.breathtakingImproved; // total calculated tourism

  const sections = [];

  // Tourism category — top, separate panel.
  sections.push({
    title: composeWithFallback("LOC_MOD_ETFI_TOURISM", "Tourism"),
    separatePanel: true,
    rows: [{
      iconClass: HEX_ICON_CLASS,
      iconStyle: HEX_ICON_STYLE,
      name: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking"),
      countText: `${d.breathtakingImproved}/${BREATHTAKING_MIN}`,
      yields: [{ yieldType: TOURISM_ICON, value: tourism, colored: reqsMet }],
    }],
    notes: reqsMet ? [] : [composeWithFallback("LOC_MOD_ETFI_REQUIRES_GLOBALISM", "Requires Globalism's Mastery")],
  });

  // Appealing — Improved (with Happiness / Gold).
  if (d.appealingImproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"),
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

  // Appealing — Unimproved (no yield).
  if (d.appealingUnimproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIMPROVED", "Unimproved"),
      rows: d.appealingUnimproved.map((g) => ({ iconId: g.iconId, name: g.name, count: g.count })),
    });
  }

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
