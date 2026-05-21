// Trade (resources → Happiness) details renderer.
// +1 Happiness to each Resource tile and +5 Trade Route range.
// Can purchase additional Gold Buildings. Must be in Distant Lands.

import {
  ETFI_YIELDS,
  renderHeader,
  renderDetailsRow,
  renderIconName,
} from "../../etfi-utilities.js";

export default class TradeDetails {
  render(city) {
    if (!city || !GameplayMap || !GameInfo?.Resources) return null;

    const plots = this.getCityResourceSearchPlots(city);
    if (!plots.length) return null;

    const resourceItems = this.getResourceItemsFromPlots(plots);

    const tradeRange = 5;
    const happinessPerTile = 1;

    const totalResourceTiles = resourceItems.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const totalHappiness = totalResourceTiles * happinessPerTile;

    const labelTotalResources = Locale.compose("LOC_MOD_ETFI_TOTAL_RESOURCES");

    const orderedYields = [ETFI_YIELDS.TRADE, ETFI_YIELDS.HAPPINESS];
    const totals = {
      [ETFI_YIELDS.TRADE]: tradeRange,
      [ETFI_YIELDS.HAPPINESS]: totalHappiness,
    };

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(orderedYields, totals)}
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalResources}</span>
            <span>${totalResourceTiles}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    for (const item of resourceItems) {
      const happinessFromThisResource = item.count * happinessPerTile;

      const leftHtml = renderIconName({
        iconId: item.iconId,
        name: item.name,
        count: item.count,
      });

      html += renderDetailsRow({
        leftHtml,
        yieldIconId: ETFI_YIELDS.HAPPINESS,
        yieldValue: happinessFromThisResource,
      });
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  getCityResourceSearchPlots(city) {
    const cityLocation = city.location;
    if (!cityLocation) return [];

    const plots = [];
    const seenPlotKeys = new Set();

    const addPlot = (plot) => {
      if (!plot || plot.x == null || plot.y == null) return;

      const key = `${plot.x},${plot.y}`;
      if (seenPlotKeys.has(key)) return;

      seenPlotKeys.add(key);
      plots.push(plot);
    };

    addPlot(cityLocation);

    const purchasedPlotIndices =
      typeof city.getPurchasedPlots === "function"
        ? city.getPurchasedPlots()
        : [];

    if (Array.isArray(purchasedPlotIndices)) {
      for (const plotIndex of purchasedPlotIndices) {
        const plotCoords = GameplayMap.getLocationFromIndex(plotIndex);
        addPlot(plotCoords);
      }
    }

    return plots;
  }

  getResourceItemsFromPlots(plots) {
    const resourcesByType = Object.create(null);

    const noResource =
      typeof ResourceTypes !== "undefined"
        ? ResourceTypes.NO_RESOURCE
        : 0;

    for (const plot of plots) {
      const resourceType = GameplayMap.getResourceType(plot.x, plot.y);
      if (resourceType === noResource) continue;

      const resourceInfo = GameInfo.Resources.lookup(resourceType);
      if (!resourceInfo) continue;

      const iconId = resourceInfo.ResourceType;
      const name = Locale.compose(resourceInfo.Name);

      if (!resourcesByType[iconId]) {
        resourcesByType[iconId] = {
          iconId,
          name,
          count: 0,
        };
      }

      resourcesByType[iconId].count += 1;
    }

    return Object.values(resourcesByType);
  }
}