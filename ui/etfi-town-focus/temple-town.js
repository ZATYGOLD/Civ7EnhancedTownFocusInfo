// ui/production-chooser/details/temple-town.js

// Religious Site / Temple Town:
// - +2 Happiness on all completed buildings.
// - +2 Relic Slots on Temples.
// - +25% Gold toward purchasing Temples.
// - Only available during the Exploration Age.

import {
  ETFI_YIELDS,
  renderHeader,
  renderDetailsRow,
  getCompletedBuildings,
  groupBy,
  renderIconName,
} from "../../etfi-utilities.js";

const HAPPINESS_PER_BUILDING = 2;
const RELIC_SLOTS_PER_TEMPLE = 2;
const TEMPLE_PURCHASE_GOLD_BONUS_PERCENT = 25;

export default class TempleDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city);
    if (!completedBuildings.length) return null;

    const totalBuildings = completedBuildings.length;
    const totalHappiness = totalBuildings * HAPPINESS_PER_BUILDING;

    const templeBuildings = completedBuildings.filter((record) =>
      this.isTempleRecord(record)
    );

    const totalRelicSlots =
      templeBuildings.length * RELIC_SLOTS_PER_TEMPLE;

    const labelTotalBuildings = Locale.compose("LOC_MOD_ETFI_TOTAL_BUILDINGS");
    const labelTempleBonus = "Temple Bonus";
    const labelRelicSlots = "Relic Slots";
    const labelTemplePurchaseBonus = "Temple Purchase Bonus";

    const buildingsByTile = groupBy(
      completedBuildings.filter((record) => record.tileKey),
      (record) => record.tileKey
    );

    const buildingStacks = [...buildingsByTile.values()].sort(
      (a, b) => b.length - a.length
    );

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(ETFI_YIELDS.HAPPINESS, totalHappiness)}

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalBuildings}</span>
            <span>${totalBuildings}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    for (const stack of buildingStacks) {
      const bonus = stack.length * HAPPINESS_PER_BUILDING;
      const leftHtml = this.renderBuildingStackLeftHtml(stack);
      const rowTextStyle = this.getCompactRowTextStyle(stack);

      html += renderDetailsRow({
        leftHtml,
        yieldIconId: ETFI_YIELDS.HAPPINESS,
        yieldValue: bonus,
        rowTextStyle,
      });
    }

    if (templeBuildings.length > 0) {
      html += `
          <div style="height: 0.7rem;"></div>

          <div class="flex justify-between mb-1">
            <span>${labelTempleBonus}</span>
            <span>${templeBuildings.length}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
      `;

      html += this.renderRelicSlotsRow({
        templeBuildings,
        labelRelicSlots,
        totalRelicSlots,
      });
    }

    //html += this.renderTemplePurchaseBonusRow(labelTemplePurchaseBonus);

    html += `
        </div>
      </div>
    `;

    return html;
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

  renderBuildingStackLeftHtml(stack) {
    const bullet = "•";

    return stack
      .map((record) =>
        renderIconName({
          iconId: record.iconId,
          name: record.displayName || Locale.compose(record.nameKey),
        }).trim()
      )
      .join(`<span class="mx-1">${bullet}</span>`);
  }

  renderRelicSlotsRow({ templeBuildings, labelRelicSlots, totalRelicSlots }) {
    const firstTemple = templeBuildings[0];

    const leftHtml = renderIconName({
      iconId: firstTemple?.iconId,
      name: labelRelicSlots,
      count: templeBuildings.length,
    });

    return `
      <div class="flex justify-between items-center mt-1">
        <div class="flex items-center gap-2 min-w-0">
          ${leftHtml}
        </div>

        <div class="flex items-center gap-1">
          <span class="font-semibold">+${totalRelicSlots}</span>
        </div>
      </div>
    `;
  }

  renderTemplePurchaseBonusRow(labelTemplePurchaseBonus) {
    return `
      <div class="flex justify-between items-center mt-1">
        <div class="flex items-center gap-2">
          <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-5"></fxs-icon>
          <span class="opacity-60">| </span>
          <span>${labelTemplePurchaseBonus}</span>
        </div>

        <div class="flex items-center gap-1">
          <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
          <span class="font-semibold">+${TEMPLE_PURCHASE_GOLD_BONUS_PERCENT}%</span>
        </div>
      </div>
    `;
  }

  getCompactRowTextStyle(stack) {
    const totalNameLength = stack.reduce((sum, record) => {
      const name = record.displayName || Locale.compose(record.nameKey) || "";
      return sum + name.length;
    }, 0);

    const needsSmallerText = stack.length >= 3 || totalNameLength > 40;
    return needsSmallerText ? "font-size: 0.8em;" : "";
  }
}