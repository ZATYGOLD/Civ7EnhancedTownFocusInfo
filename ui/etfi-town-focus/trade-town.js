// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/trade-town.js
//
// Author: Zatygold
//
// Trade Outpost (PROJECT_TOWN_TRADE): +1 Happiness per Resource tile in the
// town, plus +5 Trade Route range (shown as a pill next to the focus name).
// Only the Improved (worked) Resource tiles are listed — they are the ones that
// earn the Happiness.

import { ETFI_YIELDS, countResourceTiles, tradeRangePill, composeWithFallback } from "../utilities/etfi-utilities.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

const HAPPINESS_PER_RESOURCE = 1;

export function buildTradeModel(city) {
  const { improved } = countResourceTiles(city);
  // One contribution list; the header and the rows are both folds over it.
  const contributions = fromGroups(improved, ETFI_YIELDS.HAPPINESS, HAPPINESS_PER_RESOURCE);

  return {
    // The trade-range pill is a static range indicator, not a summed yield, so
    // it is appended rather than folded.
    header: [...foldByYield(contributions), tradeRangePill()],
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
