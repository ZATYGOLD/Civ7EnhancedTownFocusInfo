// File Path: ui/etfi-town-focus/temple-town.js
//
// Author: Zatygold
//
// Religious Site (PROJECT_TOWN_TEMPLE, Exploration Age only):
//   * +2 Happiness on all qualifying Buildings in this Town,
//   * +2 Relic Slots on Temples in this Town.
// Eligibility matches Urban Center (ageless / current-age / warehouse / unique /
// full-tile, never Walls). Buildings are listed in the same categories as Urban
// Center (via the shared quarterSections helper): Quarters, Unique Quarters,
// Special Quarters, and Buildings (lone) - each building earns +2 Happiness.
// Unlike Urban Center, lone Buildings still earn the bonus, so that category is
// NOT hidden. Header pills: total Happiness and a +2 Relic Slots pill (relic icon).

import { ETFI_YIELDS, RELIC_ICON, getTownBuildings, countTemples, quarterSections } from "../../etfi-utilities.js";

const HAPPINESS_PER_BUILDING = 2;
const RELIC_SLOTS_PER_TEMPLE = 2;

export function buildTempleModel(city) {
  const data = getTownBuildings(city);
  const happiness = data.buildingCount * HAPPINESS_PER_BUILDING;
  const relicSlots = countTemples(city) * RELIC_SLOTS_PER_TEMPLE;

  // Header pills next to the focus name: total Happiness, plus the Relic Slots
  // pill ONLY when the town actually has a Temple (or unique temple).
  const header = [{ yieldType: ETFI_YIELDS.HAPPINESS, value: happiness }];
  if (relicSlots > 0) {
    header.push({ yieldType: RELIC_ICON, value: relicSlots, colored: false });
  }

  return {
    header,
    rows: [],
    sections: quarterSections(data, {
      // Every qualifying building earns +2 Happiness; a Quarter's pill sums its
      // buildings, and lone Buildings earn the bonus too (so NOT hidden).
      quarterYields: (q) => [{ yieldType: ETFI_YIELDS.HAPPINESS, value: q.buildings.length * HAPPINESS_PER_BUILDING }],
      buildingYields: () => [{ yieldType: ETFI_YIELDS.HAPPINESS, value: HAPPINESS_PER_BUILDING }],
    }),
    notes: [],
  };
}
