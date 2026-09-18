// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters. Categories (built from contributions via fromQuarters), each in its own
// panel:
//   * Quarters         - tiles with 2+ qualifying buildings (the bonus unit),
//   * Unique Quarters  - civ-specific quarters (e.g. Acropolis),
//   * Special Quarters - full-tile buildings (Rail Station, Launch Pad, ...),
//   * Buildings (hidden) - lone qualifying buildings that are NOT a Quarter yet
//     (no bonus, hidden by default since Urban Center only rewards Quarters).
// Each quarter row lists its building(s) with the +1 Science / +1 Culture pills.

import { ETFI_YIELDS, getTownBuildings, getModifierAmount, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, fromQuarters, foldByYield, sectionFrom } from "./contributions.js";

// Modifier ids from base-standard/data/projects-gameeffects.xml. The two yields
// carry their own Amount, so they are read separately rather than assumed equal.
const MOD_SCIENCE = "ATTACH_SCIENCE_QUARTERS_FROM_PROJECT";
const MOD_CULTURE = "ATTACH_CULTURE_QUARTERS_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if a modifier row can't be read.
const FALLBACK_PER_QUARTER = 1;

export function buildUrbanModel(city) {
  const data = getTownBuildings(city);
  const sciencePer = getModifierAmount(MOD_SCIENCE, "Amount", FALLBACK_PER_QUARTER);
  const culturePer = getModifierAmount(MOD_CULTURE, "Amount", FALLBACK_PER_QUARTER);

  // Each Quarter earns Science and Culture (fixed per quarter). Calling
  // fromQuarters twice with the same key prefix layers both yields onto the
  // same rows.
  const quarterContribs = (list, prefix) => [
    ...fromQuarters(list, ETFI_YIELDS.SCIENCE, sciencePer, prefix),
    ...fromQuarters(list, ETFI_YIELDS.CULTURE, culturePer, prefix),
  ];
  const quarters = quarterContribs(data.quarters, "q");
  const unique = quarterContribs(data.uniqueQuarters, "u");
  const special = quarterContribs(data.specialQuarters, "s");
  // Lone Buildings aren't Quarters yet, so they earn nothing (listed for
  // reference, hence a null yield type).
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
