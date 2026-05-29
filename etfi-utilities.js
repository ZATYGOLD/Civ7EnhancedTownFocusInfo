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

export const TRADE_ROUTE_ICON = "TRADE_ROUTE";
export const HEAL_ICON = "ACTION_HEAL";
export const FORTIFY_ICON = "ACTION_FORTIFY";
export const TOURISM_ICON = "CULTURE_VP";
export const RESOURCE_ICON = "RADIAL_RESOURCES";
export const RELIC_ICON = "NAR_REW_GREATWORK";
export const CITY_ICON = "CITY_URBAN";

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

function resourceAt(x, y) {
  try {
    return GameInfo?.Resources?.lookup?.(GameplayMap.getResourceType(x, y)) ?? null;
  } catch {
    return null;
  }
}

// --- improvement focuses (Farming / Fishing / Mining) ----------------------
//
// For the town's tiles whose (logical) improvement is in `typeSet`, split into
// IMPROVED (a completed improvement -> earns the yield) and UNIMPROVED (an
// eligible tile not yet improved -> no yield). Display uses the RESOURCE
// name/icon when the tile has one (e.g. "Tea"), otherwise the improvement
// name/icon (e.g. "Woodcutter"). Unimproved includes eligible NON-resource
// tiles (e.g. a forest eligible for a Woodcutter), not just resources.
export function getFocusImprovements(city, typeSet) {
  const impMap = buildImprovementTileMap(city);
  const improved = new Map();
  const unimproved = new Map();
  let indices = [];
  try { indices = city?.getPurchasedPlots?.() || []; } catch { indices = []; }

  for (const idx of indices) {
    let loc;
    try { loc = GameplayMap.getLocationFromIndex(idx); } catch { continue; }
    if (!loc) continue;
    const { x, y } = loc;
    const key = `${x},${y}`;

    let logicalType = null;
    try {
      logicalType = GameInfo.Constructibles.lookup(Districts.getFreeConstructible(loc, GameContext.localPlayerID))?.ConstructibleType ?? null;
    } catch {
      logicalType = null;
    }

    const impAtTile = impMap.get(key);
    const eligible =
      (logicalType && typeSet.has(logicalType)) ||
      (impAtTile && typeSet.has(impAtTile.type));
    if (!eligible) continue;

    const isImproved = !!impAtTile;
    const resInfo = resourceAt(x, y);

    let name;
    let iconId;
    if (resInfo) {
      name = resInfo.Name ? Locale.compose(resInfo.Name) : resInfo.ResourceType;
      iconId = resInfo.ResourceType;
    } else if (impAtTile) {
      name = impAtTile.name;
      iconId = impAtTile.iconId;
    } else {
      const def = GameInfo.Constructibles.lookup(logicalType);
      name = def?.Name ? Locale.compose(def.Name) : logicalType;
      iconId = logicalType;
    }

    const target = isImproved ? improved : unimproved;
    if (!target.has(name)) target.set(name, { name, iconId, count: 0 });
    target.get(name).count += 1;
  }

  return {
    improved: Array.from(improved.values()).sort((a, b) => b.count - a.count),
    unimproved: Array.from(unimproved.values()).sort((a, b) => b.count - a.count),
  };
}

// --- resource tile counting (Trade) ----------------------------------------

export function countResourceTiles(city) {
  const byName = new Map();
  let total = 0;
  let indices = [];
  try { indices = city?.getPurchasedPlots?.() || []; } catch { indices = []; }
  for (const idx of indices) {
    let loc;
    try { loc = GameplayMap.getLocationFromIndex(idx); } catch { continue; }
    if (!loc) continue;
    const info = resourceAt(loc.x, loc.y);
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
  try { ids = city?.getConnectedCities?.() || []; }
  catch (e) { console.error("[ETFI] getConnectedCities failed", e); return result; }
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
// Building Quarters = urban tiles with two non-Wall ageless/current-age
// buildings. Special Quarters = tiles with a single FULL_TILE building (Rail
// Station, Launch Pad, Airfield). Each is listed by its building(s).
export function getQuarters(city) {
  const buildingQuarters = [];
  const specialQuarters = [];
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
      const fullTiles = blds.filter((b) => isFullTileType(b.type));
      if (fullTiles.length) {
        specialQuarters.push({ buildings: fullTiles.map((b) => ({ name: b.name, iconId: b.iconId })) });
        continue;
      }
      const qualifying = blds.filter((b) => !isWallType(b.type) && isCurrentOrAgeless(b.type));
      if (qualifying.length >= 2) {
        buildingQuarters.push({ buildings: qualifying.map((b) => ({ name: b.name, iconId: b.iconId })) });
      }
    }
  } catch (e) {
    console.error("[ETFI] getQuarters failed", e);
  }
  return {
    buildingQuarters,
    specialQuarters,
    count: buildingQuarters.length + specialQuarters.length,
  };
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
      const rInfo = resourceAt(loc.x, loc.y);
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

// --- resort: appealing tiles (improved / unimproved) + breathtaking dev -----
//
// appealingImproved / appealingUnimproved: rural tiles with appeal >= Charming,
//   split by whether they have an improvement (grouped by resource/improvement).
// breathtakingImprovements / breathtakingDistricts: improved Breathtaking tiles
//   that are rural Improvements vs Districts (>=1 building). breathtakingTotal:
//   all Breathtaking tiles. (The game counts a Breathtaking tile as developed
//   if it has an improvement OR a building/district.)
export function getResortData(city) {
  const result = {
    appealingImproved: [], appealingUnimproved: [],
    breathtakingImprovements: 0, breathtakingDistricts: 0, breathtakingTotal: 0,
    naturalWonders: 0,
  };
  const imp = new Map();
  const unimp = new Map();
  let charming = 3;
  let breathtaking = 5;
  try {
    charming = getGlobalParamNumber("APPEAL_FOR_HAPPINESS_TILE_YIELD");
    breathtaking = getGlobalParamNumber("APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD");
  } catch {}
  try {
    const impMap = buildImprovementTileMap(city);
    // District tiles = tiles with at least one completed building.
    const districtSet = new Set();
    const bids = city?.Constructibles?.getIdsOfClass?.("BUILDING") || [];
    for (const id of bids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const loc = inst.location;
      if (!loc || loc.x == null || loc.y == null) continue;
      districtSet.add(`${loc.x},${loc.y}`);
    }
    const indices = city?.getPurchasedPlots?.() || [];
    for (const idx of indices) {
      let loc;
      try { loc = GameplayMap.getLocationFromIndex(idx); } catch { continue; }
      if (!loc) continue;
      const { x, y } = loc;
      const key = `${x},${y}`;
      let isNW = false;
      try { isNW = !!GameplayMap.isNaturalWonder(x, y); } catch {}
      if (isNW) { result.naturalWonders++; continue; }
      let water = false;
      try { water = !!GameplayMap.isWater(x, y); } catch {}
      if (water) continue;
      let appeal = 0;
      try { appeal = GameplayMap.getAppeal(x, y); } catch {}
      const impAtTile = impMap.get(key);
      const isDistrict = districtSet.has(key);

      if (appeal >= breathtaking) {
        result.breathtakingTotal++;
        if (impAtTile) result.breathtakingImprovements++;
        else if (isDistrict) result.breathtakingDistricts++;
      }

      if (appeal < charming) continue;
      const resInfo = resourceAt(x, y);
      if (impAtTile) {
        const name = resInfo ? (resInfo.Name ? Locale.compose(resInfo.Name) : resInfo.ResourceType) : impAtTile.name;
        const iconId = resInfo ? resInfo.ResourceType : impAtTile.iconId;
        if (!imp.has(name)) imp.set(name, { name, iconId, count: 0 });
        imp.get(name).count++;
      } else if (!isDistrict) {
        let name = null;
        let iconId = null;
        if (resInfo) {
          name = resInfo.Name ? Locale.compose(resInfo.Name) : resInfo.ResourceType;
          iconId = resInfo.ResourceType;
        } else {
          let logicalType = null;
          try { logicalType = GameInfo.Constructibles.lookup(Districts.getFreeConstructible(loc, GameContext.localPlayerID))?.ConstructibleType ?? null; } catch {}
          if (!logicalType) continue;
          const def = GameInfo.Constructibles.lookup(logicalType);
          name = def?.Name ? Locale.compose(def.Name) : logicalType;
          iconId = logicalType;
        }
        if (!unimp.has(name)) unimp.set(name, { name, iconId, count: 0 });
        unimp.get(name).count++;
      }
    }
  } catch (e) {
    console.error("[ETFI] getResortData failed", e);
  }
  result.appealingImproved = Array.from(imp.values()).sort((a, b) => b.count - a.count);
  result.appealingUnimproved = Array.from(unimp.values()).sort((a, b) => b.count - a.count);
  return result;
}

// True if the local player has fully unlocked (mastered) the Globalism civic,
// which enables Resort-town Tourism on improved Breathtaking tiles.
export function hasGlobalismMastery() {
  try {
    const playerId = GameContext.localPlayerID;
    let node = null;
    for (const n of GameInfo.ProgressionTreeNodes || []) {
      if (n.ProgressionTreeNodeType === "NODE_CIVIC_MO_MAIN_GLOBALISM") { node = n; break; }
    }
    if (!node) return false;
    const handle = node.$hash ?? node.ProgressionTreeNodeType;
    const state = Game.ProgressionTrees.getNodeState(playerId, handle);
    if (typeof ProgressionTreeNodeState !== "undefined") {
      return state === ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED;
    }
    return false;
  } catch (e) {
    console.error("[ETFI] hasGlobalismMastery failed", e);
    return false;
  }
}
