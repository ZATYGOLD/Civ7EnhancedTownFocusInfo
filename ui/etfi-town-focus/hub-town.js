// File Path: ui/etfi-town-focus/hub-town.js

// Hub (Inn) details renderer.
// +1 Influence per Settlement connected to this Town.
// Can purchase Diplomacy Buildings.
// Limited to 1 Hub Town per Continent.
// Only available in Exploration and Modern.

import { ETFI_YIELDS } from "../../etfi-utilities.js";

import {
  renderFocusDetails,
  renderFocusRow,
  renderFocusIconName,
  composeFocusLabel,
} from "./town-focus-html.js";

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

    const bodyHtml = `
      ${this.renderSettlementRow({
        iconId: HUB_ICONS.CITY,
        label: composeFocusLabel("LOC_MOD_ETFI_CONNECTED_CITIES", "Cities"),
        names: connectedSettlements.cities,
      })}

      ${this.renderSettlementRow({
        iconId: HUB_ICONS.TOWN,
        label: composeFocusLabel("LOC_MOD_ETFI_CONNECTED_TOWNS", "Towns"),
        names: connectedSettlements.towns,
      })}
    `;

    return renderFocusDetails({
      headerYields: ETFI_YIELDS.INFLUENCE,
      headerTotals: totalSettlements,
      summaryLabel: composeFocusLabel(
        "LOC_MOD_ETFI_TOTAL_SETTLEMENTS",
        "Total Settlements"
      ),
      summaryValue: totalSettlements,
      bodyHtml,
    });
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

    const rowHtml = renderFocusRow({
      leftHtml: renderFocusIconName({
        iconId,
        name: label,
        count,
        iconSizeClass: "size-4",
      }),
      yieldIconId: ETFI_YIELDS.INFLUENCE,
      yieldValue: count,
    });

    return `
      ${rowHtml}

      <div class="ml-6 opacity-80" style="font-size: 0.8em;">
        ${names.join(" • ")}
      </div>
    `;
  }
}