// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
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
//   * APPEALING tiles: only the Improved (worked) ones are listed, each earning
//     +1 Happiness / +1 Gold. Improved Natural Wonder tiles are deliberately
//     excluded here — their appealing bonus is already folded into the Natural
//     Wonders rows above (see addNaturalWonderYields).

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, hasGlobalismMastery, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, fromGroups, foldByYield, sectionFrom } from "./contributions.js";

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
  // Empty in non-Modern ages, so Tourism simply drops out of both the section
  // list and the header.
  let tourismContributions = [];

  // Tourism — Modern-Age-only, so the category is omitted in other ages.
  if (isModern) {
    // Breathtaking hover: separate Improvements / Districts containers, each row
    // with its Tourism pill. Improvements group by type with x# (you can have
    // many of the same).
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
    // Always render BOTH containers so the hover (and the name's cue color) show
    // even before any tiles are developed.
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

    // One row: `developed` Breathtaking tiles each worth TOURISM_PER. The pill
    // stays uncoloured until the town meets every requirement.
    tourismContributions = [contribution(
      TOURISM_ICON,
      TOURISM_PER,
      developed,
      {
        key: "breathtaking",
        iconClass: HEX_ICON_CLASS,
        iconStyle: HEX_ICON_STYLE,
        name: composeWithFallback("LOC_MOD_ETFI_BREATHTAKING", "Breathtaking"),
        tipModel: breakdownModel,
        countText: `${developed}/${BREATHTAKING_MIN}`,
      },
      undefined,
      { colored: reqsMet }
    )];

    sections.push(...sectionFrom(
      composeWithFallback("LOC_MOD_ETFI_TOURISM", "Tourism"),
      tourismContributions,
      {
        separatePanel: "top",
        notes: reqsMet ? [] : [composeWithFallback("LOC_MOD_ETFI_REQUIRES_GLOBALISM", "Requires Globalism's Mastery")],
      }
    ));
  }

  // Natural Wonders — own panel below Tourism, above Improved. One row per
  // wonder, with the tile count (x#) and its accumulated Resort contribution
  // (+50% of the tile's yields, and the appealing +1/+1 already folded in by
  // addNaturalWonderYields — which is why these tiles are deliberately NOT also
  // counted in the Appealing category below).
  const nwContributions = [];
  for (const w of d.naturalWonders) {
    const source = { name: w.name, iconId: NATURAL_WONDER_ICON, count: w.count };
    for (const y of w.yields || []) {
      nwContributions.push(contribution(y.yieldType, y.value, 1, source));
    }
  }

  // Appealing improved tiles — each earns +1 Happiness / +1 Gold. Two passes over
  // the same groups layer both yields onto one row per group.
  const appealing = [
    ...fromGroups(d.appealingImproved, ETFI_YIELDS.HAPPINESS, PER_TILE),
    ...fromGroups(d.appealingImproved, ETFI_YIELDS.GOLD, PER_TILE),
  ];

  sections.push(
    ...sectionFrom(
      composeWithFallback("LOC_MOD_ETFI_NATURAL_WONDERS", "Natural Wonders"),
      nwContributions,
      { separatePanel: "top" }
    ),
    ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), appealing)
  );

  // Header folds the SAME contributions that built the rows, so it is always
  // their sum. Tourism is the one deliberate exception: the row always renders
  // (so the breakdown hover works before the town qualifies) but the pill by the
  // focus name only appears once the requirements are met.
  const header = foldByYield([
    ...appealing,
    ...(reqsMet ? tourismContributions : []),
    ...nwContributions,
  ]);

  return { header, rows: [], sections, notes: [] };
}
