// File Path: ui/etfi-town-focus/fort-town.js
//
// Author: Zatygold
//
// Fort Town (PROJECT_TOWN_FORT): +5 Healing to Units, +1 Gold per fortified
// district, +25 Health per fortification. Fortifications are split into two
// categories, grouped by type with a count:
//   * Walls          - DISTRICT_WALL fortifications (Ancient/Medieval Walls, ...),
//   * Fortifications - all other FORTIFICATION-tagged (Bailey, Great Wall, ...).
// Each row earns +1 Gold / +25 Health per instance. Header shows the totals
// (Gold, Health, Healing).

import { ETFI_YIELDS, HEAL_ICON, FORTIFY_ICON, getFortifications, composeWithFallback } from "../../etfi-utilities.js";

const GOLD_PER = 1;
const HEALTH_PER = 25;
const UNIT_HEALING = 5;

// One row per fortification type, scaled by how many of that type exist.
function fortRow(g) {
  return {
    iconId: g.iconId,
    name: g.name,
    count: g.count,
    yields: [
      { yieldType: ETFI_YIELDS.GOLD, value: g.count * GOLD_PER },
      { yieldType: FORTIFY_ICON, value: g.count * HEALTH_PER },
    ],
  };
}

export function buildFortModel(city) {
  const { walls, fortifications, total } = getFortifications(city);

  const sections = [];
  if (walls.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_WALLS", "Walls"),
      rows: walls.map(fortRow),
    });
  }
  if (fortifications.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_FORTIFICATIONS", "Fortifications"),
      separatePanel: "bottom",
      rows: fortifications.map(fortRow),
    });
  }

  return {
    header: [
      { yieldType: ETFI_YIELDS.GOLD, value: total * GOLD_PER },
      { yieldType: FORTIFY_ICON, value: total * HEALTH_PER },
      { yieldType: HEAL_ICON, value: UNIT_HEALING },
    ],
    rows: [],
    sections,
    notes: [],
  };
}
