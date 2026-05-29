// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters. One row per Quarter, listing the buildings in that quarter, with
// the +1 Science / +1 Culture pills on the right.

import { ETFI_YIELDS, getQuarters } from "../../etfi-utilities.js";

const PER_QUARTER = 1;

export function buildUrbanModel(city) {
  const { count, quarters } = getQuarters(city);
  const rows = quarters.map((q) => ({
    items: q.buildings.map((b) => ({ iconId: b.iconId, name: b.name })),
    yields: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: PER_QUARTER },
    ],
  }));
  return {
    header: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: count * PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: count * PER_QUARTER },
    ],
    rows,
    notes: [],
  };
}
