// File Path: ui/etfi-town-focus/trade-town.js

// Trade (resources → Happiness) details renderer.
// +1 Happiness to each Resource tile and +5 Trade Route range.
// Can purchase additional Gold Buildings. Must be in Distant Lands.

import { ETFI_YIELDS } from "../../etfi-utilities.js";

import { renderFocusDetails, renderFocusRow, renderFocusIconName, composeFocusLabel, } from "./town-focus-html.js";

const TRADE_RANGE = 5;
const HAPPINESS_PER_RESOURCE_TILE = 1;

export default class TradeDetails {
  render(city) {
    if (!city || !GameplayMap || !GameInfo?.Resources) return null;

    const plots = this.getCityResourceSearchPlots(city);
    if (!plots.length) return null;

    const resourceItems = this.getResourceItemsFromPlots(plots);

    const totalResourceTiles = resourceItems.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const totalHappiness =
      totalResourceTiles * HAPPINESS_PER_RESOURCE_TILE;

    const orderedYields = [
      ETFI_YIELDS.TRADE,
      ETFI_YIELDS.HAPPINESS,
    ];

    const totals = {
      [ETFI_YIELDS.TRADE]: TRADE_RANGE,
      [ETFI_YIELDS.HAPPINESS]: totalHappiness,
    };

    const bodyHtml = resourceItems
      .map((item) => {
        const happinessFromThisResource =
          item.count * HAPPINESS_PER_RESOURCE_TILE;

        return renderFocusRow({
          leftHtml: renderFocusIconName({
            iconId: item.iconId,
            name: item.name,
            count: item.count,
          }),
          yieldIconId: ETFI_YIELDS.HAPPINESS,
          yieldValue: happinessFromThisResource,
        });
      })
      .join("");

    return renderFocusDetails({
      headerYields: orderedYields,
      headerTotals: totals,
      summaryLabel: composeFocusLabel(
        "LOC_MOD_ETFI_TOTAL_RESOURCES",
        "Total Resources"
      ),
      summaryValue: totalResourceTiles,
      bodyHtml,
    });
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