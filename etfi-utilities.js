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

// Shared: the +5 Trade Route range bonus, used by Trade Outpost and Factory Town.
export const TRADE_RANGE = 5;
export function tradeRangePill() {
  return { yieldType: TRADE_ROUTE_ICON, value: TRADE_RANGE };
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

// Build the standardized "Improved" category section shared by every focus that
// classifies tiles this way (Farming/Fishing, Mining, Trade, Factory, Resort).
// Only the Improved tiles are shown — the Unimproved category is intentionally
// not rendered. (`unimproved` is still accepted for call-site compatibility.)
//   * improved: array of { name, iconId, count },
//   * improvedYields(group) -> yield array for an Improved row (omit for none).
export function improvedUnimprovedSections({ improved, improvedYields }) {
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
        // Optional hover tooltip: a group may carry `tiles` (an array of
        // per-tile { name, iconId } building arrays, e.g. Districts). Each tile
        // becomes a divided row listing its buildings as [icon] │ name items.
        if (Array.isArray(g.tiles) && g.tiles.length) {
          row.tipModel = {
            sections: [{
              rows: g.tiles.map((tile) => ({
                items: (tile || []).map((b) => ({ iconId: b.iconId, name: b.name })),
              })),
            }],
          };
        }
        return row;
      }),
    });
  }
  return sections;
}

// Build the standardized Quarter category sections (Quarters / Unique Quarters /
// Special Quarters + a lone Buildings category) shared by Urban Center and
// Religious Site from a getTownBuildings() result. Behavior is identical except
// for the yields, supplied via callbacks:
//   * quarterYields(quarter) -> yield array for a quarter row (all its buildings
//       are shown together on one line via `items`),
//   * buildingYields(building) -> yield array for a lone Building row (optional).
export function quarterSections({ quarters, uniqueQuarters, specialQuarters, buildings }, { quarterYields, buildingYields, buildingsTitle } = {}) {
  const quarterRow = (q) => {
    const row = { items: q.buildings.map((b) => ({ iconId: b.iconId, name: b.name })) };
    if (quarterYields) {
      const y = quarterYields(q);
      if (y && y.length) row.yields = y;
    }
    if (q.name) row.subText = q.name;
    return row;
  };

  const sections = [];
  if (quarters && quarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_QUARTERS", "Quarters"),
      separatePanel: true,
      rows: quarters.map(quarterRow),
    });
  }
  if (uniqueQuarters && uniqueQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_UNIQUE_QUARTERS", "Unique Quarters"),
      separatePanel: true,
      rows: uniqueQuarters.map(quarterRow),
    });
  }
  if (specialQuarters && specialQuarters.length) {
    sections.push({
      title: composeWithFallback("LOC_MOD_ETFI_SPECIAL_QUARTERS", "Special Quarters"),
      separatePanel: true,
      rows: specialQuarters.map(quarterRow),
    });
  }
  if (buildings && buildings.length) {
    const section = {
      title: buildingsTitle || composeWithFallback("LOC_MOD_ETFI_BUILDINGS", "Buildings"),
      separatePanel: "bottom",
      rows: buildings.map((b) => {
        const row = { iconId: b.iconId, name: b.name };
        if (buildingYields) {
          const y = buildingYields(b);
          if (y && y.length) row.yields = y;
        }
        return row;
      }),
    };
    sections.push(section);
  }
  return sections;
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

// Internal helper: used by getSettlementsByConnection (not imported directly).
function getConnectedSettlements(city) {
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
// getSettlementsByConnection().
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

// The Growing Town focus grants +50% growth (EFFECT_CITY_ADJUST_GROWTH
// Percent=50), which the engine applies as a reduction to the Food needed to
// grow population. It applies only while the town has no project (Growing).
export const GROWTH_FOCUS_MULTIPLIER = 1.5;

// Food + turns SAVED by using the Growing Town focus, computed per option 1:
// anchor on the engine's exact live threshold for the town's current state and
// derive the opposite side via the focus's +50%. Returns null if not derivable.
//   * Town currently Growing  -> the live threshold already includes the +50%,
//     so it IS the with-focus value; the without-focus value is threshold*1.5.
//   * Town currently specialized -> the +50% is inactive, so the live threshold
//     IS the without-focus value; the with-focus value is threshold/1.5.
// NOTE: the derived side is exact only when no OTHER growth modifiers stack;
// the engine-reported side is always exact (see town-focus-tooltip notes).
export function getGrowthSavings(city) {
  try {
    const g = city?.Growth;
    if (!g) return null;
    const threshold = g.getNextGrowthFoodThreshold?.()?.value;
    if (typeof threshold !== "number" || !(threshold > 0)) return null;

    const currentFood = typeof g.currentFood === "number" ? g.currentFood : 0;
    let foodPerTurn = 0;
    try {
      const y = city?.Yields;
      if (y && typeof YieldTypes !== "undefined") foodPerTurn = y.getNetYield(YieldTypes.YIELD_FOOD) || 0;
    } catch {}

    const growing = typeof GrowthTypes !== "undefined" && g.growthType === GrowthTypes.EXPAND;
    const withFocus = growing ? threshold : threshold / GROWTH_FOCUS_MULTIPLIER;
    const withoutFocus = growing ? threshold * GROWTH_FOCUS_MULTIPLIER : threshold;
    const foodSaved = withoutFocus - withFocus;

    // Turns saved = difference in turns-to-grow between the two thresholds at the
    // town's current Food/turn (same currentFood + rate on both sides).
    let turnsSaved = null;
    if (foodPerTurn > 0) {
      const turnsFor = (thr) => Math.max(0, Math.ceil((thr - currentFood) / foodPerTurn));
      turnsSaved = turnsFor(withoutFocus) - turnsFor(withFocus);
    }

    return { foodSaved, turnsSaved, withFocus, withoutFocus, foodPerTurn };
  } catch (e) {
    console.error("[ETFI] getGrowthSavings failed", e);
    return null;
  }
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

// --- fortifications (Fort) -------------------------------------------------

// Fortifications in the town, grouped by type with a count and split into:
//   * walls          - those tagged DISTRICT_WALL (Ancient/Medieval Walls, ...),
//   * fortifications  - everything else tagged FORTIFICATION (Bailey, Great Wall,
//                       Kasbah, Hillfort, Shore Battery, wonders, ...).
// Each group is { name, iconId, type, count }. `total` is the combined count.
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
  } catch {
    return false;
  }
}

// The Resort's per-improved-Natural-Wonder-tile contribution is what the tile
// GAINS from the focus = (effective yields) - (pre-resort base yields). The game:
//   * grants a flat +1 Happiness / +1 Gold appealing bonus (NW tiles are always
//     Appealing), AND
//   * applies +50% to the WHOLE tile, including that flat +1/+1.
// So effective = (base + flat) * 1.5, and the contribution per type is:
//     contribution = base*0.5 + flat*1.5   (flat = 1 for Happiness/Gold, else 0)
// getYields() returns EFFECTIVE yields. We recover `base` per type:
//   * Resort active  -> base = effective/1.5 - flat
//   * Resort inactive-> effective already IS base (no focus bonus applied)
// Example (per tile): base 6 Culture / 3 Happiness / 0 Gold -> effective with
// Resort = 9 / 6 / 1.5 -> contribution = +3 Culture / +3 Happiness / +1.5 Gold.
const NATURAL_WONDER_YIELD_PCT = 0.5;   // +50%
const RESORT_APPEALING_PER_TILE = 1;    // flat +1 Happiness / +1 Gold
function addNaturalWonderYields(acc, plotIndex, resortActive) {
  try {
    const M = NATURAL_WONDER_YIELD_PCT;
    const FLAT = RESORT_APPEALING_PER_TILE;
    const isFlatType = (t) => t === ETFI_YIELDS.HAPPINESS || t === ETFI_YIELDS.GOLD;
    const add = (t, v) => acc.set(t, (acc.get(t) || 0) + v);

    // Effective yields by type (the flat Happiness/Gold types always present so
    // the appealing bonus shows even on a tile with 0 base Gold).
    const eff = new Map();
    const raw = GameplayMap.getYields(plotIndex, GameContext.localPlayerID) || [];
    for (const [yieldType, amount] of raw) {
      if (!(amount > 0)) continue;
      const ydef = GameInfo.Yields.lookup(yieldType);
      if (ydef) eff.set(ydef.YieldType, (eff.get(ydef.YieldType) || 0) + amount);
    }
    if (!eff.has(ETFI_YIELDS.HAPPINESS)) eff.set(ETFI_YIELDS.HAPPINESS, 0);
    if (!eff.has(ETFI_YIELDS.GOLD)) eff.set(ETFI_YIELDS.GOLD, 0);

    for (const [t, amount] of eff) {
      const flat = isFlatType(t) ? FLAT : 0;
      const base = resortActive ? (amount / (1 + M) - flat) : amount;
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
  } catch {}
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
  let charming = 3;
  let breathtaking = 5;
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
      const key = `${x},${y}`;
      let isNW = false;
      try { isNW = !!GameplayMap.isNaturalWonder(x, y); } catch {}
      if (isNW) {
        const wname = naturalWonderName(x, y) || "Natural Wonder";
        if (impMap.has(key)) {
          // IMPROVED Natural Wonder tile (carries an Expedition Base). Natural
          // Wonder is its own appeal category, so the Resort grants +50% of the
          // tile's raw yields (no +1 Happiness / +1 Gold appealing bonus here).
          let entry = nwByName.get(wname);
          if (!entry) { entry = { name: wname, count: 0, yieldMap: new Map() }; nwByName.set(wname, entry); }
          entry.count++;
          addNaturalWonderYields(entry.yieldMap, idx, resortActive);
        } else {
          // Unimproved Natural Wonder tile: an eligible tile (can take an
          // Expedition Base) that isn't earning the bonus yet — list it under
          // the Unimproved category with the Expedition Base icon.
          if (!unimp.has(wname)) unimp.set(wname, { name: wname, iconId: "IMPROVEMENT_EXPEDITION_BASE", count: 0 });
          unimp.get(wname).count++;
        }
        continue;
      }
      let water = false;
      try { water = !!GameplayMap.isWater(x, y); } catch {}
      if (water) continue;
      let appeal = 0;
      try { appeal = GameplayMap.getAppeal(x, y); } catch {}
      const impAtTile = impMap.get(key);
      // A non-improved tile that has completed building(s) is a District. Query
      // its buildings per-plot so a Quarter (2 buildings on one tile, e.g. City
      // Hall + Altar on the city center) lists BOTH of them.
      const tileBuildings = impAtTile ? [] : tileBuildingsAt(x, y);
      const isDistrict = tileBuildings.length > 0;
      const resInfo = resourceAt(x, y);

      if (appeal >= breathtaking) {
        result.breathtakingTotal++;
        if (impAtTile) {
          result.breathtakingImprovements++;
          // Group breathtaking improved tiles by improvement / resource name.
          const bn = resInfo ? (resInfo.Name ? Locale.compose(resInfo.Name) : resInfo.ResourceType) : impAtTile.name;
          const bi = resInfo ? resInfo.ResourceType : impAtTile.iconId;
          if (!btImp.has(bn)) btImp.set(bn, { name: bn, iconId: bi, count: 0 });
          btImp.get(bn).count++;
        } else if (isDistrict) {
          result.breathtakingDistricts++;
          // Record this District tile's building(s) so the hover can list them
          // together on one line (a 2-building tile is a Quarter).
          btDistTiles.push(tileBuildings);
        }
      }

      // Appealing tiles are Charming OR Breathtaking. Use the lower of the two
      // thresholds as the cutoff so BOTH levels are always counted, regardless
      // of how the (age-specific) appeal parameters come back.
      if (appeal < Math.min(charming, breathtaking)) continue;
      if (impAtTile) {
        // Appealing improved tile -> +1 Happiness / +1 Gold (grouped by
        // resource/improvement name).
        const name = resInfo ? (resInfo.Name ? Locale.compose(resInfo.Name) : resInfo.ResourceType) : impAtTile.name;
        const iconId = resInfo ? resInfo.ResourceType : impAtTile.iconId;
        if (!imp.has(name)) imp.set(name, { name, iconId, count: 0 });
        imp.get(name).count++;
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
