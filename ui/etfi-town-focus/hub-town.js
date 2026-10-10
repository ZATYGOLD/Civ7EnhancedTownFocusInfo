// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Hub Town (PROJECT_TOWN_INN): Influence per connected Settlement. Only
// connected settlements are listed; there is no Disconnected category.

import { ETFI_YIELDS, getConnectedSettlements, getModifierAmount, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, foldByYield, sectionFrom } from "./contributions.js";

// Exploration and Modern define this modifier identically, so either resolves.
const MOD_INFLUENCE = "ATTACH_INFLUENCE_ON_INNS_IN_CITY_FROM_PROJECT";
// Game 1.5.0 value, used only if the modifier row can't be read.
const FALLBACK_INFLUENCE = 1;
function influencePer() {
  return getModifierAmount(MOD_INFLUENCE, "Amount", FALLBACK_INFLUENCE);
}

const HUB_ICONS = { CITY: "CITY_URBAN", TOWN: "CITY_RURAL" };

// One contribution per settlement kind; the tipModel lists the names on hover.
function settlementContribution(iconId, label, names, per) {
  const source = { name: label, iconId, count: names.length };
  if (names.length) {
    source.tipModel = { sections: [{ rows: names.map((n) => ({ iconId, name: n })) }] };
  }
  return contribution(ETFI_YIELDS.INFLUENCE, per, names.length, source);
}

export function buildHubModel(city) {
  const connected = getConnectedSettlements(city);
  const per = influencePer();

  const contributions = [
    settlementContribution(HUB_ICONS.CITY, composeWithFallback("LOC_MOD_ETFI_CONNECTED_CITIES", "Cities"), connected.cities, per),
    settlementContribution(HUB_ICONS.TOWN, composeWithFallback("LOC_MOD_ETFI_CONNECTED_TOWNS", "Towns"), connected.towns, per),
  ];

  return {
    header: foldByYield(contributions),
    rows: [],
    sections: sectionFrom(composeWithFallback("LOC_MOD_ETFI_CONNECTED", "Connected"), contributions),
    notes: [],
  };
}
