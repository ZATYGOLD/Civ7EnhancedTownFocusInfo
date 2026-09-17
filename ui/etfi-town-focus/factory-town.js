// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/factory-town.js
//
// Author: Zatygold
//
// Factory Town (PROJECT_TOWN_FACTORY, Modern): +1 Resource Slot and +5 Trade
// Route range (pills by the name). Lists the town's Improved (worked) Factory
// Resources for reference; the rows carry no yields of their own. (The +100%
// purchase discount is already in the project description, so it's not repeated
// here.)

import { RESOURCE_ICON, getFactoryResources, tradeRangePill, composeWithFallback } from "../../etfi-utilities.js";
import { contribution, fromGroups, foldByYield, sectionFrom } from "./contributions.js";

const RESOURCE_SLOT = 1;

export function buildFactoryModel(city) {
  const { improved } = getFactoryResources(city);
  // The resource rows are informational — they list the town's Factory Resources
  // but grant no per-row yield, hence a null yield type.
  const contributions = fromGroups(improved, null, 0);
  // Town-wide: the extra Resource Slot. No breakdown row.
  const townContributions = [contribution(RESOURCE_ICON, RESOURCE_SLOT, 1, null)];

  return {
    // The trade-range pill is a static range indicator, not a summed yield.
    header: [...foldByYield(townContributions), tradeRangePill()],
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
