// File Path: ui/etfi-town-focus/hub-town.js
//
// Author: Zatygold
//
// Hub Town (PROJECT_TOWN_INN): +1 Influence per Settlement connected to this
// Town. Two categories, each in its own panel:
//   * Connected     - settlements this Town is connected to (earn the Influence),
//   * Disconnected  - the player's other settlements (hidden by default).
// Each lists Cities and Towns with their totals; hovering "Cities" / "Towns"
// reveals the settlement names.

import { ETFI_YIELDS, getSettlementsByConnection, composeWithFallback } from "../../etfi-utilities.js";

const INFLUENCE_PER = 1;
const HUB_ICONS = { CITY: "CITY_URBAN", TOWN: "CITY_RURAL" };

function settlementRows(group, withYields) {
  const mkRow = (iconId, label, names) => {
    const row = { iconId, name: label, count: names.length };
    if (withYields) {
      row.yields = [{ yieldType: ETFI_YIELDS.INFLUENCE, value: names.length * INFLUENCE_PER }];
    }
    // Hover lists each settlement on its own divided line: [icon] │ name.
    if (names.length) {
      row.tipModel = { sections: [{ rows: names.map((n) => ({ iconId, name: n })) }] };
    }
    return row;
  };
  return [
    mkRow(HUB_ICONS.CITY, composeWithFallback("LOC_MOD_ETFI_CONNECTED_CITIES", "Cities"), group.cities),
    mkRow(HUB_ICONS.TOWN, composeWithFallback("LOC_MOD_ETFI_CONNECTED_TOWNS", "Towns"), group.towns),
  ];
}

export function buildHubModel(city) {
  const { connected } = getSettlementsByConnection(city);
  const total = (connected.cities.length + connected.towns.length) * INFLUENCE_PER;

  // Only the Connected settlements are shown; the Disconnected category is
  // intentionally not rendered.
  const sections = [{
    title: composeWithFallback("LOC_MOD_ETFI_CONNECTED", "Connected"),
    rows: settlementRows(connected, true),
  }];

  return {
    header: [{ yieldType: ETFI_YIELDS.INFLUENCE, value: total }],
    rows: [],
    sections,
    notes: [],
  };
}
