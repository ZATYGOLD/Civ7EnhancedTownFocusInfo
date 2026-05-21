// File Path: ui/etfi-town-focus/temple-town.js

// Religious Site / Temple Town:
// - +2 Happiness on all completed non-wall buildings.
// - +2 Relic Slots on Temples.
// - +25% Gold toward purchasing Temples.
// - Only available during the Exploration Age.

import {
  ETFI_YIELDS,
  getCompletedBuildings,
  isWallRecord,
  groupBy,
} from "../../etfi-utilities.js";

import {
  renderFocusDetails,
  renderFocusRow,
  renderFocusIconName,
  renderFocusRecordList,
  renderFocusSectionHeader,
  getFocusCompactTextStyle,
  composeFocusLabel,
} from "./town-focus-html.js";

const HAPPINESS_PER_BUILDING = 2;
const RELIC_SLOTS_PER_TEMPLE = 2;

export default class TempleDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city).filter(
      (record) => !isWallRecord(record)
    );

    if (!completedBuildings.length) return null;

    const totalBuildings = completedBuildings.length;
    const totalHappiness = totalBuildings * HAPPINESS_PER_BUILDING;

    const templeBuildings = completedBuildings.filter((record) =>
      this.isTempleRecord(record)
    );

    const totalRelicSlots =
      templeBuildings.length * RELIC_SLOTS_PER_TEMPLE;

    const buildingsByTile = groupBy(
      completedBuildings.filter((record) => record.tileKey),
      (record) => record.tileKey
    );

    const buildingStacks = [...buildingsByTile.values()].sort(
      (a, b) => b.length - a.length
    );

    let bodyHtml = buildingStacks
      .map((stack) => {
        const bonus = stack.length * HAPPINESS_PER_BUILDING;

        return renderFocusRow({
          leftHtml: renderFocusRecordList(stack),
          yieldIconId: ETFI_YIELDS.HAPPINESS,
          yieldValue: bonus,
          rowTextStyle: getFocusCompactTextStyle(stack),
        });
      })
      .join("");

    if (templeBuildings.length > 0) {
      bodyHtml += renderFocusSectionHeader({
        label: "Temple Bonus",
        value: templeBuildings.length,
      });

      bodyHtml += this.renderRelicSlotsRow({
        templeBuildings,
        totalRelicSlots,
      });
    }

    return renderFocusDetails({
      headerYields: ETFI_YIELDS.HAPPINESS,
      headerTotals: totalHappiness,
      summaryLabel: composeFocusLabel(
        "LOC_MOD_ETFI_TOTAL_BUILDINGS",
        "Total Buildings"
      ),
      summaryValue: totalBuildings,
      bodyHtml,
    });
  }

  isTempleRecord(record) {
    const typeName = (
      record?.type ||
      record?.info?.ConstructibleType ||
      ""
    )
      .toString()
      .toUpperCase();

    const nameKey = (
      record?.nameKey ||
      record?.info?.Name ||
      ""
    )
      .toString()
      .toUpperCase();

    return typeName.includes("TEMPLE") || nameKey.includes("TEMPLE");
  }

  renderRelicSlotsRow({ templeBuildings, totalRelicSlots }) {
    const firstTemple = templeBuildings[0];

    return renderFocusRow({
      leftHtml: renderFocusIconName({
        iconId: firstTemple?.iconId,
        name: "Relic Slots",
        count: templeBuildings.length,
      }),
      rightHtml: `
        <span class="font-semibold">+${totalRelicSlots}</span>
      `,
    });
  }
}