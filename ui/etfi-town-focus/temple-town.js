// ui/production-chooser/details/temple-town.js

// +2 Happiness on all buildings and +2 Relic Slots on Temples. +25% Gold toward purchasing Temples. 
// Only available during the Exploration Age. 

import { ETFI_YIELDS, renderHeader, renderDetailsRow, getCompletedBuildings, isWallRecord, groupBy, renderIconName } from "../../etfi-utilities.js";

export default class TempleDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city);
    if (!completedBuildings.length) return null;

    const normalBuildings = completedBuildings.filter((record) => !isWallRecord(record));
    const wallBuildings = completedBuildings.filter(isWallRecord);

    const totalBuildings = normalBuildings.length;
    const totalWalls = wallBuildings.length;

    // Keep the old behavior: no completed non-wall buildings means no Temple details.
    if (!totalBuildings) return null;

    const labelTotalBuildings = Locale.compose("LOC_MOD_ETFI_TOTAL_BUILDINGS");
    const labelTotalWalls = Locale.compose("LOC_MOD_ETFI_TOTAL_WALLS");
    const totalHappiness = totalBuildings + totalWalls;

    const buildingsByTile = groupBy(
      normalBuildings.filter((record) => record.tileKey),
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
      const bonus = stack.length;
      const leftHtml = this.renderBuildingStackLeftHtml(stack);
      const rowTextStyle = this.getCompactRowTextStyle(stack);

      html += renderDetailsRow({
        leftHtml,
        yieldIconId: ETFI_YIELDS.HAPPINESS,
        yieldValue: bonus,
        rowTextStyle,
      });
    }

    if (totalWalls > 0) {
      html += `
          <div style="height: 0.7rem;"></div>

          <div class="flex justify-between mb-1">
            <span>${labelTotalWalls}</span>
            <span>${totalWalls}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
      `;

      const wallsByName = groupBy(wallBuildings, (record) => record.nameKey);
      const wallGroups = [...wallsByName.values()];

      const wallsNeedSmallerText = this.shouldUseCompactWallText(wallGroups);
      const wallsRowTextStyle = wallsNeedSmallerText ? "font-size: 0.8em;" : "";

      for (const group of wallGroups) {
        const firstWall = group[0];
        const count = group.length;

        const leftHtml = renderIconName({
          iconId: firstWall.iconId,
          name: firstWall.displayName || Locale.compose(firstWall.nameKey),
          count,
        });

        html += renderDetailsRow({
          leftHtml,
          yieldIconId: ETFI_YIELDS.HAPPINESS,
          yieldValue: count,
          rowTextStyle: wallsRowTextStyle,
        });
      }
    }

    html += `
        </div>
      </div>
    `;

    return html;
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

  getCompactRowTextStyle(stack) {
    const totalNameLength = stack.reduce((sum, record) => {
      const name = record.displayName || Locale.compose(record.nameKey) || "";
      return sum + name.length;
    }, 0);

    const needsSmallerText = stack.length >= 3 || totalNameLength > 40;
    return needsSmallerText ? "font-size: 0.8em;" : "";
  }

  shouldUseCompactWallText(wallGroups) {
    const totalWallNameLength = wallGroups.reduce((sum, group) => {
      const firstWall = group[0];
      const name = firstWall?.displayName || Locale.compose(firstWall?.nameKey) || "";
      return sum + name.length;
    }, 0);

    return wallGroups.length >= 3 || totalWallNameLength > 40;
  }
}