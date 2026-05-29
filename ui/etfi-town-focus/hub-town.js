// File Path: ui/etfi-town-focus/hub-town.js
//
// Author: Zatygold
//
// Hub Town (PROJECT_TOWN_INN): +1 Influence per Settlement connected to this
// Town. A single "Settlements" category lists connected Cities and Towns with
// their totals; hovering "Cities" / "Towns" reveals the settlement names.

import { ETFI_YIELDS, getConnectedSettlements, composeWithFallback } from "../../etfi-utilities.js";

const INFLUENCE_PER = 1;
const HUB_ICONS = { CITY: "CITY_URBAN", TOWN: "CITY_RURAL" };

export function buildHubModel(city) {
  const { cities, towns } = getConnectedSettlements(city);
  const total = (cities.length + towns.length) * INFLUENCE_PER;

  const mkRow = (iconId, label, names) => {
    const row = {
      iconId,
      name: label,
      count: names.length,
      yields: [{ yieldType: ETFI_YIELDS.INFLUENCE, value: names.length * INFLUENCE_PER }],
    };
    if (names.length) row.tooltip = names.join("[N]");
    return row;
  };

  return {
    header: [{ yieldType: ETFI_YIELDS.INFLUENCE, value: total }],
    rows: [],
    sections: [{
      title: composeWithFallback("LOC_MOD_ETFI_SETTLEMENTS", "Settlements"),
      rows: [
        mkRow(HUB_ICONS.CITY, composeWithFallback("LOC_MOD_ETFI_CONNECTED_CITIES", "Cities"), cities),
        mkRow(HUB_ICONS.TOWN, composeWithFallback("LOC_MOD_ETFI_CONNECTED_TOWNS", "Towns"), towns),
      ],
    }],
    notes: [],
  };
}
