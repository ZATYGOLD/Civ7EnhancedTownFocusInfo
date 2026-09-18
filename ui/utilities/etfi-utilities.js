// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/utilities/etfi-utilities.js
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
//
// NOTE: hover tooltips are now built as structured MODELS (`row.tipModel`, a
// { sections: [...] } object) and rendered by the framed tooltip in
// etfi-render.js via the same renderSectionPanels the inline panels use. There
// is no text-markup tooltip builder anymore.

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

// Resource tiles inside the town's borders, split by whether the tile carries
// an improvement. Each entry is a display row: { name, iconId, count }.
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

// Settlements this town is connected to, split City/Town. Names are localized.
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
// Returns the player's Cities (NOT Towns) that this town is connected to, each
// as { id, name, food }, where `food` is the Food per turn the town sends to
// that City.
//
// Source: base-standard/ui/city-details/model-city-details.js
// (buildSendingFoodData). A specialized Town distributes its Food equally to
// every connected City; the engine exposes that per-City amount directly via
// Town.getSentFoodPerCity(), and the receivers are Town.getConnectedCities()
// filtered to non-Towns. The same `getConnectedCities()` call backs
// getConnectedSettlements().
//
// Note: the engine only sends Food while the town's growthType is PROJECT
// (i.e. it has an active focus, not the default EXPAND/growing mode). When the
// town is still growing, getSentFoodPerCity() reports 0, so `food` is 0 for
// every City — that matches the game (an unspecialized town sends nothing).
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
// The default Town behavior (LOC_PROJECT_DEFAULT_TOOLTIP_DESCRIPTION) converts
// all of the Town's Production into Gold. This returns the Town's Production and
// Gold per turn and their sum — the effective Gold/turn the Town yields once the
// Production conversion is applied.
//
// Source: same yield API the base City Details panel uses
// (base-standard/ui/city-details/model-city-details.js):
// city.Yields.getNetYield(YieldTypes.YIELD_*).
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

// Internal helper (not imported directly by builders).
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
  // Always include the base Temple as a fallback.
  set.add("BUILDING_TEMPLE");
  return set;
})();

// Internal helper (not imported directly by builders).
function isRelicTemple(type) {
  return RELIC_SLOT_TEMPLE_TYPES.has(type);
}

// Count the completed temple-type buildings (relic-slot buildings, excluding the
// Palace, which is never a Town building) in the town.
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

// Town Focus effects are defined as Modifiers in the game's own data (see
// base-standard/data/projects-gameeffects.xml), e.g. the Fort Town's Gold:
//
//   <Modifier id="ATTACH_FORT_WALLS_GOLD_FROM_PROJECT"
//             collection="COLLECTION_CITY_PLOT_YIELDS" effect="EFFECT_PLOT_ADJUST_YIELD">
//     <Argument name="YieldType">YIELD_GOLD</Argument>
//     <Argument name="Amount">1</Argument>
//
// Reading the number out of GameInfo instead of hardcoding it means a balance
// patch (or another mod's data change) updates our preview automatically.
// `fallback` is returned when the row is missing, so an unexpected game build
// degrades to the last-known-good value rather than showing 0.
//
// PERFORMANCE: GameInfo.ModifierArguments is a flat table of roughly 15k-25k
// rows depending on installed content, and .find() is a linear scan over it.
// Results are memoized because the table is static for the session — without
// this, a single panel refresh costs hundreds of thousands of row visits, and
// callers reached from per-plot loops (addNaturalWonderYields) would re-scan
// the whole table for every tile. Only successful lookups are cached, so a
// value that is missing early (GameInfo not yet populated) can still resolve
// later instead of freezing its fallback for the rest of the session.
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

// Points awarded by a victory-point tracker (base-standard/data/victories.xml
// <VictoryScorings>). Resort Town's Tourism is scored this way rather than as a
// project modifier, so it is the one focus number that does not come from the
// Modifiers tables.
//
// No shipped game script reads GameInfo.VictoryScorings, so we cannot confirm
// the table is exposed to UI scripts. The read is attempted defensively: if the
// table isn't there, `fallback` is used and the mod behaves exactly as it did
// when the number was hardcoded.
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
// The "warehouse" focuses (Farming, Fishing, Mining, and the Happiness half of
// Trade Outpost) do NOT carry an Amount on their modifier. Their modifier uses
// EFFECT_CITY_GRANT_WAREHOUSE_YIELD with a WarehouseYieldChange argument that
// lists Warehouse_YieldChanges row IDs, and the number lives on those rows as
// YieldChange, e.g. in age-antiquity/data/constructibles-no-persist.xml:
//
//   <Row ID="AQTownPastureFood" Age="AGE_ANTIQUITY" YieldType="YIELD_FOOD"
//        YieldChange="1" ConstructibleInCity="IMPROVEMENT_PASTURE"/>
//
// The modifier IDs are the same strings in every age; each age module defines
// its own copy pointing at that age's rows, so we filter by the current age.
//
// Returns { byConstructible: Map<constructibleType, amount>, fallback: number }.
// `fallback` is the most common amount across the matched rows — used for the
// improvements a focus displays that the data keys by terrain or feature
// instead of by improvement (e.g. Farms are granted through TERRAIN_FLAT, not
// through IMPROVEMENT_FARM). NaN means nothing could be resolved.
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

// Fortifications in the town, grouped by type with a count and split into:
//   * walls          - those tagged DISTRICT_WALL (Ancient Walls, Medieval Walls,
//                      Defensive Fortifications). These are what make a District
//                      "Fortified", so ONLY these earn the Fort Town's +1 Gold.
//   * fortifications - everything else tagged FORTIFICATION (Bailey, Motte, Great
//                      Wall, Kasbah, Hillfort, Shore Battery, wonders, ...).
//                      These are Fortifications but NOT Fortified Districts, so
//                      they earn the +25 Health only — no Gold.
// Each group is { name, iconId, type, count }. `total` is the combined count
// (every fortification earns the Health bonus).
export function getFortifications(city) {
  const wallMap = new Map();
  const fortMap = new Map();
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
        const isWall = ConstructibleHasTagType(type, "DISTRICT_WALL");
        const target = isWall ? wallMap : fortMap;
        if (!target.has(type)) {
          target.set(type, { type, name: def.Name ? Locale.compose(def.Name) : type, iconId: type, count: 0 });
        }
        target.get(type).count++;
      }
    }
  } catch (e) {
    console.error("[ETFI] getFortifications failed", e);
  }
  const sort = (m) => Array.from(m.values()).sort((a, b) => b.count - a.count);
  const walls = sort(wallMap);
  const fortifications = sort(fortMap);
  const total = walls.reduce((s, g) => s + g.count, 0) + fortifications.reduce((s, g) => s + g.count, 0);
  return { walls, fortifications, total };
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
// appealingImproved / appealingUnimproved: rural tiles with appeal >= Charming,
//   split by whether they have an improvement (grouped by resource/improvement).
// breathtakingImprovements / breathtakingDistricts: improved Breathtaking tiles
//   that are rural Improvements vs Districts (>=1 building). breathtakingTotal:
//   all Breathtaking tiles. (The game counts a Breathtaking tile as developed
//   if it has an improvement OR a building/district.)
// Round DOWN to the nearest 0.5 (applied once at the very end of a calculation).
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

// The Resort's per-improved-Natural-Wonder-tile contribution is what the tile
// GAINS from the focus. Two separate project modifiers can apply to the plot
// (base-standard/data/projects-gameeffects.xml):
//   * ATTACH_RESORT_HAPPINESS_GOLD_FROM_PROJECT — flat +1 Happiness / +1 Gold,
//     but ONLY on a plot that meets the appeal threshold, and
//   * ATTACH_RESORT_NATURAL_WONDER_FROM_PROJECT — +50%, on any Natural Wonder
//     plot, for a FIXED list of seven yield types.
// The flat amount lands in the plot's base and the percentage is applied to that
// total, so effective = (base + flat) * 1.5 and:
//     contribution = base*0.5 + flat*1.5     (flat = 1 only when appealing)
// getYields() reports the tile as it currently stands, so `base` is recovered as:
//   * Resort active   -> base = effective/1.5 - flat
//   * Resort inactive -> effective already IS base (no focus bonus applied)
// VERIFIED IN-GAME: GameplayMap.getYields(plot, playerID) DOES include the
// town's own project modifiers, so the branch above is correct — toggling the
// Resort focus on and off produces matching numbers in both states. Do not
// "fix" this by switching to getYieldsWithCity(): that variant exists for
// evaluating a plot in the context of a city it does not currently belong to
// (building/worker placement previews), not for reading owned tiles.
// Example (per tile): base 6 Culture / 3 Happiness / 0 Gold -> effective with
// Resort = 9 / 6 / 1.5 -> contribution = +3 Culture / +3 Happiness / +1.5 Gold.
// Both numbers come from the game's own modifier data. The Natural Wonder bonus
// is a Percent argument (50) rather than an Amount, so it is divided by 100.
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
          // Improved Natural Wonder (Expedition Base). It earns the Resort's
          // +50% raw-yield bonus (Natural Wonders category), plus — only if the
          // tile actually meets the appeal threshold — the flat +1 Happiness /
          // +1 Gold. Both are folded in here, which is why the tile is excluded
          // from the Appealing category below. It still counts toward the
          // Breathtaking tally for Tourism.
          let entry = nwByName.get(nwName);
          if (!entry) { entry = { name: nwName, count: 0, yieldMap: new Map() }; nwByName.set(nwName, entry); }
          entry.count++;
          addNaturalWonderYields(entry.yieldMap, idx, resortActive, isAppealing);
        } else {
          // Unimproved Natural Wonder: eligible but not earning yet -> Unimproved.
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
      // Label for an improved tile: the Natural Wonder, else the resource, else
      // the improvement itself.
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
      // An improved Natural Wonder already contributes its appealing +1 Happiness
      // / +1 Gold inside the NATURAL WONDERS category: addNaturalWonderYields
      // folds the flat bonus in (boosted by the +50%, so 1.5 each). Counting the
      // tile again here would double-count Happiness and Gold. It still counted
      // toward the Breathtaking tally above (that drives Tourism).
      if (nwName && impAtTile) continue;
      if (impAtTile) {
        // Appealing improved tile -> +1 Happiness / +1 Gold.
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
        // A tile's building(s) on ONE bullet line — a 2-building Quarter (e.g.
        // City Hall + Altar) shows both names joined by " | ".
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
  // Districts first, then the rest by descending count.
  result.appealingImproved = Array.from(imp.values()).sort((a, b) => {
    if (!!a.isDistrict !== !!b.isDistrict) return a.isDistrict ? -1 : 1;
    return b.count - a.count;
  });
  result.appealingUnimproved = Array.from(unimp.values()).sort((a, b) => b.count - a.count);
  result.breathtakingImprovementGroups = Array.from(btImp.values()).sort((a, b) => b.count - a.count);
  // Quarters (2-building tiles) first, then single-building Districts.
  result.breathtakingDistrictTiles = btDistTiles.sort((a, b) => (b?.length || 0) - (a?.length || 0));
  // One entry per wonder: { name, count, yields:[{yieldType,value}] }.
  result.naturalWonders = Array.from(nwByName.values())
    .map((e) => ({
      name: e.name,
      count: e.count,
      // Round each accumulated bonus to the nearest 0.5.
      yields: Array.from(e.yieldMap.entries())
        .map(([yieldType, value]) => ({ yieldType, value: roundToHalf(value) }))
        .filter((y) => y.value > 0),
    }))
    .sort((a, b) => b.count - a.count);
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
