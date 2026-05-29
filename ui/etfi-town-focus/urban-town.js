// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters. Quarters are split into three categories, each in its own panel:
//   * Unique Quarters  - civ-specific quarters (e.g. Acropolis),
//   * Building Quarters - any urban tile with two ageless/current-age buildings,
//   * Special Quarters  - full-tile buildings (Rail Station, Launch Pad, ...).
// Each row lists the quarter's building(s) with the +1 Science / +1 Culture pills.

import { ETFI_YIELDS, getQuarters, composeWithFallback } from "../../etfi-utilities.js";

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
  const { uniqueQuarters, buildingQuarters, specialQuarters, count } = getQuarters(city);

  const sections = [];
  if (uniqueQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIQUE_QUARTERS", "Unique Quarters"),
      separatePanel: true,
      rows: uniqueQuarters.map(quarterRow),
    });
  }
  if (buildingQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_BUILDING_QUARTERS", "Building Quarters"),
      separatePanel: true,
      rows: buildingQuarters.map(quarterRow),
    });
  }
  if (specialQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"),
      separatePanel: true,
      rows: specialQuarters.map(quarterRow),
    });
  }

  return {
    header: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: count * PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: count * PER_QUARTER },
    ],
    rows: [],
    sections,
    notes: [],
  };
}
