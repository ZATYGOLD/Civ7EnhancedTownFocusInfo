// File Path: etfi-utilities.js
//
// Author: Zatygold
//
// ETFI API. Live, read-only queries against the current town, used by the
// per-focus model builders. No rendering here. Uses only confirmed engine APIs.

import { ConstructibleHasTagType } from "/base-standard/ui/utilities/utilities-tags.js";

// Canonical yield ids + the trade-route icon used for the Trade focus range pill.
export const ETFI_YIELDS = Object.freeze({
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  GOLD: "YIELD_GOLD",
  HAPPINESS: "YIELD_HAPPINESS",
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE",
  INFLUENCE: "YIELD_DIPLOMACY",
});
export const TRADE_ROUTE_ICON = "TRADE_ROUTE";

// --- small helpers ---------------------------------------------------------

export function composeWithFallback(key, fallback) {
  if (!key) return fallback || "";
  try {
    const v = Locale.compose(key);
    return v && v !== key ? v : fallback || v || key;
  } catch {
    return fallback || key;
  }
}

export function constructibleName(type) {
  try {
    const info = GameInfo?.Constructibles?.lookup?.(type);
    return info?.Name ? Locale.compose(info.Name) : type;
  } catch {
    return type;
  }
}

export function getCurrentAgeType() {
  try {
    return (GameInfo?.Ages?.lookup?.(Game.age)?.AgeType || "").trim();
  } catch {
    return "";
  }
}

/** The town being configured (the head-selected city). */
export function getTownCity() {
  try {
    const id = UI.Player?.getHeadSelectedCity?.();
    return id ? Cities.get(id) : null;
  } catch {
    return null;
  }
}

// --- improvement counting (Farming / Fishing / Mining) ---------------------
//
// Counts COMPLETED improvements whose ConstructibleType is in `typeSet`,
// grouped by localized name. Returns { groups: [{name, iconId, count}], total }.
export function countImprovements(city, typeSet) {
  const byName = new Map();
  let total = 0;
  try {
    const ids = city?.Constructibles?.getIdsOfClass?.("IMPROVEMENT") || [];
    for (const id of ids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const info = GameInfo.Constructibles.lookup(inst.type);
      if (!info || !typeSet.has(info.ConstructibleType)) continue;
      const name = info.Name ? Locale.compose(info.Name) : info.ConstructibleType;
      if (!byName.has(name)) byName.set(name, { name, iconId: info.ConstructibleType, count: 0 });
      byName.get(name).count += 1;
      total += 1;
    }
  } catch (e) {
    console.error("[ETFI] countImprovements failed", e);
  }
  const groups = Array.from(byName.values()).sort((a, b) => b.count - a.count);
  return { groups, total };
}

// --- resource tile counting (Trade) ----------------------------------------
//
// Counts the town's resource tiles, grouped by resource type.
export function countResourceTiles(city) {
  const byName = new Map();
  let total = 0;
  let indices = [];
  try {
    indices = city?.getPurchasedPlots?.() || [];
  } catch {
    indices = [];
  }
  for (const idx of indices) {
    let loc;
    try {
      loc = GameplayMap.getLocationFromIndex(idx);
    } catch {
      continue;
    }
    if (!loc) continue;
    let info;
    try {
      info = GameInfo?.Resources?.lookup?.(GameplayMap.getResourceType(loc.x, loc.y));
    } catch {
      info = null;
    }
    if (!info) continue;
    const name = info.Name ? Locale.compose(info.Name) : info.ResourceType;
    if (!byName.has(name)) byName.set(name, { name, iconId: info.ResourceType, count: 0 });
    byName.get(name).count += 1;
    total += 1;
  }
  const groups = Array.from(byName.values()).sort((a, b) => b.count - a.count);
  return { groups, total };
}

// --- connected settlements (Hub) -------------------------------------------

export function getConnectedSettlements(city) {
  const result = { cities: [], towns: [] };
  let ids = [];
  try {
    ids = city?.getConnectedCities?.() || [];
  } catch (e) {
    console.error("[ETFI] getConnectedCities failed", e);
    return result;
  }
  for (const id of ids) {
    const s = Cities.get(id);
    if (!s) continue;
    const name = Locale.compose(s.name);
    if (s.isTown) result.towns.push(name);
    else result.cities.push(name);
  }
  return result;
}

// --- building helpers (for later building-based focuses) -------------------

/** True if a constructible should be counted now: ageless OR current age. */
export function isCurrentOrAgeless(type) {
  try {
    if (ConstructibleHasTagType(type, "AGELESS")) return true;
    const def = GameInfo?.Constructibles?.lookup?.(type);
    if (!def) return false;
    const age = GameInfo?.Ages?.lookup?.(Game.age);
    return !!age && def.Age === age.AgeType;
  } catch {
    return false;
  }
}

/** Completed BUILDING records (ageless + current age only). */
export function getCountableBuildings(city) {
  const out = [];
  try {
    const ids = city?.Constructibles?.getIdsOfClass?.("BUILDING") || [];
    for (const id of ids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const def = GameInfo.Constructibles.lookup(inst.type);
      if (!def || def.ConstructibleClass !== "BUILDING") continue;
      if (!isCurrentOrAgeless(def.ConstructibleType)) continue;
      out.push({ type: def.ConstructibleType, name: def.Name ? Locale.compose(def.Name) : def.ConstructibleType, iconId: def.ConstructibleType });
    }
  } catch (e) {
    console.error("[ETFI] getCountableBuildings failed", e);
  }
  return out;
}
