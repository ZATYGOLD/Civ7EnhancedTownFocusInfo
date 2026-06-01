// File Path: ui/etfi-town-focus/focus-models.js
//
// Author: Zatygold
//
// Shared dispatch mapping a Town Focus ProjectType to its preview model. Used by
// both the inline focus list (etfi-town-focus-section.js) and the focus hover
// tooltip (town-focus-tooltip.js) so the focus math lives in one place.

import { buildFoodModel } from "./farm-fish-towns.js";
import { buildMiningModel } from "./mining-town.js";
import { buildTradeModel } from "./trade-town.js";
import { buildHubModel } from "./hub-town.js";
import { buildTempleModel } from "./temple-town.js";
import { buildUrbanModel } from "./urban-town.js";
import { buildFortModel } from "./fort-town.js";
import { buildResortModel } from "./resort-town.js";
import { buildFactoryModel } from "./factory-town.js";

// Build a focus's preview model from its ProjectType string. Returns null for
// the Growing Town / unknown focuses.
export function buildFocusModel(city, projectType) {
  if (!city) return null;
  switch (projectType) {
    case "PROJECT_TOWN_GRANARY":
    case "PROJECT_TOWN_FISHING":
      return buildFoodModel(city);
    case "PROJECT_TOWN_PRODUCTION":
      return buildMiningModel(city);
    case "PROJECT_TOWN_TRADE":
      return buildTradeModel(city);
    case "PROJECT_TOWN_INN":
      return buildHubModel(city);
    case "PROJECT_TOWN_TEMPLE":
      return buildTempleModel(city);
    case "PROJECT_TOWN_URBAN_CENTER":
      return buildUrbanModel(city);
    case "PROJECT_TOWN_FORT":
      return buildFortModel(city);
    case "PROJECT_TOWN_RESORT":
      return buildResortModel(city);
    case "PROJECT_TOWN_FACTORY":
      return buildFactoryModel(city);
    default:
      return null;
  }
}

// Sum a model header's yields of a given type — the focus's unrealized preview
// for that yield (0 when the focus grants none).
export function focusHeaderYield(model, yieldType) {
  let sum = 0;
  for (const y of model?.header || []) {
    if (y && y.yieldType === yieldType && typeof y.value === "number") sum += y.value;
  }
  return sum;
}
