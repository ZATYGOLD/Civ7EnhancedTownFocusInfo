// File Path: ui/etfi-town-focus/hub-town.js

// Hub (Inn) details renderer.
// +1 Influence per Settlement connected to this Town.
// Can purchase Diplomacy Buildings.
// Limited to 1 Hub Town per Continent.
// Only available in Exploration and Modern.

import {
  ETFI_YIELDS,
  renderHeader,
  renderDetailsRow,
  renderIconName,
} from "../../etfi-utilities.js";

const HUB_ICONS = Object.freeze({
  CITY: "CITY_URBAN",
  TOWN: "CITY_RURAL",
});

export default class HubDetails {
  render(city) {
    if (
      !city ||
      typeof Cities === "undefined" ||
      typeof city.getConnectedCities !== "function"
    ) {
      return null;
    }

    const connectedSettlements = this.getConnectedSettlements(city);

    const totalSettlements =
      connectedSettlements.cities.length + connectedSettlements.towns.length;

    if (totalSettlements === 0) return null;

    const labelCities = Locale.compose("LOC_MOD_ETFI_CONNECTED_CITIES");
    const labelTowns = Locale.compose("LOC_MOD_ETFI_CONNECTED_TOWNS");

    const labelTotalSettlements =
      Locale.compose("LOC_MOD_ETFI_TOTAL_SETTLEMENTS") ||
      Locale.compose("LOC_MOD_ETFI_TOTAL_CONNECTIONS") ||
      "Total Settlements";

    return `
      <div class="flex flex-col w-full">
        ${renderHeader(ETFI_YIELDS.INFLUENCE, totalSettlements)}

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalSettlements}</span>
            <span>${totalSettlements}</span>
          </div>

          <div class="mt-1 border-t border-white/10"></div>

          ${this.renderSettlementRow({
            iconId: HUB_ICONS.CITY,
            label: labelCities,
            names: connectedSettlements.cities,
          })}

          ${this.renderSettlementRow({
            iconId: HUB_ICONS.TOWN,
            label: labelTowns,
            names: connectedSettlements.towns,
          })}
        </div>
      </div>
    `;
  }

  getConnectedSettlements(city) {
    const result = {
      cities: [],
      towns: [],
    };

    const connectedIds = city.getConnectedCities() || [];

    for (const id of connectedIds) {
      const settlement = Cities.get(id);
      if (!settlement) continue;

      const name = Locale.compose(settlement.name);

      if (settlement.isTown) {
        result.towns.push(name);
      } else {
        result.cities.push(name);
      }
    }

    return result;
  }

  renderSettlementRow({ iconId, label, names }) {
    const count = names.length;

    if (count <= 0) return "";

    const leftHtml = renderIconName({
      iconId,
      name: label,
      count,
      iconSizeClass: "size-4",
    });

    return `
      ${renderDetailsRow({
        leftHtml,
        yieldIconId: ETFI_YIELDS.INFLUENCE,
        yieldValue: count,
      })}

      <div class="ml-6 opacity-80" style="font-size: 0.8em;">
        ${names.join(" • ")}
      </div>
    `;
  }
}