// Author: Zatygold
// File Path: ui/etfi-town-focus/urban-town.js

// Urban Center:
// +1 Science and +1 Culture on Quarters.
// Can purchase Science and Culture Buildings.
//
// A normal Quarter is a tile with 2 or more completed non-wall buildings.
// Some special single-building districts/quarters, like Rail Station, count as
// a Quarter by themselves. Those should be added to the special set below.

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

const SPECIAL_QUARTER_BUILDING_TYPES = new Set([
  "BUILDING_RAIL_STATION",
  "BUILDING_RAILYARD",
  "BUILDING_LAUNCH_PAD",
  "BUILDING_AIRFIELD"

  // Add confirmed special single-building Quarter constructible types here.
  // Example:
  // "BUILDING_SOME_SPECIAL_QUARTER",
]);

const SPECIAL_QUARTER_BUILDING_NAME_KEYS = new Set([
  "LOC_BUILDING_RAIL_STATION_NAME",

  // Add confirmed special single-building Quarter name keys here if needed.
  // Example:
  // "LOC_BUILDING_SOME_SPECIAL_QUARTER_NAME",
]);

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
      .filter((stack) => this.isQuarterStack(stack))
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
          rowTextStyle: compactTextStyle,
          leftStyle: `
            max-width: 74%;
            white-space: nowrap;
            column-gap: 0.125rem;
          `,
          leftClass: "flex items-center min-w-0",
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

  isQuarterStack(stack) {
    if (!Array.isArray(stack) || stack.length === 0) {
      return false;
    }

    if (stack.length >= 2) {
      return true;
    }

    return this.isSpecialQuarterBuilding(stack[0]);
  }

  isSpecialQuarterBuilding(record) {
    const typeName = this.getRecordTypeName(record);
    const nameKey = this.getRecordNameKey(record);

    return (
      SPECIAL_QUARTER_BUILDING_TYPES.has(typeName) ||
      SPECIAL_QUARTER_BUILDING_NAME_KEYS.has(nameKey)
    );
  }

  getRecordTypeName(record) {
    return (
      record?.type ||
      record?.info?.ConstructibleType ||
      ""
    )
      .toString()
      .toUpperCase();
  }

  getRecordNameKey(record) {
    return (
      record?.nameKey ||
      record?.info?.Name ||
      ""
    )
      .toString()
      .toUpperCase();
  }
}