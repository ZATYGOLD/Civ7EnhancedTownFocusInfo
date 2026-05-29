// File Path: ui/etfi-town-focus/resort-town.js
//
// Author: Zatygold
//
// Resort Town (PROJECT_TOWN_RESORT):
//   * TOURISM category (top, separate panel): a single Breathtaking row
//     (hex icon, developed/7, total Tourism pill). Hovering the "Breathtaking"
//     text shows a tooltip with the Improvements / Districts breakdown. Tourism
//     is colored only when all requirements are met (Modern, 7+ developed
//     Breathtaking, Globalism's Mastery), and also appears next to the focus
//     name when met. A "Requires Globalism's Mastery" note shows until met.
//   * APPEALING tiles split into Improved (+1 Happiness / +1 Gold) and
//     Unimproved (no yield).

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, hasGlobalismMastery, composeWithFallback, improvedUnimprovedSections } from "../../etfi-utilities.js";

const PER_TILE = 1;
const TOURISM_PER = 4;
const BREATHTAKING_MIN = 7;

const HEX_ICON_CLASS = "general-appeal-legend-hex size-5 bg-contain bg-no-repeat";
const HEX_ICON_STYLE = "fxs-background-image-tint: rgb(26, 90, 0);";

export function buildResortModel(city) {
  const d = getResortData(city);
  const developed = d.breathtakingImprovements + d.breathtakingDistricts;

  const reqsMet =
    getCurrentAgeType() === "AGE_MODERN" &&
    developed >= BREATHTAKING_MIN &&
    hasGlobalismMastery();

  // Hover breakdown for the Breathtaking text (rendered via Locale.stylize).
  const breakdownTip = [
    `${composeWithFallback("LOC_MOD_ETFI_IMPROVEMENTS", "Improvements")}: ${d.breathtakingImprovements} (+${TOURISM_PER * d.breathtakingImprovements} [icon:${TOURISM_ICON}])`,
    `${composeWithFallback("LOC_MOD_ETFI_DISTRICTS", "Districts")}: ${d.breathtakingDistricts} (+${TOURISM_PER * d.breathtakingDistricts} [icon:${TOURISM_ICON}])`,
  ].join("[N]");

  const sections = [];

  // Tourism category — top, separate panel.
  sections.push({
    title: composeWithFallback("LOC_MOD_ETFI_TOURISM", "Tourism"),
    separatePanel: "top",
    rows: [{
      iconClass: HEX_ICON_CLASS,
      iconStyle: HEX_ICON_STYLE,
      name: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking"),
      tooltip: breakdownTip,
      countText: `${developed}/${BREATHTAKING_MIN}`,
      yields: [{ yieldType: TOURISM_ICON, value: TOURISM_PER * developed, colored: reqsMet }],
    }],
    notes: reqsMet ? [] : [composeWithFallback("LOC_MOD_ETFI_REQUIRES_GLOBALISM", "Requires Globalism's Mastery")],
  });

  // Appealing tiles — shared Improved (+1 Happiness / +1 Gold) / Unimproved.
  for (const s of improvedUnimprovedSections({
    improved: d.appealingImproved,
    unimproved: d.appealingUnimproved,
    improvedYields: (g) => [
      { yieldType: ETFI_YIELDS.HAPPINESS, value: g.count * PER_TILE },
      { yieldType: ETFI_YIELDS.GOLD, value: g.count * PER_TILE },
    ],
  })) {
    sections.push(s);
  }

  const appealingTotal = d.appealingImproved.reduce((s, g) => s + g.count, 0);
  const header = [
    { yieldType: ETFI_YIELDS.HAPPINESS, value: appealingTotal * PER_TILE },
    { yieldType: ETFI_YIELDS.GOLD, value: appealingTotal * PER_TILE },
  ];
  if (reqsMet) {
    header.push({ yieldType: TOURISM_ICON, value: TOURISM_PER * developed });
  }

  const notes = [];
  if (d.naturalWonders) {
    notes.push(`+50% tile yields from Natural Wonders (${d.naturalWonders})`);
  }

  return { header, rows: [], sections, notes };
}
