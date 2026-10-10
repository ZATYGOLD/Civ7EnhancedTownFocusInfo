// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture per
// Quarter. The bonus unit is the quarter (2+ qualifying buildings on a tile),
// so lone Buildings are listed for reference only and earn nothing.

import { ETFI_YIELDS, getTownBuildings, getModifierAmount, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, fromQuarters, foldByYield, sectionFrom } from "./contributions.js";

// The two yields carry their own Amount, so they are read separately rather
// than assumed equal.
const MOD_SCIENCE = "ATTACH_SCIENCE_QUARTERS_FROM_PROJECT";
const MOD_CULTURE = "ATTACH_CULTURE_QUARTERS_FROM_PROJECT";
// Game 1.5.0 value, used only if a modifier row can't be read.
const FALLBACK_PER_QUARTER = 1;

export function buildUrbanModel(city) {
  const data = getTownBuildings(city);
  const sciencePer = getModifierAmount(MOD_SCIENCE, "Amount", FALLBACK_PER_QUARTER);
  const culturePer = getModifierAmount(MOD_CULTURE, "Amount", FALLBACK_PER_QUARTER);

  // Reusing the same key prefix layers both yields onto the same rows.
  const quarterContribs = (list, prefix) => [
    ...fromQuarters(list, ETFI_YIELDS.SCIENCE, sciencePer, prefix),
    ...fromQuarters(list, ETFI_YIELDS.CULTURE, culturePer, prefix),
  ];
  const quarters = quarterContribs(data.quarters, "q");
  const unique = quarterContribs(data.uniqueQuarters, "u");
  const special = quarterContribs(data.specialQuarters, "s");
  const lone = (data.buildings || []).map((b, i) =>
    contribution(null, 0, 1, { key: `b:${i}`, name: b.name, iconId: b.iconId })
  );

  return {
    header: foldByYield([...quarters, ...unique, ...special]),
    rows: [],
    sections: [
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_QUARTERS", "Quarters"), quarters, { separatePanel: true }),
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_UNIQUE_QUARTERS", "Unique Quarters"), unique, { separatePanel: true }),
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"), special, { separatePanel: true }),
      // For Urban Center this category is labeled "Districts", not "Buildings".
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_DISTRICTS", "Districts"), lone, { separatePanel: "bottom" }),
    ],
    notes: [],
  };
}
