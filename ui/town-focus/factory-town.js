// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Factory Town (PROJECT_TOWN_FACTORY, Modern): Resource Slot and Trade Route
// range pills. The listed Factory Resources are informational and carry no
// yields. The purchase discount is omitted — the project description has it.

import { RESOURCE_ICON, getFactoryResources, tradeRangePill, getModifierAmount, composeWithFallback } from "../utilities/utilities-town-focus.js";
import { contribution, fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// The trade-range bonus shares its modifiers with Trade Outpost and is read in
// tradeRangePill().
const MOD_RESOURCE_SLOT = "ATTACH_RESOURCE_SLOTS_FROM_PROJECT";
// Game 1.5.0 value, used only if the modifier row can't be read.
const FALLBACK_RESOURCE_SLOT = 1;

export function buildFactoryModel(city) {
  const { improved } = getFactoryResources(city);
  const RESOURCE_SLOT = getModifierAmount(MOD_RESOURCE_SLOT, "Amount", FALLBACK_RESOURCE_SLOT);
  const contributions = fromGroups(improved, null, 0);
  // Town-wide, so `source: null` keeps it out of the breakdown rows.
  const townContributions = [contribution(RESOURCE_ICON, RESOURCE_SLOT, 1, null)];

  return {
    // A static range indicator, not a summed yield, so it is appended not folded.
    header: [...foldByYield(townContributions), tradeRangePill()],
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
