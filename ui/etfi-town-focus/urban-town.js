// Author: Zatygold
// File Path: ui/etfi-town-focus/urban-town.js

// Urban Center:
// +1 Science and +1 Culture on Quarters.
// Can purchase Science and Culture Buildings.
//
// Current assumption:
// A Quarter is a tile with 2 or more completed non-wall buildings.

import {
  ETFI_YIELDS,
  getCompletedBuildings,
  isWallRecord,
  groupBy,
} from "../../etfi-utilities.js";

import {
  renderFocusDetails,
  renderFocusRow,
  renderFocusRecordList,
  getFocusCompactTextStyle,
  composeFocusLabel,
} from "./town-focus-html.js";

const SCIENCE_PER_QUARTER = 1;
const CULTURE_PER_QUARTER = 1;

export default class UrbanCenterDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city).filter(
      (building) => !isWallRecord(building)
    );

    if (!completedBuildings.length) return null;

    const buildingsByTile = groupBy(
      completedBuildings.filter((building) => building.tileKey),
      (building) => building.tileKey
    );

    const quarterStacks = [...buildingsByTile.values()]
      .filter((stack) => stack.length >= 2)
      .sort((a, b) => b.length - a.length);

    if (!quarterStacks.length) return null;

    const totalQuarters = quarterStacks.length;

    const orderedYields = [
      ETFI_YIELDS.SCIENCE,
      ETFI_YIELDS.CULTURE,
    ];

    const totals = {
      [ETFI_YIELDS.SCIENCE]: totalQuarters * SCIENCE_PER_QUARTER,
      [ETFI_YIELDS.CULTURE]: totalQuarters * CULTURE_PER_QUARTER,
    };

    const bodyHtml = quarterStacks
      .map((stack) => {
        const compactTextStyle = getFocusCompactTextStyle(stack);

        return renderFocusRow({
          leftHtml: renderFocusRecordList(stack),
          yields: [
            {
              iconId: ETFI_YIELDS.SCIENCE,
              value: SCIENCE_PER_QUARTER,
            },
            {
              iconId: ETFI_YIELDS.CULTURE,
              value: CULTURE_PER_QUARTER,
            },
          ],
          rowTextStyle: `
            flex: 1 1 auto;
            max-width: 74%;
            overflow: hidden;
            white-space: nowrap;
            column-gap: 0.125rem;
            ${compactTextStyle}
          `,
          leftClass: "flex items-center min-w-0",
          rightClass: "flex items-center justify-end text-right shrink-0 gap-1",
        });
      })
      .join("");

    return renderFocusDetails({
      headerYields: orderedYields,
      headerTotals: totals,
      summaryLabel: composeFocusLabel(
        "LOC_MOD_ETFI_BUILDING_QUARTERS",
        "Quarters"
      ),
      summaryValue: totalQuarters,
      bodyHtml,
    });
  }
}