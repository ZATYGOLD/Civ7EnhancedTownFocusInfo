// Author: Zatygold
// ui/town-focus/urban-town.js

// Urban Center:
// +1 Science and +1 Culture on Quarters.
// Can purchase Science and Culture Buildings.
//
// Current assumption:
// A Quarter is a tile with 2 or more completed buildings.

import {
  ETFI_YIELDS,
  renderHeader,
  renderDetailsRow,
  getCompletedBuildings,
  isWallRecord,
  groupBy,
  renderIconName,
} from "../../etfi-utilities.js";

const SCIENCE_PER_QUARTER = 1;
const CULTURE_PER_QUARTER = 1;

export default class UrbanCenterDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city).filter((building) => !isWallRecord(building));
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

    const labelTotalQuarters =
      Locale.compose("LOC_MOD_ETFI_BUILDING_QUARTERS") ||
      "Quarters";

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(orderedYields, totals)}

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalQuarters}</span>
            <span>${totalQuarters}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    for (const stack of quarterStacks) {
      const leftHtml = this.renderQuarterStackLeftHtml(stack);
      const rowTextStyle = this.getCompactRowTextStyle(stack);

      html += this.renderScienceCultureRow({
        leftHtml,
        scienceValue: SCIENCE_PER_QUARTER,
        cultureValue: CULTURE_PER_QUARTER,
        rowTextStyle,
      });
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  renderQuarterStackLeftHtml(stack) {
    return stack
      .map((building, index) => {
        const separator =
          index > 0
            ? `<span class="mx-0\\.5 opacity-70 shrink-0">•</span>`
            : "";
  
        const name = building.displayName || Locale.compose(building.nameKey);
  
        return `
          ${separator}
          <span
            class="inline-flex items-center min-w-0"
            style="flex: 0 1 auto; overflow: hidden; column-gap: 0.125rem;"
          >
            <fxs-icon data-icon-id="${building.iconId}" class="size-4 shrink-0"></fxs-icon>
            <span class="opacity-60 shrink-0">|</span>
            <span
              style="
                min-width: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
            >
              ${name}
            </span>
          </span>
        `;
      })
      .join("");
  }

  renderScienceCultureRow({
    leftHtml,
    scienceValue,
    cultureValue,
    rowTextStyle = "",
  }) {
    const styleAttr = rowTextStyle ? `${rowTextStyle}` : "";
  
    return `
      <div class="flex justify-between items-center mt-1 w-full">
        <div
          class="flex items-center min-w-0"
          style="
            flex: 1 1 auto;
            max-width: 74%;
            overflow: hidden;
            white-space: nowrap;
            column-gap: 0.125rem;
            ${styleAttr}
          "
        >
          ${leftHtml}
        </div>
  
        <div
          class="flex items-center justify-end text-right shrink-0"
          style="flex: 0 0 auto; margin-left: 0.35rem; column-gap: 0.25rem;"
        >
          <span class="inline-flex items-center gap-1">
            <fxs-icon data-icon-id="${ETFI_YIELDS.SCIENCE}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${scienceValue}</span>
          </span>
  
          <span class="inline-flex items-center gap-1">
            <fxs-icon data-icon-id="${ETFI_YIELDS.CULTURE}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${cultureValue}</span>
          </span>
        </div>
      </div>
    `;
  }

  getCompactRowTextStyle(stack) {
    const totalNameLength = stack.reduce((sum, building) => {
      const name =
        building.displayName ||
        Locale.compose(building.nameKey) ||
        "";

      return sum + name.length;
    }, 0);

    const needsSmallerText = stack.length >= 3 || totalNameLength > 40;
    return needsSmallerText ? "font-size: 0.8em;" : "";
  }
}