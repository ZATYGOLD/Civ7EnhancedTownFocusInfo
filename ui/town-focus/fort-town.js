// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Fort Town (PROJECT_TOWN_FORT).
//
// The description — "+25 Health to Fortifications ... +1 Gold on Fortified
// Districts" — implies Gold covers a narrower set than Health. It does not: all
// three modifiers require Tag=FORTIFICATION and DISTRICT_WALL appears nowhere in
// the data. 2.5.0 split the display on that wording and was wrong; VERIFIED IN
// GAME (2.5.3) that Great Walls do earn the Gold. Do not split on DISTRICT_WALL
// again, and test in game before acting on a report that says otherwise.

import { ETFI_YIELDS, HEAL_ICON, FORTIFY_ICON, getFortifications, getModifierAmount, composeWithFallback } from "../utilities/utilities-town-focus.js";
import { contribution, foldByYield, sectionFrom } from "./contributions.js";

const MOD_GOLD = "ATTACH_FORT_WALLS_GOLD_FROM_PROJECT";
const MOD_HEALTH = "ATTACH_FORT_HEALTH_FROM_PROJECT";
const MOD_HEALING = "ATTACH_FORT_HEALING_FROM_PROJECT";
// Game 1.5.0 values, used only if GameInfo can't be read.
const FALLBACK_GOLD = 1;
const FALLBACK_HEALTH = 25;
const FALLBACK_HEALING = 5;

// Cache only once every lookup resolved — caching a fallback would freeze it for
// the session and defeat reading the data at all.
let cachedAmounts = null;
function fortAmounts() {
  if (cachedAmounts) return cachedAmounts;
  const MISSING = Number.NaN;
  const gold = getModifierAmount(MOD_GOLD, "Amount", MISSING);
  const health = getModifierAmount(MOD_HEALTH, "Amount", MISSING);
  const healing = getModifierAmount(MOD_HEALING, "Amount", MISSING);
  const resolved = [gold, health, healing].every((n) => Number.isFinite(n));
  const amounts = {
    gold: Number.isFinite(gold) ? gold : FALLBACK_GOLD,
    health: Number.isFinite(health) ? health : FALLBACK_HEALTH,
    healing: Number.isFinite(healing) ? healing : FALLBACK_HEALING,
  };
  if (resolved) cachedAmounts = amounts;
  return amounts;
}

export function buildFortModel(city) {
  const fortifications = getFortifications(city);
  const amounts = fortAmounts();

  const fortContributions = [];
  for (const g of fortifications) {
    const source = { name: g.name, iconId: g.iconId, count: g.count };
    fortContributions.push(contribution(ETFI_YIELDS.GOLD, amounts.gold, g.count, source));
    fortContributions.push(contribution(FORTIFY_ICON, amounts.health, g.count, source));
  }
  // Town-wide, so `source: null` keeps it out of the breakdown rows.
  const townContributions = [contribution(HEAL_ICON, amounts.healing, 1, null)];

  return {
    header: foldByYield([...fortContributions, ...townContributions]),
    rows: [],
    sections: sectionFrom(
      composeWithFallback("LOC_MOD_ETFI_FORTIFICATIONS", "Fortifications"),
      fortContributions,
    ),
    notes: [],
  };
}
