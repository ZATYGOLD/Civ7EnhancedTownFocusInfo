// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/fort-town.js
//
// Author: Zatygold
//
// Fort Town (PROJECT_TOWN_FORT). The game's own wording is precise and the two
// bonuses do NOT cover the same set:
//   "+5 Healing to Units and +25 Health to Fortifications in this Town.
//    +1 Gold on Fortified Districts in this Town."
// So, per base-standard/data/projects-gameeffects.xml:
//   * ATTACH_FORT_HEALTH_FROM_PROJECT  -> +25 Health to every FORTIFICATION.
//   * ATTACH_FORT_WALLS_GOLD_FROM_PROJECT -> +1 Gold only where a District is
//     *fortified*, i.e. it carries a DISTRICT_WALL constructible.
// Only Ancient Walls / Medieval Walls / Defensive Fortifications are tagged
// DISTRICT_WALL. Great Wall, Bailey, Motte, Hillfort, Kasbah, Shore Battery and
// the fortification wonders are FORTIFICATION but NOT DISTRICT_WALL, so they
// earn Health only — no Gold. Hence the two categories:
//   * Walls          - DISTRICT_WALL  -> +1 Gold AND +25 Health,
//   * Fortifications - other FORTIFICATION -> +25 Health only.

import { ETFI_YIELDS, HEAL_ICON, FORTIFY_ICON, getFortifications, composeWithFallback } from "../../etfi-utilities.js";

const GOLD_PER = 1;
const HEALTH_PER = 25;
const UNIT_HEALING = 5;

// One row per fortification type, scaled by how many of that type exist.
// `withGold` is true only for DISTRICT_WALL types (fortified Districts).
function fortRow(g, withGold) {
  const yields = [];
  if (withGold) yields.push({ yieldType: ETFI_YIELDS.GOLD, value: g.count * GOLD_PER });
  yields.push({ yieldType: FORTIFY_ICON, value: g.count * HEALTH_PER });
  return {
    iconId: g.iconId,
    name: g.name,
    count: g.count,
    yields,
  };
}

export function buildFortModel(city) {
  const { walls, fortifications, total } = getFortifications(city);

  // Only walls fortify a District, so only they contribute Gold.
  const fortifiedDistricts = walls.reduce((s, g) => s + g.count, 0);

  const sections = [];
  if (walls.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_WALLS", "Walls"),
      rows: walls.map((g) => fortRow(g, true)),
    });
  }
  if (fortifications.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_FORTIFICATIONS", "Fortifications"),
      separatePanel: "bottom",
      rows: fortifications.map((g) => fortRow(g, false)),
    });
  }

  return {
    header: [
      { yieldType: ETFI_YIELDS.GOLD, value: fortifiedDistricts * GOLD_PER },
      { yieldType: FORTIFY_ICON, value: total * HEALTH_PER },
      { yieldType: HEAL_ICON, value: UNIT_HEALING },
    ],
    rows: [],
    sections,
    notes: [],
  };
}
