// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters. Building Quarters and Special Quarters (full-tile buildings like a
// Rail Station) are listed in separate categories; each row lists the
// quarter's building(s) with the +1 Science / +1 Culture pills.

import { ETFI_YIELDS, getQuarters, composeWithFallback } from "../../etfi-utilities.js";

const PER_QUARTER = 1;

function quarterRow(q) {
  return {
    items: q.buildings.map((b) => ({ iconId: b.iconId, name: b.name })),
    yields: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: PER_QUARTER },
    ],
  };
}

export function buildUrbanModel(city) {
  const { buildingQuarters, specialQuarters, count } = getQuarters(city);

  const sections = [];
  if (buildingQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_BUILDING_QUARTERS", "Building Quarters"),
      rows: buildingQuarters.map(quarterRow),
    });
  }
  if (specialQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"),
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
