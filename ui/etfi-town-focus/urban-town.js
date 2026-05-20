// Author: Zatygold
// ui/town-focus/urban-town.js

// Urban Center: +1 Science and Culture on Quarters. 
// Can purchase Science and Culture Buildings.

import { ETFI_YIELDS, fmt1, renderHeader, getCompletedBuildings, groupBy, renderIconName } from "../../etfi-utilities.js";

export default class UrbanCenterDetails {
  render(city) {
    if (!city?.Constructibles || !GameInfo?.Yields) {
      return null;
    }

    const completedBuildings = getCompletedBuildings(city);
    if (!completedBuildings.length) return null;

    // +100% towards => 1 - 1 / (1 + 1.0) = 0.5
    const DISCOUNT = 1 - 1 / (1 + 1.0);

    const ORDERED_YIELDS = [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS];

    const buildingsWithMaintenance = [];
    const grandTotals = {
      [ETFI_YIELDS.GOLD]: 0,
      [ETFI_YIELDS.HAPPINESS]: 0,
    };

    for (const building of completedBuildings) {
      if (!building.tileKey) continue;

      const maintenance = city.Constructibles.getMaintenance(building.instance.type) || {};
      const savings = this.getMaintenanceSavings(maintenance, DISCOUNT);

      if (savings.gold <= 0 && savings.happiness <= 0) continue;

      grandTotals[ETFI_YIELDS.GOLD] += savings.gold;
      grandTotals[ETFI_YIELDS.HAPPINESS] += savings.happiness;

      buildingsWithMaintenance.push({
        ...building,
        gold: savings.gold,
        happiness: savings.happiness,
      });
    }

    if (!buildingsWithMaintenance.length) return null;

    buildingsWithMaintenance.sort((a, b) => {
      if (a.tileKey !== b.tileKey) return a.tileKey.localeCompare(b.tileKey);

      const totalA = a.gold + a.happiness;
      const totalB = b.gold + b.happiness;

      return totalB - totalA;
    });

    const labelWithMaintenance =
      Locale.compose("LOC_MOD_ETFI_BUILDINGS_WITH_MAINTENANCE") ||
      "Buildings with Maintenance";

    const headerYieldsHtml = renderHeader(ORDERED_YIELDS, grandTotals);

    return `
      <div class="flex flex-col w-full">
        ${headerYieldsHtml}
        ${this.renderMaintenanceSection(buildingsWithMaintenance, labelWithMaintenance)}
      </div>
    `;
  }

  getMaintenanceSavings(maintenance, discount) {
    let gold = 0;
    let happiness = 0;

    for (const yieldIndex in maintenance) {
      const raw = Number(maintenance[yieldIndex]) || 0;
      if (raw <= 0) continue;

      const yieldInfo = GameInfo.Yields[yieldIndex];
      if (!yieldInfo) continue;

      const yieldType = yieldInfo.YieldType;
      const saved = raw * discount;

      if (yieldType === ETFI_YIELDS.GOLD) {
        gold += saved;
      }

      if (yieldType === ETFI_YIELDS.HAPPINESS) {
        happiness += saved;
      }
    }

    return { gold, happiness };
  }

  renderMaintenanceSection(items, label) {
    const count = items.length;

    return `
      <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
        <div class="flex justify-between mb-1">
          <span>${label}</span>
          <span>${count}</span>
        </div>
        <div class="mt-1 border-t border-white/10"></div>
        ${this.renderRowsByQuarter(items)}
      </div>
    `;
  }

  renderRowsByQuarter(items) {
    const byQuarter = groupBy(items, (item) => item.tileKey);

    let html = "";

    for (const [, quarterBuildings] of byQuarter) {
      const leftHtml = this.renderQuarterBuildingsLeftHtml(quarterBuildings);

      const totalGold = quarterBuildings.reduce(
        (sum, item) => sum + (item.gold || 0),
        0
      );

      const totalHappiness = quarterBuildings.reduce(
        (sum, item) => sum + (item.happiness || 0),
        0
      );

      html += this.renderMaintenanceRow({
        leftHtml,
        gold: totalGold,
        happiness: totalHappiness,
      });
    }

    return html;
  }

  renderQuarterBuildingsLeftHtml(buildings) {
    return buildings
      .map((building) =>
        renderIconName({
          iconId: building.iconId,
          name: building.displayName || Locale.compose(building.nameKey),
        }).trim()
      )
      .join(`<span class="mx-1">•</span>`);
  }

  renderMaintenanceRow({ leftHtml, gold, happiness }) {
    const rightHtml = `
      <span class="inline-flex items-center gap-1">
        <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
        <span class="font-semibold">+${fmt1(gold)}</span>
      </span>
      <span class="inline-flex items-center gap-1 ml-2">
        <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
        <span class="font-semibold">+${fmt1(happiness)}</span>
      </span>
    `;

    return `
      <div class="flex justify-between items-center mt-1">
        <div class="flex items-center gap-2 min-w-0">
          ${leftHtml}
        </div>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          ${rightHtml}
        </div>
      </div>
    `;
  }
}