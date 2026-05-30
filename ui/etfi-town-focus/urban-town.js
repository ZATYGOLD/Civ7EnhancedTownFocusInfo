// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters. Categories, each in its own panel:
//   * Quarters         - tiles with 2+ qualifying buildings (the bonus unit),
//   * Unique Quarters  - civ-specific quarters (e.g. Acropolis),
//   * Special Quarters - full-tile buildings (Rail Station, Launch Pad, ...),
//   * Buildings (hidden) - lone qualifying buildings that are NOT a Quarter yet
//     (no bonus, hidden by default since Urban Center only rewards Quarters).
// Each quarter row lists its building(s) with the +1 Science / +1 Culture pills.

import { ETFI_YIELDS, getTownBuildings, composeWithFallback } from "../../etfi-utilities.js";

const PER_QUARTER = 1;

function quarterRow(q) {
  const row = {
    items: q.buildings.map((b) => ({ iconId: b.iconId, name: b.name })),
    yields: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: PER_QUARTER },
    ],
  };
  if (q.name) row.subText = q.name;
  return row;
}

export function buildUrbanModel(city) {
  const { quarters, uniqueQuarters, specialQuarters, buildings, quarterCount } = getTownBuildings(city);

  const sections = [];
  if (quarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_QUARTERS", "Quarters"),
      separatePanel: true,
      rows: quarters.map(quarterRow),
    });
  }
  if (uniqueQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIQUE_QUARTERS", "Unique Quarters"),
      separatePanel: true,
      rows: uniqueQuarters.map(quarterRow),
    });
  }
  if (specialQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"),
      separatePanel: true,
      rows: specialQuarters.map(quarterRow),
    });
  }
  if (buildings.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_BUILDINGS", "Buildings"),
      separatePanel: "bottom",
      hidden: true,
      rows: buildings.map((b) => ({ iconId: b.iconId, name: b.name })),
    });
  }

  return {
    header: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: quarterCount * PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: quarterCount * PER_QUARTER },
    ],
    rows: [],
    sections,
    notes: [],
  };
}
