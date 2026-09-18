// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-town-focus/hub-town.js
//
// Author: Zatygold
//
// Hub Town (PROJECT_TOWN_INN): +1 Influence per Settlement connected to this
// Town. Two categories, each in its own panel:
//   * Connected     - settlements this Town is connected to (earn the Influence),
// (Only Connected is rendered; there is no Disconnected category.)
// Each lists Cities and Towns with their totals; hovering "Cities" / "Towns"
// reveals the settlement names.

import { ETFI_YIELDS, getConnectedSettlements, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, foldByYield, sectionFrom } from "./contributions.js";

const INFLUENCE_PER = 1;
const HUB_ICONS = { CITY: "CITY_URBAN", TOWN: "CITY_RURAL" };

// One contribution per settlement kind: `names.length` settlements each earning
// INFLUENCE_PER. Hovering the row lists each settlement on its own divided line.
function settlementContribution(iconId, label, names) {
  const source = { name: label, iconId, count: names.length };
  if (names.length) {
    source.tipModel = { sections: [{ rows: names.map((n) => ({ iconId, name: n })) }] };
  }
  return contribution(ETFI_YIELDS.INFLUENCE, INFLUENCE_PER, names.length, source);
}

export function buildHubModel(city) {
  const connected = getConnectedSettlements(city);

  const contributions = [
    settlementContribution(HUB_ICONS.CITY, composeWithFallback("LOC_MOD_ETFI_CONNECTED_CITIES", "Cities"), connected.cities),
    settlementContribution(HUB_ICONS.TOWN, composeWithFallback("LOC_MOD_ETFI_CONNECTED_TOWNS", "Towns"), connected.towns),
  ];

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_CONNECTED", "Connected"), contributions),
    notes: [],
  };
}
