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

import { RESOURCE_ICON, getFactoryResources, tradeRangePill, getModifierAmount, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// Modifier id from age-modern/data/projects-gameeffects.xml. The trade-range
// bonus shares its modifiers with Trade Outpost and is read in tradeRangePill().
const MOD_RESOURCE_SLOT = "ATTACH_RESOURCE_SLOTS_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if the modifier row can't be read.
const FALLBACK_RESOURCE_SLOT = 1;

export function buildFactoryModel(city) {
  const { improved } = getFactoryResources(city);
  const RESOURCE_SLOT = getModifierAmount(MOD_RESOURCE_SLOT, "Amount", FALLBACK_RESOURCE_SLOT);
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
