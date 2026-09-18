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

import { ETFI_YIELDS, getConnectedSettlements, getModifierAmount, composeWithFallback } from "../utilities/etfi-utilities.js";
import { contribution, foldByYield, sectionFrom } from "./contributions.js";

// Modifier id from age-exploration / age-modern data/projects-gameeffects.xml
// (both ages define it identically).
const MOD_INFLUENCE = "ATTACH_INFLUENCE_ON_INNS_IN_CITY_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if the modifier row can't be read.
const FALLBACK_INFLUENCE = 1;
function influencePer() {
  return getModifierAmount(MOD_INFLUENCE, "Amount", FALLBACK_INFLUENCE);
}

const HUB_ICONS = { CITY: "CITY_URBAN", TOWN: "CITY_RURAL" };

// One contribution per settlement kind: `names.length` settlements each earning
// `per` Influence. Hovering the row lists each settlement on its own divided line.
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
