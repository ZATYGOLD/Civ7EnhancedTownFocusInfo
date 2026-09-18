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

import { ETFI_YIELDS, countResourceTiles, tradeRangePill, warehouseAmountResolver, composeWithFallback } from "../utilities/etfi-utilities.js";
import { fromGroups, foldByYield, sectionFrom } from "./contributions.js";

// The Happiness half is a "warehouse" bonus (see getWarehouseAmounts). Its one
// row matches any resource tile rather than a specific improvement, so every
// row resolves to the same amount. The +5 range comes from the two trade-range
// modifiers and is read inside tradeRangePill().
const MOD_TRADE_HAPPINESS = "ATTACH_HAPPINESS_WAREHOUSE_IN_CITY_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if the game data can't be read.
const FALLBACK_HAPPINESS = 1;

// Cached only once the game data actually resolved (see farm-fish-towns.js).
let cachedHappiness = null;
function happinessAmount() {
  if (cachedHappiness) return cachedHappiness;
  const r = warehouseAmountResolver(MOD_TRADE_HAPPINESS, ETFI_YIELDS.HAPPINESS, FALLBACK_HAPPINESS);
  if (r.resolved) cachedHappiness = r;
  return r;
}

export function buildTradeModel(city) {
  const { improved } = countResourceTiles(city);
  const happiness = happinessAmount();
  // One contribution list; the header and the rows are both folds over it.
  const contributions = fromGroups(improved, ETFI_YIELDS.HAPPINESS, (g) => happiness.amountFor(g.type));

  return {
    // The trade-range pill is a static range indicator, not a summed yield, so
    // it is appended rather than folded.
    header: [...foldByYield(contributions), tradeRangePill()],
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"), contributions),
    notes: [],
  };
}
