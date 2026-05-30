// File Path: etfi-utilities.js
//
// Author: Zatygold
//
// ETFI API. Live, read-only queries against the current town, used by the
// per-focus model builders. No rendering here. Uses only confirmed engine APIs.

import { ConstructibleHasTagType } from "/base-standard/ui/utilities/utilities-tags.js";
import { getGlobalParamNumber } from "/core/ui/utilities/utilities-data.js";
import { ComponentID } from "/core/ui/utilities/utilities-component-id.js";

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

// Build the standardized "Improved" / "Unimproved" category sections shared by
// every focus that classifies tiles this way (Farming/Fishing, Mining, Trade,
// Factory, Resort). This guarantees identical titles, layout, and behavior:
//   * improved/unimproved: arrays of { name, iconId, count },
//   * improvedYields(group) -> yield array for an Improved row (omit for none),
//   * the Unimproved category never shows yields, lives in its own bottom panel,
//     and is flagged `hidden` so the "View Hidden" toggle controls it.
export function improvedUnimprovedSections({ improved, unimproved, improvedYields }) {
  const sections = [];
  if (improved && improved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_IMPROVED", "Improved"),
      rows: improved.map((g) => {
        const row = { iconId: g.iconId, name: g.name, count: g.count };
        if (improvedYields) {
          const y = improvedYields(g);
          if (y && y.length) row.yields = y;
        }
        return row;
      }),
    });
  }
  if (unimproved && unimproved.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIMPROVED", "Unimproved"),
      separatePanel: "bottom",
      hidden: true,
      rows: unimproved.map((g) => ({ iconId: g.iconId, name: g.name, count: g.count })),
    });
  }
  return sections;
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
  const impMap = buildImprovementTileMap(city);
  const imp = new Map();
  const unimp = new Map();
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
    const target = impMap.has(`${loc.x},${loc.y}`) ? imp : unimp;
    if (!target.has(name)) target.set(name, { name, iconId: info.ResourceType, count: 0 });
    target.get(name).count += 1;
    total += 1;
  }
  const sort = (m) => Array.from(m.values()).sort((a, b) => b.count - a.count);
  const improved = sort(imp);
  const unimproved = sort(unimp);
  // `groups` kept for backwards compatibility (all resource tiles together).
  return { improved, unimproved, groups: [...improved, ...unimproved], total };
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

// Connected vs. disconnected settlements for the Hub focus. "Disconnected" =
// the player's OTHER settlements that this town is not connected to (excluding
// the town itself). Returns connected + disconnected, each split City/Town.
export function getSettlementsByConnection(city) {
  const result = {
    connected: { cities: [], towns: [] },
    disconnected: { cities: [], towns: [] },
  };
  try {
    const connected = getConnectedSettlements(city);
    result.connected = connected;

    // Exclude the connected settlements and the town itself from disconnected.
    const exclude = [];
    try { if (city?.id) exclude.push(city.id); } catch {}
    let connIds = [];
    try { connIds = city?.getConnectedCities?.() || []; } catch {}
    for (const id of connIds) exclude.push(id);

    const owner = city?.owner;
    const all = (owner != null ? Players.get(owner)?.Cities?.getCities?.() : null) || [];
    for (const s of all) {
      if (!s || !s.id) continue;
      if (ComponentID.isMatchInArray(exclude, s.id)) continue;
      const name = Locale.compose(s.name);
      if (s.isTown) result.disconnected.towns.push(name);
      else result.disconnected.cities.push(name);
    }
  } catch (e) {
    console.error("[ETFI] getSettlementsByConnection failed", e);
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
// Unique Quarters = civ-specific quarters (the engine flags the District's
//   uniqueQuarterType, e.g. Acropolis). Special Quarters = tiles with a single
//   FULL_TILE building (Rail Station, Launch Pad, Airfield). Building Quarters =
//   any other urban tile with two non-Wall ageless/current-age buildings.
// Each tile is classified into exactly one bucket (unique > special > building).
function getUniqueQuarterName(loc) {
  try {
    const district = Districts.getAtLocation(loc);
    if (!district) return null;
    const uqt = district.uniqueQuarterType;
    if (typeof UniqueQuarterTypes !== "undefined" && uqt === UniqueQuarterTypes.NO_QUARTER) return null;
    if (uqt == null) return null;
    const def = GameInfo.UniqueQuarters.lookup(uqt);
    if (!def) return null;
    return def.Name ? Locale.compose(def.Name) : null;
  } catch {
    return null;
  }
}

// A building "counts" for a Quarter / Religious Site if it is not a Wall and is
// ageless, current-age, a Warehouse, a Unique building, or a FULL_TILE (special)
// building. Shared by Urban Center and Religious Site so they use identical rules.
function isQuarterBuilding(type) {
  if (isWallType(type)) return false;
  try {
    if (isCurrentOrAgeless(type)) return true;
    if (ConstructibleHasTagType(type, "WAREHOUSE")) return true;
    if (ConstructibleHasTagType(type, "UNIQUE")) return true;
    if (isFullTileType(type)) return true;
  } catch {}
  return false;
}

// Classify the town's qualifying buildings (see isQuarterBuilding) by tile into
// four buckets, shared by Urban Center and Religious Site:
//   * uniqueQuarters  - tiles flagged as a civ-unique quarter { name, buildings[] },
//   * specialQuarters - tiles with FULL_TILE building(s)        { buildings[] },
//   * quarters        - other tiles with 2+ qualifying buildings { buildings[] },
//   * buildings       - tiles with a single qualifying building (lone)  { name, iconId, type }.
// Each `buildings[]` entry is { name, iconId }. The town center tile is skipped.
//   quarterCount  = uniqueQuarters + specialQuarters + quarters (Urban Center bonus unit),
//   buildingCount = every qualifying building across all buckets (Religious Site bonus unit).
export function getTownBuildings(city) {
  const quarters = [];
  const uniqueQuarters = [];
  const specialQuarters = [];
  const buildings = [];
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
      if (!def || def.ConstructibleClass !== "BUILDING") continue;
      const key = `${loc.x},${loc.y}`;
      if (!perTile.has(key)) perTile.set(key, { loc, blds: [] });
      perTile.get(key).blds.push({
        type: def.ConstructibleType,
        name: def.Name ? Locale.compose(def.Name) : def.ConstructibleType,
        iconId: def.ConstructibleType,
      });
    }
    for (const [key, { loc, blds }] of perTile) {
      if (key === centerKey) continue;
      const qualifying = blds.filter((b) => isQuarterBuilding(b.type));
      if (!qualifying.length) continue;
      const mapped = (list) => list.map((b) => ({ name: b.name, iconId: b.iconId }));

      const uniqueName = getUniqueQuarterName(loc);
      if (uniqueName) {
        uniqueQuarters.push({ name: uniqueName, buildings: mapped(qualifying) });
        continue;
      }
      const fullTiles = qualifying.filter((b) => isFullTileType(b.type));
      if (fullTiles.length) {
        specialQuarters.push({ buildings: mapped(fullTiles) });
        continue;
      }
      if (qualifying.length >= 2) {
        quarters.push({ buildings: mapped(qualifying) });
      } else {
        buildings.push({ name: qualifying[0].name, iconId: qualifying[0].iconId, type: qualifying[0].type });
      }
    }
  } catch (e) {
    console.error("[ETFI] getTownBuildings failed", e);
  }
  const sumB = (arr) => arr.reduce((s, q) => s + q.buildings.length, 0);
  const quarterCount = uniqueQuarters.length + specialQuarters.length + quarters.length;
  const buildingCount = sumB(uniqueQuarters) + sumB(specialQuarters) + sumB(quarters) + buildings.length;
  return { quarters, uniqueQuarters, specialQuarters, buildings, quarterCount, buildingCount };
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
