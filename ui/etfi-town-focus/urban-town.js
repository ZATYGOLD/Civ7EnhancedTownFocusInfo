// File Path: ui/etfi-town-focus/urban-town.js
//
// Author: Zatygold
//
// Urban Center (PROJECT_TOWN_URBAN_CENTER): +1 Science and +1 Culture on
// Quarters. Categories (via the shared quarterSections helper), each in its own
// panel:
//   * Quarters         - tiles with 2+ qualifying buildings (the bonus unit),
//   * Unique Quarters  - civ-specific quarters (e.g. Acropolis),
//   * Special Quarters - full-tile buildings (Rail Station, Launch Pad, ...),
//   * Buildings (hidden) - lone qualifying buildings that are NOT a Quarter yet
//     (no bonus, hidden by default since Urban Center only rewards Quarters).
// Each quarter row lists its building(s) with the +1 Science / +1 Culture pills.

import { ETFI_YIELDS, getTownBuildings, quarterSections } from "../../etfi-utilities.js";

const PER_QUARTER = 1;

export function buildUrbanModel(city) {
  const data = getTownBuildings(city);

  return {
    header: [
      { yieldType: ETFI_YIELDS.SCIENCE, value: data.quarterCount * PER_QUARTER },
      { yieldType: ETFI_YIELDS.CULTURE, value: data.quarterCount * PER_QUARTER },
    ],
    rows: [],
    sections: quarterSections(data, {
      // Each Quarter earns +1 Science / +1 Culture (fixed per quarter).
      quarterYields: () => [
        { yieldType: ETFI_YIELDS.SCIENCE, value: PER_QUARTER },
        { yieldType: ETFI_YIELDS.CULTURE, value: PER_QUARTER },
      ],
      // Lone Buildings aren't Quarters yet, so they earn nothing and are hidden.
      hideBuildings: true,
    }),
    notes: [],
  };
}
