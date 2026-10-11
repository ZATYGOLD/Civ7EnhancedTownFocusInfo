// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Resort Town (PROJECT_TOWN_RESORT), three categories:
//   * TOURISM — one Breathtaking row, colored only once every requirement is met
//     (Modern, 7+ developed Breathtaking, Globalism's Mastery).
//   * NATURAL WONDERS — one row per wonder, +50% of its accumulated tile yields.
//   * APPEALING — worked tiles earning +1 Happiness / +1 Gold. Improved Natural
//     Wonder tiles are excluded; addNaturalWonderYields already folded their
//     appealing bonus into the rows above.

import { ETFI_YIELDS, TOURISM_ICON, getResortData, getCurrentAgeType, hasGlobalismMastery, resortAppealingPerTile, getVictoryScoringPoints, composeWithFallback } from "../utilities/utilities-town-focus.js";
import { contribution, fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// The per-tile Happiness/Gold amount comes from resortAppealingPerTile() in the
// data layer, which already reads it for the Natural Wonder rows. Declaring the
// modifier id a second time here let the two halves of one Resort preview drift
// apart if only one copy was updated — exactly what contributions.js exists to
// prevent.
//
// Tourism is NOT a project modifier — it is a victory-point tracker row in
// base-standard/data/victories.xml, activated by the Globalism civic.
const SCORING_TOURISM = "VICTORY_TRACKER_RESORT_TOWN_TOURISM_MODERN";
// Last-known-good (game 1.5.0), used only if the game data can't be read.
const FALLBACK_TOURISM = 4;

// The "7 developed Breathtaking tiles" requirement has NO representation in the
// game data that could be located — it is not a GlobalParameter, a modifier
// argument, or a VictoryScoringArgs row. It stays a constant until a source for
// it is found; do not assume it is data-driven like the numbers above.
const BREATHTAKING_MIN = 7;

const HEX_ICON_CLASS = "general-appeal-legend-hex size-5 bg-contain bg-no-repeat";
const HEX_ICON_STYLE = "fxs-background-image-tint: rgb(26, 90, 0);";
// Worked Natural Wonder tile improvement icon.
const NATURAL_WONDER_ICON = "IMPROVEMENT_EXPEDITION_BASE";

export function buildResortModel(city) {
  const d = getResortData(city);
  const developed = d.breathtakingImprovements + d.breathtakingDistricts;
  const PER_TILE = resortAppealingPerTile();
  const TOURISM_PER = getVictoryScoringPoints(SCORING_TOURISM, FALLBACK_TOURISM);

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

  // One row per wonder. addNaturalWonderYields already folded in the appealing
  // +1/+1, which is why these tiles are NOT also counted as Appealing below.
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
