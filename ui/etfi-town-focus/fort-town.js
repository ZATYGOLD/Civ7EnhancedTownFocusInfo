// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/fort-town.js
//
// Author: Zatygold
//
// Fort Town (PROJECT_TOWN_FORT). The game's own wording is precise and the two
// yield bonuses do NOT cover the same set:
//   "+5 Healing to Units and +25 Health to Fortifications in this Town.
//    +1 Gold on Fortified Districts in this Town."
// We follow that wording: Gold goes only to *Fortified Districts*, which we take
// to mean a District carrying a DISTRICT_WALL constructible. Only Ancient Walls,
// Medieval Walls and Defensive Fortifications are tagged DISTRICT_WALL; Great
// Wall, Bailey, Motte, Hillfort, Kasbah, Shore Battery and the fortification
// wonders are FORTIFICATION but NOT DISTRICT_WALL, so they earn Health only.
// Hence the two categories:
//   * Walls          - DISTRICT_WALL  -> Gold AND Health,
//   * Fortifications - other FORTIFICATION -> Health only.
//
// CAVEAT — the raw modifier data does NOT encode that distinction. In
// base-standard/data/projects-gameeffects.xml both effects carry the SAME
// requirement (REQUIREMENT_PLOT_HAS_CONSTRUCTIBLE, Tag=FORTIFICATION):
//   * ATTACH_FORT_HEALING_FROM_PROJECT    -> +5 Healing to units (town-wide)
//   * ATTACH_FORT_HEALTH_FROM_PROJECT     -> +25 Health  (COLLECTION_CITY_DISTRICTS)
//   * ATTACH_FORT_WALLS_GOLD_FROM_PROJECT -> +1 Gold     (COLLECTION_CITY_PLOT_YIELDS)
// The word DISTRICT_WALL never appears there. So either the collection only
// resolves to districts in practice (making the description accurate), or the
// description is loose and every fortification really does earn Gold. This
// implementation matches the player-facing description and an in-game report
// that Great Walls gain nothing from a Fort Town; if that ever proves wrong,
// the fix is to drop the walls/fortifications split for Gold — not to edit
// this comment.
//
// This focus is the reference implementation for the contribution model: the
// amounts come from GameInfo (not hardcoded) and the header is folded from the
// SAME contribution list that produces the breakdown rows, so the header total
// is always the sum of the rows. See ./contributions.js.

import { ETFI_YIELDS, HEAL_ICON, FORTIFY_ICON, getFortifications, getModifierAmount, composeWithFallback } from "../../etfi-utilities.js";
import { contribution, foldByYield, sectionFrom } from "./contributions.js";

// Modifier ids from base-standard/data/projects-gameeffects.xml.
const MOD_GOLD = "ATTACH_FORT_WALLS_GOLD_FROM_PROJECT";
const MOD_HEALTH = "ATTACH_FORT_HEALTH_FROM_PROJECT";
const MOD_HEALING = "ATTACH_FORT_HEALING_FROM_PROJECT";
// Last-known-good values (game 1.5.0), used only if a modifier row can't be
// read. Verified in-game: the live values come from GameInfo, not from these.
const FALLBACK_GOLD = 1;
const FALLBACK_HEALTH = 25;
const FALLBACK_HEALING = 5;

// Read lazily: GameInfo is static, but it isn't necessarily populated at
// module-load time. Only CACHE once every lookup actually came from GameInfo —
// caching a fallback would freeze the last-known-good numbers for the whole
// session and defeat the point of reading the data at all.
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
  const { walls, fortifications } = getFortifications(city);
  const amounts = fortAmounts();

  // Fortified Districts: Gold AND Health.
  const wallContributions = [];
  for (const g of walls) {
    const source = { name: g.name, iconId: g.iconId, count: g.count };
    wallContributions.push(contribution(ETFI_YIELDS.GOLD, amounts.gold, g.count, source));
    wallContributions.push(contribution(FORTIFY_ICON, amounts.health, g.count, source));
  }
  // Other fortifications: Health only — no Gold.
  const fortContributions = [];
  for (const g of fortifications) {
    const source = { name: g.name, iconId: g.iconId, count: g.count };
    fortContributions.push(contribution(FORTIFY_ICON, amounts.health, g.count, source));
  }
  // Town-wide, so no breakdown row: flat Healing to units in this town.
  const townContributions = [contribution(HEAL_ICON, amounts.healing, 1, null)];

  const sections = [
    ...sectionFrom(composeWithFallback("LOC_MOD_ETFI_WALLS", "Walls"), wallContributions),
    ...sectionFrom(
      composeWithFallback("LOC_MOD_ETFI_FORTIFICATIONS", "Fortifications"),
      fortContributions,
      { separatePanel: "bottom" }
    ),
  ];

  return {
    // Same list that produced the rows above, plus the town-wide bonus.
    header: foldByYield([...wallContributions, ...fortContributions, ...townContributions]),
    rows: [],
    sections,
    notes: [],
  };
}
