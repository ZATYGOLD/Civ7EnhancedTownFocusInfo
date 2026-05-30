// File Path: ui/etfi-town-focus/temple-town.js
//
// Author: Zatygold
//
// Religious Site (PROJECT_TOWN_TEMPLE, Exploration Age only):
//   * +2 Happiness on all qualifying Buildings in this Town,
//   * +2 Relic Slots on Temples in this Town.
// Eligibility matches Urban Center (ageless / current-age / warehouse / unique /
// full-tile, never Walls). Buildings are listed in the same categories as Urban
// Center: Quarters, Unique Quarters, Special Quarters, and Buildings (lone) -
// each building shown with its +2 Happiness pill. Unlike Urban Center, lone
// Buildings still earn the bonus here, so that category is NOT hidden. Header
// pills: total Happiness and a +2 Relic Slots pill (relic icon).

import { ETFI_YIELDS, RELIC_ICON, getTownBuildings, countTemples, composeWithFallback } from "../../etfi-utilities.js";

const HAPPINESS_PER_BUILDING = 2;
const RELIC_SLOTS_PER_TEMPLE = 2;

// One row per lone building, each earning +2 Happiness.
function loneBuildingRows(buildingList) {
  return buildingList.map((b) => ({
    iconId: b.iconId,
    name: b.name,
    yields: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: HAPPINESS_PER_BUILDING }],
  }));
}

// One row per quarter: all its buildings on the same line, with a single
// Happiness pill summing +2 per building in that quarter.
function quarterRows(quarterList) {
  return quarterList.map((q) => {
    const row = {
      items: q.buildings.map((b) => ({ iconId: b.iconId, name: b.name })),
      yields: [{ yieldType: ETFI_YIELDS.HAPPINESS, value: q.buildings.length * HAPPINESS_PER_BUILDING }],
    };
    if (q.name) row.subText = q.name;
    return row;
  });
}

export function buildTempleModel(city) {
  const { quarters, uniqueQuarters, specialQuarters, buildings, buildingCount } = getTownBuildings(city);
  const happiness = buildingCount * HAPPINESS_PER_BUILDING;

  const templeCount = countTemples(city);

  const sections = [];
  if (quarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_QUARTERS", "Quarters"),
      separatePanel: true,
      rows: quarterRows(quarters),
    });
  }
  if (uniqueQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIQUE_QUARTERS", "Unique Quarters"),
      separatePanel: true,
      rows: quarterRows(uniqueQuarters),
    });
  }
  if (specialQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"),
      separatePanel: true,
      rows: quarterRows(specialQuarters),
    });
  }
  if (buildings.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_BUILDINGS", "Buildings"),
      separatePanel: "bottom",
      rows: loneBuildingRows(buildings),
    });
  }

  // Header pills next to the focus name: total Happiness, plus the Relic Slots
  // pill ONLY when the town actually has a Temple (or unique temple). The value
  // reflects the real total: +2 Relic Slots per temple building.
  const relicSlots = templeCount * RELIC_SLOTS_PER_TEMPLE;
  const header = [{ yieldType: ETFI_YIELDS.HAPPINESS, value: happiness }];
  if (relicSlots > 0) {
    header.push({ yieldType: RELIC_ICON, value: relicSlots, colored: false });
  }

  const notes = [];

  return {
    header,
    rows: [],
    sections,
    notes,
  };
}
