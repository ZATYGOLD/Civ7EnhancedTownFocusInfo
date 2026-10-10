// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// ETFI API. Live, read-only queries against the current town, used by the
// per-focus model builders. No rendering here.

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

const TRADE_ROUTE_ICON = "TRADE_ROUTE";
export const HEAL_ICON = "ACTION_HEAL";
export const FORTIFY_ICON = "ACTION_FORTIFY";
export const TOURISM_ICON = "CULTURE_VP";
export const RESOURCE_ICON = "RADIAL_RESOURCES";
export const RELIC_ICON = "NAR_REW_GREATWORK";

// Shared: the Trade Route range bonus, used by Trade Outpost and Factory Town.
// Both focuses attach the same pair of modifiers (one per domain) carrying the
// same Amount, so reading the land one is enough for the pill.
const MOD_TRADE_RANGE = "ATTACH_LAND_TRADE_RANGE_IN_CITY_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if the modifier row can't be read.
const FALLBACK_TRADE_RANGE = 5;
export function tradeRangePill() {
  return {
    yieldType: TRADE_ROUTE_ICON,
    value: getModifierAmount(MOD_TRADE_RANGE, "Amount", FALLBACK_TRADE_RANGE),
  };
}

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

export function getCurrentAgeType() {
  try {
    return (GameInfo?.Ages?.lookup?.(Game.age)?.AgeType || "").trim();
  } catch (e) {
    console.error("[ETFI] getCurrentAgeType failed; age gating will be skipped", e);
    return "";
  }
}

export function getTownCity() {
  try {
    const id = UI.Player?.getHeadSelectedCity?.();
    return id ? Cities.get(id) : null;
  } catch (e) {
    console.error("[ETFI] getTownCity failed; no settlement selected", e);
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
// Tiles whose logical improvement is in `typeSet`, split by whether the
// improvement is built (only built ones earn the yield). Rows display the
// RESOURCE name/icon when the tile has one, else the improvement's.
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

    // `type` is the IMPROVEMENT type, kept separate from iconId because a tile
    // with a resource displays the resource's name and icon instead. The
    // warehouse focuses need the improvement to look up their per-improvement
    // amount in the game data (see warehouseAmountResolver).
    const type = impAtTile?.type ?? logicalType ?? null;

    const target = isImproved ? improved : unimproved;
    if (!target.has(name)) target.set(name, { name, iconId, type, count: 0 });
    target.get(name).count += 1;
  }

  return {
    improved: Array.from(improved.values()).sort((a, b) => b.count - a.count),
    unimproved: Array.from(unimproved.values()).sort((a, b) => b.count - a.count),
  };
}

// --- resource tile counting (Trade) ----------------------------------------

// Resource tiles in the town, split by whether the tile is improved.
export function countResourceTiles(city) {
  const impMap = buildImprovementTileMap(city);
  const imp = new Map();
  const unimp = new Map();
  let indices = [];
  try { indices = city?.getPurchasedPlots?.() || []; }
  catch (e) { console.error("[ETFI] getPurchasedPlots failed; no resource tiles counted", e); }
  for (const idx of indices) {
    let loc;
    try { loc = GameplayMap.getLocationFromIndex(idx); }
    catch (e) { console.error("[ETFI] getLocationFromIndex failed for plot", idx, e); continue; }
    if (!loc) continue;
    const info = resourceAt(loc.x, loc.y);
    if (!info) continue;
    const name = info.Name ? Locale.compose(info.Name) : info.ResourceType;
    const target = impMap.has(`${loc.x},${loc.y}`) ? imp : unimp;
    if (!target.has(name)) target.set(name, { name, iconId: info.ResourceType, count: 0 });
    target.get(name).count += 1;
  }
  const sort = (m) => Array.from(m.values()).sort((a, b) => b.count - a.count);
  return { improved: sort(imp), unimproved: sort(unimp) };
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

// --- connected cities + food sent (Town -> connected Cities) ---------------
//
// Connected Cities (NOT Towns) as { id, name, food }. Mirrors
// buildSendingFoodData in base-standard/ui/city-details/model-city-details.js.
//
// The engine only sends Food while growthType is PROJECT, so a still-growing
// town reports 0 for every City. That matches the game.
export function getConnectedCitiesFood(city) {
  const cities = [];
  let ids = [];
  try {
    ids = city?.getConnectedCities?.() || [];
  } catch (e) {
    console.error("[ETFI] getConnectedCitiesFood: getConnectedCities failed", e);
    return cities;
  }

  // Food sent to EACH connected City (the engine splits the town's Food evenly,
  // so every connected City receives the same amount).
  let foodPerCity = null;
  try {
    const v = city?.getSentFoodPerCity?.();
    if (typeof v === "number" && isFinite(v)) foodPerCity = v;
  } catch (e) {
    console.error("[ETFI] getConnectedCitiesFood: getSentFoodPerCity failed", e);
  }

  for (const id of ids) {
    const s = Cities.get(id);
    if (!s) continue;
    if (s.isTown) continue; // Cities only — connected Towns do not receive food.
    cities.push({
      id,
      name: Locale.compose(s.name),
      food: foodPerCity,
    });
  }
  return cities;
}

// --- converted gold (default Town behavior) --------------------------------
//
// An unspecialized Town converts all its Production into Gold. Returns the
// Production and Gold per turn plus their sum (the effective Gold/turn).
export function getConvertedGold(city) {
  let production = 0;
  let gold = 0;
  try {
    const y = city?.Yields;
    if (y && typeof YieldTypes !== "undefined") {
      production = y.getNetYield(YieldTypes.YIELD_PRODUCTION) || 0;
      gold = y.getNetYield(YieldTypes.YIELD_GOLD) || 0;
    }
  } catch (e) {
    console.error("[ETFI] getConvertedGold failed", e);
  }
  return { production, gold, total: production + gold };
}

// True when the town has no active focus (default EXPAND/Growing mode): its
// Production still converts to Gold, but its Food feeds growth (none is sent).
// Used to decide whether a hovered focus's yields are unrealized (preview) vs.
// already live.
export function isTownGrowing(city) {
  try {
    const gt = city?.Growth?.growthType;
    return typeof GrowthTypes !== "undefined" && gt === GrowthTypes.EXPAND;
  } catch (e) {
    console.error("[ETFI] isTownGrowing failed; assuming the town is not growing", e);
    return false;
  }
}

// True when a town-focus card element represents the Growing Town focus — either
// EXPAND growth or the NO_PROJECT project. Reads the card's data-growth-type /
// data-project-type attributes (works for both the inline list card and the
// hover tooltip's target element).
export function isGrowthFocusEl(el) {
  if (!el) return false;
  const gt = el.dataset?.growthType;
  const growthType = gt != null && gt !== "" ? Number(gt) : null;
  if (typeof GrowthTypes !== "undefined" && growthType === GrowthTypes.EXPAND) return true;
  const pt = el.dataset?.projectType;
  const projectType = pt != null && pt !== "" ? Number(pt) : null;
  if (typeof ProjectTypes !== "undefined" && projectType === ProjectTypes.NO_PROJECT) return true;
  return false;
}


// --- building helpers (Religious Site) -------------------------------------

function isCurrentOrAgeless(type) {
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

// A "Temple" for Relic-slot purposes is any building that has a RELIC great-work
// slot. This captures the base Temple AND any civ-unique temple replacement
// without hardcoding civ-specific building types.
const RELIC_SLOT_TEMPLE_TYPES = (() => {
  const set = new Set();
  try {
    for (const row of GameInfo.Constructible_GreatWorks || []) {
      if (row.GreatWorkSlotType === "GREATWORKSLOT_RELIC") set.add(row.ConstructibleType);
    }
  } catch (e) {
    console.error("[ETFI] building relic-temple set failed", e);
  }
  set.add("BUILDING_TEMPLE");
  return set;
})();

function isRelicTemple(type) {
  return RELIC_SLOT_TEMPLE_TYPES.has(type);
}

// Completed relic-slot buildings, excluding the Palace.
export function countTemples(city) {
  let n = 0;
  try {
    const ids = city?.Constructibles?.getIdsOfClass?.("BUILDING") || [];
    for (const id of ids) {
      const inst = Constructibles.get(id);
      if (!inst || !inst.complete) continue;
      const def = GameInfo.Constructibles.lookup(inst.type);
      if (!def || def.ConstructibleClass !== "BUILDING") continue;
      const t = def.ConstructibleType;
      if (t === "BUILDING_PALACE") continue;
      if (isRelicTemple(t)) n++;
    }
  } catch (e) {
    console.error("[ETFI] countTemples failed", e);
  }
  return n;
}

// --- game data: modifier arguments -----------------------------------------

// Focus amounts come from the game's own modifier data, so balance patches flow
// through automatically. `fallback` covers a missing row rather than showing 0.
//
// Memoized: ModifierArguments is a flat 15k-25k row table and .find() scans it
// linearly, and some callers sit inside per-plot loops. Only successful lookups
// are cached, so a value missing before GameInfo is populated can still resolve
// later rather than freezing its fallback for the session.
const modifierAmountCache = new Map();

export function getModifierAmount(modifierId, argName = "Amount", fallback = 0) {
  const cacheKey = `${modifierId} ${argName}`;
  const cached = modifierAmountCache.get(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const rows = GameInfo?.ModifierArguments;
    const row = rows?.find?.((r) => r?.ModifierId === modifierId && r?.Name === argName);
    if (!row) return fallback;
    const n = Number(row.Value);
    if (!Number.isFinite(n)) return fallback;
    modifierAmountCache.set(cacheKey, n);
    return n;
  } catch (e) {
    console.error("[ETFI] getModifierAmount failed", modifierId, argName, e);
    return fallback;
  }
}

// Raw (string) value of a modifier argument. Some arguments are lists rather
// than numbers — see getWarehouseAmounts below. Memoized for the same reason as
// getModifierAmount above.
const modifierArgumentCache = new Map();

function getModifierArgumentRaw(modifierId, argName) {
  const cacheKey = `${modifierId} ${argName}`;
  const cached = modifierArgumentCache.get(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const row = GameInfo?.ModifierArguments?.find?.(
      (r) => r?.ModifierId === modifierId && r?.Name === argName,
    );
    const value = row?.Value ?? null;
    if (value !== null) modifierArgumentCache.set(cacheKey, value);
    return value;
  } catch (e) {
    console.error("[ETFI] getModifierArgumentRaw failed", modifierId, argName, e);
    return null;
  }
}

// Resort Town's Tourism is scored as a victory-point tracker, not a project
// modifier — the one focus number outside the Modifiers tables.
//
// UNVERIFIED: no shipped game script reads GameInfo.VictoryScorings, so we
// cannot confirm it is exposed to UI scripts. If it isn't, `fallback` applies
// and behaviour matches the old hardcoded number.
export function getVictoryScoringPoints(scoringId, fallback = 0) {
  try {
    const row = GameInfo?.VictoryScorings?.find?.((r) => r?.ScoringId === scoringId);
    if (!row) return fallback;
    const n = Number(row.Points);
    return Number.isFinite(n) ? n : fallback;
  } catch (e) {
    console.error("[ETFI] getVictoryScoringPoints failed", scoringId, e);
    return fallback;
  }
}

// --- game data: warehouse yields -------------------------------------------
//
// The warehouse focuses (Farming, Fishing, Mining, Trade's Happiness) carry NO
// Amount on their modifier. It holds a WarehouseYieldChange argument listing
// Warehouse_YieldChanges row IDs, and the number lives on those rows. Modifier
// IDs repeat across ages pointing at per-age rows, hence the age filter.
//
// Returns { byConstructible: Map<type, amount>, fallback }. `fallback` is the
// modal amount, for improvements the data keys by terrain or feature instead
// (Farms come via TERRAIN_FLAT, not IMPROVEMENT_FARM). NaN = nothing resolved.
export function getWarehouseAmounts(modifierId, yieldType) {
  const byConstructible = new Map();
  const tally = new Map();
  try {
    const raw = getModifierArgumentRaw(modifierId, "WarehouseYieldChange");
    if (!raw) return { byConstructible, fallback: Number.NaN };
    const wanted = new Set(String(raw).split(",").map((s) => s.trim()).filter(Boolean));
    const age = getCurrentAgeType();
    for (const row of GameInfo?.Warehouse_YieldChanges || []) {
      if (!wanted.has(row?.ID)) continue;
      if (row?.YieldType !== yieldType) continue;
      // Rows carry the age they belong to; an empty Age applies to all.
      if (row?.Age && age && row.Age !== age) continue;
      const amount = Number(row.YieldChange);
      if (!Number.isFinite(amount)) continue;
      if (row.ConstructibleInCity) byConstructible.set(row.ConstructibleInCity, amount);
      tally.set(amount, (tally.get(amount) || 0) + 1);
    }
  } catch (e) {
    console.error("[ETFI] getWarehouseAmounts failed", modifierId, yieldType, e);
  }
  let fallback = Number.NaN;
  let best = 0;
  for (const [amount, n] of tally) {
    if (n > best) { best = n; fallback = amount; }
  }
  return { byConstructible, fallback };
}

// Per-improvement amount resolver shared by the warehouse focuses. Returns a
// function(constructibleType) -> amount, preferring the exact row for that
// improvement and falling back to the focus's modal amount, then to
// `lastKnownGood` if the game data could not be read at all.
export function warehouseAmountResolver(modifierId, yieldType, lastKnownGood) {
  const { byConstructible, fallback } = getWarehouseAmounts(modifierId, yieldType);
  const resolved = Number.isFinite(fallback) || byConstructible.size > 0;
  const base = Number.isFinite(fallback) ? fallback : lastKnownGood;
  return {
    resolved,
    amountFor: (type) => {
      const exact = byConstructible.get(type);
      return Number.isFinite(exact) ? exact : base;
    },
  };
}

// --- fortifications (Fort) -------------------------------------------------

// Every FORTIFICATION-tagged constructible, grouped by type:
// { name, iconId, type, count }.
//
// Deliberately NOT split on DISTRICT_WALL — that tag affects neither of Fort
// Town's yields. 2.5.0 split it and was wrong; see fort-town.js for the detail.
export function getFortifications(city) {
  const byType = new Map();
  try {
    for (const cls of ["BUILDING", "IMPROVEMENT", "WONDER"]) {
      const ids = city?.Constructibles?.getIdsOfClass?.(cls) || [];
      for (const id of ids) {
        const inst = Constructibles.get(id);
        if (!inst || !inst.complete) continue;
        const def = GameInfo.Constructibles.lookup(inst.type);
        if (!def) continue;
        const type = def.ConstructibleType;
        if (!ConstructibleHasTagType(type, "FORTIFICATION")) continue;
        if (!byType.has(type)) {
          byType.set(type, { type, name: def.Name ? Locale.compose(def.Name) : type, iconId: type, count: 0 });
        }
        byType.get(type).count++;
      }
    }
  } catch (e) {
    console.error("[ETFI] getFortifications failed", e);
  }
  return Array.from(byType.values()).sort((a, b) => b.count - a.count);
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
// ageless (Palace, City Hall, ...), current-age, a Warehouse, a Unique building,
// a FULL_TILE (special) building, or a relic Temple (so temples are always
// listed). Shared by Urban Center and Religious Site so they use identical rules.
function isQuarterBuilding(type) {
  if (isWallType(type)) return false;
  try {
    if (isCurrentOrAgeless(type)) return true;
    if (ConstructibleHasTagType(type, "WAREHOUSE")) return true;
    if (ConstructibleHasTagType(type, "UNIQUE")) return true;
    if (isFullTileType(type)) return true;
    if (isRelicTemple(type)) return true;
  } catch {}
  return false;
}

// Qualifying buildings by tile, in four mutually exclusive buckets:
//   * uniqueQuarters  - civ-unique quarter       { name, buildings[] }
//   * specialQuarters - FULL_TILE building(s)    { buildings[] }
//   * quarters        - 2+ qualifying buildings  { buildings[] }
//   * buildings       - a single one (lone)      { name, iconId, type }
// quarterCount is the Urban Center bonus unit, buildingCount the Religious Site
// one. Each buildings[] entry is { name, iconId }.
export function getTownBuildings(city) {
  const quarters = [];
  const uniqueQuarters = [];
  const specialQuarters = [];
  const buildings = [];
  try {
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
      const qualifying = blds.filter((b) => isQuarterBuilding(b.type));
      if (!qualifying.length) continue;
      const mapped = (list) => list.map((b) => ({ name: b.name, iconId: b.iconId }));

      // The City Center is a normal district that follows the same rules as any
      // other tile: a single building (e.g. City Hall alone) is a lone Building,
      // while two qualifying buildings (e.g. City Hall + Temple) form a Quarter.

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
// appealing*: rural tiles at Charming or better, split by whether improved.
// breathtaking*: developed Breathtaking tiles, split Improvements vs Districts
// (the game counts a tile as developed if it has an improvement OR a building).

// Round DOWN to the nearest 0.5, applied once at the end of a calculation.
function roundToHalf(v) {
  return Math.floor(v * 2) / 2;
}

// True when the town's CURRENTLY ACTIVE focus is already the Resort project.
// This matters for yields: GameplayMap.getYields() returns EFFECTIVE yields, so
// when Resort is already active a Natural Wonder tile's value already includes
// the +50% (e.g. a 6-culture tile reads 9). There is no base-yield API.
function isResortActive(city) {
  try {
    if (!city?.isTown) return false;
    const g = city.Growth;
    if (!g || typeof GrowthTypes === "undefined" || g.growthType !== GrowthTypes.PROJECT) return false;
    return GameInfo.Projects.lookup(g.projectType)?.ProjectType === "PROJECT_TOWN_RESORT";
  } catch (e) {
    console.error("[ETFI] isResortActive failed; treating the Resort project as inactive", e);
    return false;
  }
}

// What an improved Natural Wonder tile GAINS from the Resort focus. Two
// modifiers apply: a flat +1 Happiness/Gold (appealing plots only) and +50% on
// a fixed list of seven yield types. The flat lands in the base and the
// percentage applies to the total, so effective = (base + flat) * 1.5 and:
//
//     contribution = base*0.5 + flat*1.5        (flat = 1 only when appealing)
//
// getYields() reports the tile as it stands, so base is recovered as
// effective/1.5 - flat when Resort is active, or effective itself when not.
//
// VERIFIED IN-GAME: getYields() DOES include the town's own project modifiers,
// so that branch is correct — toggling the focus gives matching numbers both
// ways. Do NOT switch to getYieldsWithCity(): that is for evaluating a plot
// against a city it does not belong to (placement previews), not owned tiles.
//
// Example: base 6 Culture / 3 Happiness / 0 Gold -> effective 9 / 6 / 1.5
// -> contribution +3 Culture / +3 Happiness / +1.5 Gold.
const MOD_RESORT_NW = "ATTACH_RESORT_NATURAL_WONDER_FROM_PROJECT";
const MOD_RESORT_PER_TILE = "ATTACH_RESORT_HAPPINESS_GOLD_FROM_PROJECT";
// Last-known-good (game 1.5.0), used only if a modifier row can't be read.
const FALLBACK_NW_PCT = 50;
const FALLBACK_PER_TILE = 1;
function naturalWonderMultiplier() {
  return getModifierAmount(MOD_RESORT_NW, "Percent", FALLBACK_NW_PCT) / 100;
}
function resortAppealingPerTile() {
  return getModifierAmount(MOD_RESORT_PER_TILE, "Amount", FALLBACK_PER_TILE);
}
// The exact YieldType list on ATTACH_RESORT_NATURAL_WONDER_FROM_PROJECT. The
// +50% applies to these and nothing else, so a tile yielding some other type
// must not have the bonus applied to it.
const NATURAL_WONDER_BONUS_YIELDS = new Set([
  ETFI_YIELDS.FOOD,
  ETFI_YIELDS.PRODUCTION,
  ETFI_YIELDS.GOLD,
  ETFI_YIELDS.SCIENCE,
  ETFI_YIELDS.CULTURE,
  ETFI_YIELDS.HAPPINESS,
  ETFI_YIELDS.INFLUENCE, // YIELD_DIPLOMACY
]);
// `appealing` says whether this plot actually meets the appeal threshold. It is
// NOT assumed: a Natural Wonder tile below the threshold earns no flat +1/+1,
// and pretending otherwise both invents yield and drives `base` negative.
function addNaturalWonderYields(acc, plotIndex, resortActive, appealing) {
  try {
    const M = naturalWonderMultiplier();
    const FLAT = appealing ? resortAppealingPerTile() : 0;
    const isFlatType = (t) => t === ETFI_YIELDS.HAPPINESS || t === ETFI_YIELDS.GOLD;
    const add = (t, v) => acc.set(t, (acc.get(t) || 0) + v);

    const eff = new Map();
    const raw = GameplayMap.getYields(plotIndex, GameContext.localPlayerID) || [];
    for (const [yieldType, amount] of raw) {
      if (!(amount > 0)) continue;
      const ydef = GameInfo.Yields.lookup(yieldType);
      if (ydef) eff.set(ydef.YieldType, (eff.get(ydef.YieldType) || 0) + amount);
    }
    // Ensure the flat types are present so the appealing bonus still shows on a
    // tile with no base Gold — but only when the tile actually earns it.
    if (FLAT > 0) {
      if (!eff.has(ETFI_YIELDS.HAPPINESS)) eff.set(ETFI_YIELDS.HAPPINESS, 0);
      if (!eff.has(ETFI_YIELDS.GOLD)) eff.set(ETFI_YIELDS.GOLD, 0);
    }

    for (const [t, amount] of eff) {
      if (!NATURAL_WONDER_BONUS_YIELDS.has(t)) continue;
      const flat = isFlatType(t) ? FLAT : 0;
      // Clamp: a tile whose effective value is below flat*1.5 would otherwise
      // produce a negative base and fabricate yield out of nothing.
      const base = Math.max(0, resortActive ? (amount / (1 + M) - flat) : amount);
      const contribution = base * M + flat * (1 + M);
      if (contribution > 0) add(t, contribution);
    }
  } catch (e) {
    console.error("[ETFI] addNaturalWonderYields failed", e);
  }
}

function naturalWonderName(x, y) {
  try {
    const def = GameInfo.Features.lookup(GameplayMap.getFeatureType(x, y));
    if (def) return def.Name ? Locale.compose(def.Name) : def.FeatureType;
  } catch {}
  return null;
}

// Completed BUILDINGS on a single plot ({ name, iconId }), queried per-plot via
// MapConstructibles so EVERY building on the tile is captured (e.g. both
// buildings of a Quarter, or City Hall + a building on the city center).
function tileBuildingsAt(x, y) {
  const out = [];
  try {
    const ids = MapConstructibles.getConstructibles(x, y) || [];
    for (const cid of ids) {
      const inst = Constructibles.getByComponentID(cid);
      if (!inst || inst.complete === false) continue;
      const def = GameInfo.Constructibles.lookup(inst.type);
      if (!def || def.ConstructibleClass !== "BUILDING") continue;
      // Exclude Walls / Fortifications. isWallType expects the ConstructibleType
      // STRING (as getFortifications uses), not the inst.type hash.
      if (isWallType(def.ConstructibleType)) continue;
      out.push({
        name: def.Name ? Locale.compose(def.Name) : def.ConstructibleType,
        iconId: def.ConstructibleType,
      });
    }
  } catch (e) {
    console.error("[ETFI] tileBuildingsAt failed; buildings on plot may be under-counted", x, y, e);
  }
  return out;
}

export function getResortData(city) {
  const result = {
    appealingImproved: [], appealingUnimproved: [],
    breathtakingImprovements: 0, breathtakingDistricts: 0, breathtakingTotal: 0,
    breathtakingImprovementGroups: [], breathtakingDistrictTiles: [],
    naturalWonders: [],
  };
  const imp = new Map();
  const unimp = new Map();
  const btImp = new Map();   // breathtaking improved tiles grouped by name
  const btDistTiles = [];    // one entry per breathtaking district tile: its buildings
  const nwByName = new Map();
  const resortActive = isResortActive(city);
  // Appeal thresholds. getGlobalParamNumber() returns -1 for an unknown
  // parameter rather than throwing, so a bare try/catch gives no protection at
  // all: a renamed parameter would silently set these to -1, which makes EVERY
  // tile pass both `appeal >= breathtaking` and the appealing cutoff below and
  // inflates the whole preview. Only accept a sane positive number.
  let charming = 3;
  let breathtaking = 5;
  try {
    const c = getGlobalParamNumber("APPEAL_FOR_HAPPINESS_TILE_YIELD");
    const b = getGlobalParamNumber("APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD");
    if (Number.isFinite(c) && c > 0) charming = c;
    else console.error("[ETFI] APPEAL_FOR_HAPPINESS_TILE_YIELD unavailable; using default", charming);
    if (Number.isFinite(b) && b > 0) breathtaking = b;
    else console.error("[ETFI] APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD unavailable; using default", breathtaking);
  } catch (e) {
    console.error("[ETFI] appeal threshold lookup failed; using defaults", e);
  }
  try {
    const impMap = buildImprovementTileMap(city);
    const indices = city?.getPurchasedPlots?.() || [];
    for (const idx of indices) {
      let loc;
      try { loc = GameplayMap.getLocationFromIndex(idx); } catch { continue; }
      if (!loc) continue;
      const { x, y } = loc;
      const key = `${x},${y}`;
      let isNW = false;
      try { isNW = !!GameplayMap.isNaturalWonder(x, y); } catch {}
      // Appeal is needed by the Natural Wonder branch below (to decide whether
      // the tile earns the flat +1/+1) as well as by the Breathtaking/Appealing
      // classification further down, so resolve it up front.
      let appeal = 0;
      try { appeal = GameplayMap.getAppeal(x, y); } catch (e) {
        console.error("[ETFI] getAppeal failed; treating tile as unappealing", x, y, e);
      }
      const isAppealing = appeal >= Math.min(charming, breathtaking);
      let nwName = null;
      if (isNW) {
        nwName = naturalWonderName(x, y) || "Natural Wonder";
        if (impMap.has(key)) {
          // Both bonuses are folded in here, which is why the tile is excluded
          // from the Appealing category below. It still counts toward the
          // Breathtaking tally for Tourism.
          let entry = nwByName.get(nwName);
          if (!entry) { entry = { name: nwName, count: 0, yieldMap: new Map() }; nwByName.set(nwName, entry); }
          entry.count++;
          addNaturalWonderYields(entry.yieldMap, idx, resortActive, isAppealing);
        } else {
          if (!unimp.has(nwName)) unimp.set(nwName, { name: nwName, iconId: "IMPROVEMENT_EXPEDITION_BASE", count: 0 });
          unimp.get(nwName).count++;
          continue;
        }
      }
      let water = false;
      try { water = !!GameplayMap.isWater(x, y); } catch {}
      if (water && !isNW) continue;
      const impAtTile = impMap.get(key);
      // A non-improved tile that has completed building(s) is a District. Query
      // its buildings per-plot so a Quarter (2 buildings on one tile) lists both.
      const tileBuildings = impAtTile ? [] : tileBuildingsAt(x, y);
      const isDistrict = tileBuildings.length > 0;
      const resInfo = resourceAt(x, y);
      const impName = nwName
        ? nwName
        : resInfo ? (resInfo.Name ? Locale.compose(resInfo.Name) : resInfo.ResourceType) : impAtTile?.name;
      const impIcon = nwName
        ? "IMPROVEMENT_EXPEDITION_BASE"
        : resInfo ? resInfo.ResourceType : impAtTile?.iconId;

      if (appeal >= breathtaking) {
        result.breathtakingTotal++;
        if (impAtTile) {
          result.breathtakingImprovements++;
          if (!btImp.has(impName)) btImp.set(impName, { name: impName, iconId: impIcon, count: 0 });
          btImp.get(impName).count++;
        } else if (isDistrict) {
          result.breathtakingDistricts++;
          btDistTiles.push(tileBuildings);
        }
      }

      // Appealing tiles are Charming OR Breathtaking — isAppealing (computed
      // above) uses the lower of the two thresholds so BOTH levels are counted,
      // and is the same test the Natural Wonder branch used for its flat bonus.
      if (!isAppealing) continue;
      // addNaturalWonderYields already folded this tile's flat +1/+1 into the
      // Natural Wonders category, so counting it here would double-count.
      if (nwName && impAtTile) continue;
      if (impAtTile) {
        if (!imp.has(impName)) imp.set(impName, { name: impName, iconId: impIcon, count: 0 });
        imp.get(impName).count++;
      } else if (isDistrict) {
        // Appealing District tile (urban tile with a building) also counts as a
        // developed appealing tile and earns the +1 Happiness / +1 Gold. Track
        // each district's building(s) so the row's hover tooltip can list them
        // (a 2-building tile is a Quarter -> shown together with a " | " divider).
        const name = composeWithFallback("LOC_MOD_ETFI_DISTRICTS", "Districts");
        if (!imp.has(name)) imp.set(name, { name, iconId: "CITY_BUILDINGS", count: 0, tiles: [], isDistrict: true });
        const entry = imp.get(name);
        entry.count++;
        entry.tiles.push(tileBuildings.slice());
      } else {
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
  result.appealingImproved = Array.from(imp.values()).sort((a, b) => {
    if (!!a.isDistrict !== !!b.isDistrict) return a.isDistrict ? -1 : 1;
    return b.count - a.count;
  });
  result.appealingUnimproved = Array.from(unimp.values()).sort((a, b) => b.count - a.count);
  result.breathtakingImprovementGroups = Array.from(btImp.values()).sort((a, b) => b.count - a.count);
  result.breathtakingDistrictTiles = btDistTiles.sort((a, b) => (b?.length || 0) - (a?.length || 0));
  result.naturalWonders = Array.from(nwByName.values())
    .map((e) => ({
      name: e.name,
      count: e.count,
      yields: Array.from(e.yieldMap.entries())
        .map(([yieldType, value]) => ({ yieldType, value: roundToHalf(value) }))
        .filter((y) => y.value > 0),
    }))
    .sort((a, b) => b.count - a.count);
  return result;
}

// True when the Globalism civic is fully unlocked (gates Resort Tourism).
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
