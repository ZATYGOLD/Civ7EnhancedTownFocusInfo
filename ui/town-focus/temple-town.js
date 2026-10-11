// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Religious Site (PROJECT_TOWN_TEMPLE, Exploration Age only): +2 Happiness per
// qualifying Building, +2 Relic Slots per Temple. Unlike Urban Center the bonus
// is per building, not per quarter, so lone Buildings earn it too and that
// category is not hidden.

import { ETFI_YIELDS, RELIC_ICON, getTownBuildings, countTemples, getModifierAmount, composeWithFallback } from "../utilities/utilities-town-focus.js";
import { contribution, fromQuarters, foldByYield, sectionFrom } from "./contributions.js";

// Despite the name, this modifier targets ConstructibleClass=BUILDING — every
// building, not just Temples. Only the great-work slots are Temple-specific.
const MOD_HAPPINESS = "HAPPINESS_ON_TEMPLES_IN_CITY_FROM_PROJECT";
const MOD_RELIC_SLOTS = "SLOTS_ON_TEMPLES_IN_CITY_FROM_PROJECT";
// Game 1.5.0 values, used only if a modifier row can't be read.
const FALLBACK_HAPPINESS = 2;
const FALLBACK_RELIC_SLOTS = 2;

export function buildTempleModel(city) {
  const data = getTownBuildings(city);
  const HAPPINESS_PER_BUILDING = getModifierAmount(MOD_HAPPINESS, "Amount", FALLBACK_HAPPINESS);
  const RELIC_SLOTS_PER_TEMPLE = getModifierAmount(MOD_RELIC_SLOTS, "Amount", FALLBACK_RELIC_SLOTS);

  // A Quarter's count is its building count, since the bonus is per building.
  const perBuilding = (q) => (q.buildings || []).length;
  const H = ETFI_YIELDS.HAPPINESS;
  const quarters = fromQuarters(data.quarters, H, HAPPINESS_PER_BUILDING, "q", perBuilding);
  const unique = fromQuarters(data.uniqueQuarters, H, HAPPINESS_PER_BUILDING, "u", perBuilding);
  const special = fromQuarters(data.specialQuarters, H, HAPPINESS_PER_BUILDING, "s", perBuilding);
  const lone = (data.buildings || []).map((b, i) =>
    contribution(H, HAPPINESS_PER_BUILDING, 1, { key: `b:${i}`, name: b.name, iconId: b.iconId })
  );
  const all = [...quarters, ...unique, ...special, ...lone];

  // The Relic Slots pill shows only when the town actually has a Temple.
  const header = foldByYield(all, [ETFI_YIELDS.HAPPINESS]);
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
