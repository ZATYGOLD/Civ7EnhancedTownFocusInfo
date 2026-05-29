// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters in the town. A Quarter = an urban tile with two non-Wall buildings
// (ageless and/or current Age) or a single full-tile building. Lists the
// buildings that make up the quarters.

import { ETFI_YIELDS, getQuarters, composeWithFallback } from "../../etfi-utilities.js";

const PER_QUARTER = 1;

export function buildUrbanModel(city) {
  const { count, buildings } = getQuarters(city);
  const rows = buildings.map((b) => ({ iconId: b.iconId, name: b.name, count: b.count }));
  return {
    header: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: count * PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: count * PER_QUARTER },
    ],
    sections: rows.length
      ? [{ title: composeWithFallback("LOC_MOD_ETFI_BUILDING_QUARTERS", "Quarters"), rows }]
      : [],
    rows: [],
    notes: [],
  };
}
