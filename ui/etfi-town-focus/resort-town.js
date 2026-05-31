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
//   * NATURAL WONDERS (below Tourism, above Improved): one row per wonder, with
//     the tile count (x#) and +50% of the wonder's accumulated tile yields.
//   * APPEALING tiles split into Improved (+1 Happiness / +1 Gold) and
//     Unimproved (no yield).

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, hasGlobalismMastery, composeWithFallback, improvedUnimprovedSections } from "../../etfi-utilities.js";

const PER_TILE = 1;
const TOURISM_PER = 4;
const BREATHTAKING_MIN = 7;

const HEX_ICON_CLASS = "general-appeal-legend-hex size-5 bg-contain bg-no-repeat";
const HEX_ICON_STYLE = "fxs-background-image-tint: rgb(26, 90, 0);";
// Worked Natural Wonder tile improvement icon.
const NATURAL_WONDER_ICON = "IMPROVEMENT_EXPEDITION_BASE";

export function buildResortModel(city) {
  const d = getResortData(city);
  const developed = d.breathtakingImprovements + d.breathtakingDistricts;

  const isModern = getCurrentAgeType() === "AGE_MODERN";
  const reqsMet =
    isModern &&
    developed >= BREATHTAKING_MIN &&
    hasGlobalismMastery();

  const sections = [];

  // Tourism category — top, separate panel. Tourism is a Modern-Age-only bonus,
  // so the whole category is disabled (omitted) outside the Modern Age.
  if (isModern) {
    // Hover breakdown for the Breathtaking text: separate Improvements and
    // Districts containers, each listing the developed Breathtaking tiles by
    // type (icon │ name x#) with the Tourism yield pill on the right.
    // Improvements: grouped by type with x# (you can have many of the same).
    const tourismRow = (g) => ({
      iconId: g.iconId,
      name: g.name,
      count: g.count,
      yields: [{ yieldType: TOURISM_ICON, value: TOURISM_PER * g.count, colored: reqsMet }],
    });
    // Districts: one row per tile, listing the tile's building(s) on a single
    // line (no x# — a settlement can't have two of the same building). Each tile
    // is one developed Breathtaking District worth +TOURISM_PER Tourism.
    const districtRow = (tile) => ({
      items: (tile || []).map((b) => ({ iconId: b.iconId, name: b.name })),
      yields: [{ yieldType: TOURISM_ICON, value: TOURISM_PER, colored: reqsMet }],
    });
    // Always render BOTH containers (each with its category Tourism total) so the
    // Breathtaking hover — and the name's hover-cue color — are present even
    // before any tiles are developed. Each container lists its tiles by type.
    const breakdownModel = {
      sections: [
        {
          title: composeWithFallback("LOC_MOD_ETFI_IMPROVEMENTS", "Improvements"),
          rows: d.breathtakingImprovementGroups.map(tourismRow),
        },
        {
          title: composeWithFallback("LOC_MOD_ETFI_DISTRICTS", "Districts"),
          rows: d.breathtakingDistrictTiles.map(districtRow),
        },
      ],
    };

    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_TOURISM", "Tourism"),
      separatePanel: "top",
      rows: [{
        iconClass: HEX_ICON_CLASS,
        iconStyle: HEX_ICON_STYLE,
        name: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking"),
        tipModel: breakdownModel,
        countText: `${developed}/${BREATHTAKING_MIN}`,
        yields: [{ yieldType: TOURISM_ICON, value: TOURISM_PER * developed, colored: reqsMet }],
      }],
      notes: reqsMet ? [] : [composeWithFallback("LOC_MOD_ETFI_REQUIRES_GLOBALISM", "Requires Globalism's Mastery")],
    });
  }

  // Natural Wonders — own panel below Tourism, above Improved. One row per
  // wonder, with the tile count (x#) and +50% of its accumulated yields.
  if (d.naturalWonders.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_NATURAL_WONDERS", "Natural Wonders"),
      separatePanel: "top",
      rows: d.naturalWonders.map((w) => ({
        iconId: NATURAL_WONDER_ICON,
        name: w.name,
        count: w.count,
        yields: w.yields,
      })),
    });
  }

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

  // Add the Natural Wonder bonus (+50% yields) to the header. The section
  // renderer merges duplicate yield types into one pill, so we can push each
  // wonder's yields directly (they'll fold in with the appealing Happiness/Gold).
  for (const w of d.naturalWonders) {
    for (const y of w.yields) {
      if (y.value > 0) header.push({ yieldType: y.yieldType, value: y.value });
    }
  }

  return { header, rows: [], sections, notes: [] };
}
