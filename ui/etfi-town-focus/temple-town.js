// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/temple-town.js
//
// Author: Zatygold
//
// Religious Site (PROJECT_TOWN_TEMPLE, Exploration Age only):
//   * +2 Happiness on all qualifying Buildings in this Town,
//   * +2 Relic Slots on Temples in this Town.
// Eligibility matches Urban Center (ageless / current-age / warehouse / unique /
// full-tile, never Walls). Buildings are listed in the same categories as Urban
// Center (built from contributions via fromQuarters): Quarters, Unique Quarters,
// Special Quarters, and Buildings (lone) - each building earns +2 Happiness.
// Unlike Urban Center, lone Buildings still earn the bonus, so that category is
// NOT hidden. Header pills: total Happiness and a +2 Relic Slots pill (relic icon).

import { ETFI_YIELDS, RELIC_ICON, getTownBuildings, countTemples, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, fromQuarters, foldByYield, sectionFrom } from "./contributions.js";

const HAPPINESS_PER_BUILDING = 2;
const RELIC_SLOTS_PER_TEMPLE = 2;

export function buildTempleModel(city) {
  const data = getTownBuildings(city);

  // Every qualifying building earns +2 Happiness, so a Quarter's pill sums its
  // buildings — that's the contribution count. Lone Buildings earn it too.
  const perBuilding = (q) => (q.buildings || []).length;
  const H = ETFI_YIELDS.HAPPINESS;
  const quarters = fromQuarters(data.quarters, H, HAPPINESS_PER_BUILDING, "q", perBuilding);
  const unique = fromQuarters(data.uniqueQuarters, H, HAPPINESS_PER_BUILDING, "u", perBuilding);
  const special = fromQuarters(data.specialQuarters, H, HAPPINESS_PER_BUILDING, "s", perBuilding);
  const lone = (data.buildings || []).map((b, i) =>
    contribution(H, HAPPINESS_PER_BUILDING, 1, { key: `b:${i}`, name: b.name, iconId: b.iconId })
  );
  const all = [...quarters, ...unique, ...special, ...lone];

  // Header pills next to the focus name: total Happiness (folded from the same
  // rows), plus the Relic Slots pill ONLY when the town actually has a Temple.
  const header = foldByYield(all);
  const relicSlots = countTemples(city) * RELIC_SLOTS_PER_TEMPLE;
  if (relicSlots > 0) {
    header.push({ yieldType: RELIC_ICON, value: relicSlots, colored: false });
  }

  return {
    header,
    rows: [],
    sections: [
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_QUARTERS", "Quarters"), quarters, { separatePanel: true }),
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_UNIQUE_QUARTERS", "Unique Quarters"), unique, { separatePanel: true }),
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"), special, { separatePanel: true }),
      ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_BUILDINGS", "Buildings"), lone, { separatePanel: "bottom" }),
    ],
    notes: [],
  };
}
