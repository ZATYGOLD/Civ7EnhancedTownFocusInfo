// File Path: etfi-utilities.js
//
// Author: Zatygold
//
// ETFI API. Live, read-only queries against the current town, used by the
// per-focus model builders. No rendering here. Uses only confirmed engine APIs.

import { ConstructibleHasTagType } from "/base-standard/ui/utilities/utilities-tags.js";
import { getGlobalParamNumber } from "/core/ui/utilities/utilities-data.js";

export const ETFI_YIELDS = Object.freeze({
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  GOLD: "YIELD_GOLD",
  HAPPINESS: "YIELD_HAPPINESS",
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE",
  INFLUENCE: "YIELD_DIPLOMACY",
});

// Non-yield icon ids.
export const TRADE_ROUTE_ICON = "TRADE_ROUTE";
export const HEAL_ICON = "ACTION_HEAL";
export const FORTIFY_ICON = "ACTION_FORTIFY";
export const TOURISM_ICON = "CULTURE_VP";
export const RESOURCE_ICON = "RADIAL_RESOURCES";
export const RELIC_ICON = "NAR_REW_GREATWORK";

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

export function getTownCity() {
  try {
    const id = UI.Player?.getHeadSelectedCity?.();
    return id ? Cities.get(id) : null;
  } catch {
    return null;
  }
}

function isWallType(type) {
  try {
    return ConstructibleHasTagType(type, "DISTRICT_WALL") || ConstructibleHasTagType(type, "FORTIFICATION");
  } catch {
    return false;
  }
}

function isFullTileType(type) {
  try {
    return ConstructibleHasTagType(type, "FULL_TILE");
  } catch {
    return false;
  }
}

function buildImprovementTileMap(city) {
  const map = new Map();
  try {
    const ids = city?.Constructibles?.getIdsOfClass?.("IMPROVEMENT") || [];
    for (const id of ids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const loc = inst.location;
      if (!loc || loc.x == null || loc.y == null) continue;
      const def = GameInfo.Constructibles.lookup(inst.type);
      if (!def) continue;
      map.set(`${loc.x},${loc.y}`, {
        type: def.ConstructibleType,
        name: def.Name ? Locale.compose(def.Name) : def.ConstructibleType,
        iconId: def.ConstructibleType,
      });
    }
  } catch (e) {
    console.error("[ETFI] buildImprovementTileMap failed", e);
  }
  return map;
}

// --- improvement counting (Farming / Fishing / Mining) ---------------------

export function countImprovements(city, typeSet) {
  const byName = new Map();
  let total = 0;
  try {
    const ids = city?.Constructibles?.getIdsOfClass?.("IMPROVEMENT") || [];
    for (const id of ids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const location = inst.location;
      if (!location || location.x == null || location.y == null) continue;

      let logicalType = null;
      try {
        const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
        logicalType = GameInfo.Constructibles.lookup(fcID)?.ConstructibleType ?? null;
      } catch {
        logicalType = null;
      }

      const info = GameInfo.Constructibles.lookup(inst.type);
      const actualType = info?.ConstructibleType ?? null;

      const matches =
        (logicalType && typeSet.has(logicalType)) ||
        (actualType && typeSet.has(actualType));
      if (!matches) continue;

      const name = info?.Name ? Locale.compose(info.Name) : (actualType || logicalType);
      const iconId = actualType || logicalType;
      if (!byName.has(name)) byName.set(name, { name, iconId, count: 0 });
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

// --- building helpers (Religious Site) -------------------------------------

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

// --- fortifications (Fort) -------------------------------------------------

export function getFortifications(city) {
  const out = [];
  try {
    for (const cls of ["BUILDING", "IMPROVEMENT"]) {
      const ids = city?.Constructibles?.getIdsOfClass?.(cls) || [];
      for (const id of ids) {
        const inst = Constructibles.get(id);
        if (!inst || !inst.complete) continue;
        const def = GameInfo.Constructibles.lookup(inst.type);
        if (!def) continue;
        if (ConstructibleHasTagType(def.ConstructibleType, "FORTIFICATION")) {
          out.push({ type: def.ConstructibleType, name: def.Name ? Locale.compose(def.Name) : def.ConstructibleType, iconId: def.ConstructibleType });
        }
      }
    }
  } catch (e) {
    console.error("[ETFI] getFortifications failed", e);
  }
  return out;
}

// --- quarters (Urban Center) -----------------------------------------------
//
// A Quarter = an urban tile with two non-Wall ageless/current-age buildings, OR
// a single FULL_TILE building. Returns { count, quarters: [{ buildings:
// [{name, iconId}] }] } so each quarter can be listed on its own line.
export function getQuarters(city) {
  const quarters = [];
  try {
    const centerKey = city?.location ? `${city.location.x},${city.location.y}` : null;
    const perTile = new Map();
    const ids = city?.Constructibles?.getIdsOfClass?.("BUILDING") || [];
    for (const id of ids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const loc = inst.location;
      if (!loc || loc.x == null || loc.y == null) continue;
      const def = GameInfo.Constructibles.lookup(inst.type);
      if (!def) continue;
      const key = `${loc.x},${loc.y}`;
      if (!perTile.has(key)) perTile.set(key, []);
      perTile.get(key).push({ type: def.ConstructibleType, name: def.Name ? Locale.compose(def.Name) : def.ConstructibleType, iconId: def.ConstructibleType });
    }
    for (const [key, blds] of perTile) {
      if (key === centerKey) continue;
      const hasFullTile = blds.some((b) => isFullTileType(b.type));
      const qualifying = blds.filter((b) => !isWallType(b.type) && isCurrentOrAgeless(b.type));
      if (!(hasFullTile || qualifying.length >= 2)) continue;
      const display = blds.filter((b) => !isWallType(b.type) && (isFullTileType(b.type) || isCurrentOrAgeless(b.type)));
      quarters.push({ buildings: display.map((b) => ({ name: b.name, iconId: b.iconId })) });
    }
  } catch (e) {
    console.error("[ETFI] getQuarters failed", e);
  }
  return { count: quarters.length, quarters };
}

// --- factory resources (Factory) -------------------------------------------

export function getFactoryResources(city) {
  const improved = new Map();
  const unimproved = new Map();
  try {
    const impMap = buildImprovementTileMap(city);
    const indices = city?.getPurchasedPlots?.() || [];
    for (const idx of indices) {
      let loc;
      try { loc = GameplayMap.getLocationFromIndex(idx); } catch { continue; }
      if (!loc) continue;
      let rInfo;
      try { rInfo = GameInfo?.Resources?.lookup?.(GameplayMap.getResourceType(loc.x, loc.y)); } catch { rInfo = null; }
      if (!rInfo || rInfo.ResourceClassType !== "RESOURCECLASS_FACTORY") continue;
      const name = rInfo.Name ? Locale.compose(rInfo.Name) : rInfo.ResourceType;
      const target = impMap.has(`${loc.x},${loc.y}`) ? improved : unimproved;
      if (!target.has(name)) target.set(name, { name, iconId: rInfo.ResourceType, count: 0 });
      target.get(name).count++;
    }
  } catch (e) {
    console.error("[ETFI] getFactoryResources failed", e);
  }
  return {
    improved: Array.from(improved.values()).sort((a, b) => b.count - a.count),
    unimproved: Array.from(unimproved.values()).sort((a, b) => b.count - a.count),
  };
}

// --- resort tiles (Resort) -------------------------------------------------
//
// Appealing tiles (appeal >= charming, non-water, non-wonder) grouped by their
// improvement (+ an unimproved count), natural wonders, and the count of
// IMPROVED breathtaking tiles (for the tourism rule).
export function getResortData(city) {
  const result = {
    appealingImproved: [],
    appealingUnimprovedCount: 0,
    appealingTotal: 0,
    naturalWonders: 0,
    breathtakingImprovedCount: 0,
  };
  const byName = new Map();
  let charming = 1;
  let breathtaking = 2;
  try {
    charming = getGlobalParamNumber("APPEAL_FOR_HAPPINESS_TILE_YIELD");
    breathtaking = getGlobalParamNumber("APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD");
  } catch {}
  try {
    const impMap = buildImprovementTileMap(city);
    const indices = city?.getPurchasedPlots?.() || [];
    for (const idx of indices) {
      let loc;
      try { loc = GameplayMap.getLocationFromIndex(idx); } catch { continue; }
      if (!loc) continue;
      const { x, y } = loc;
      let isNW = false;
      try { isNW = !!GameplayMap.isNaturalWonder(x, y); } catch {}
      if (isNW) { result.naturalWonders++; continue; }
      let water = false;
      try { water = !!GameplayMap.isWater(x, y); } catch {}
      if (water) continue;
      let appeal = 0;
      try { appeal = GameplayMap.getAppeal(x, y); } catch {}
      if (appeal < charming) continue;
      result.appealingTotal++;
      const imp = impMap.get(`${x},${y}`);
      if (imp) {
        if (!byName.has(imp.name)) byName.set(imp.name, { name: imp.name, iconId: imp.iconId, count: 0 });
        byName.get(imp.name).count++;
        if (appeal >= breathtaking) result.breathtakingImprovedCount++;
      } else {
        result.appealingUnimprovedCount++;
      }
    }
  } catch (e) {
    console.error("[ETFI] getResortData failed", e);
  }
  result.appealingImproved = Array.from(byName.values()).sort((a, b) => b.count - a.count);
  return result;
}
