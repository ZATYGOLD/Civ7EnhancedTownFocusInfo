//Author: Zatygold
//etfi-utilities.js

import { ETFI_Settings } from "./core/settings.js";


// #region Constants

// Canonical yield IDs for this mod.
// These match the game's internal YieldType strings and are used everywhere
// in the town focus UI and logic. The object is frozen so nothing can modify
// it at runtime by mistake.
export const ETFI_YIELDS = Object.freeze({
  FOOD: "YIELD_FOOD",
  PRODUCTION: "YIELD_PRODUCTION",
  GOLD: "YIELD_GOLD",
  HAPPINESS: "YIELD_HAPPINESS",
  SCIENCE: "YIELD_SCIENCE",
  CULTURE: "YIELD_CULTURE",
  INFLUENCE: "YIELD_DIPLOMACY",
  TRADE: "YIELD_TRADES",
  FORTIFY: "ACTION_FORTIFY"
});

// Base background colors for the "pill" elements in the header.
// Each key is a YieldType string from ETFI_YIELDS. The RGBA values are
// derived from the base hex colors with baked-in transparency (alpha = 0.35)
// so the pill still looks tinted but not too harsh on the dark header bar.
const HEADER_YIELD_COLORS = Object.freeze({
  [ETFI_YIELDS.FOOD]:       "rgba(128, 179,  77, 0.35)", // #80b34d
  [ETFI_YIELDS.PRODUCTION]: "rgba(163,  61,  41, 0.35)", // #a33d29
  [ETFI_YIELDS.GOLD]:       "rgba(246, 206,  85, 0.35)", // #f6ce55
  [ETFI_YIELDS.SCIENCE]:    "rgba(108, 166, 224, 0.35)", // #6ca6e0
  [ETFI_YIELDS.CULTURE]:    "rgba( 92,  92, 214, 0.35)", // #5c5cd6
  [ETFI_YIELDS.HAPPINESS]:  "rgba(245, 153,  61, 0.35)", // #f5993d
  [ETFI_YIELDS.INFLUENCE]:  "rgba(175, 183, 207, 0.35)", // #afb7cf
  [ETFI_YIELDS.FORTIFY]:  "rgba(204, 208, 219, 0.35)", // #afb7cf
});

// Fallback pill background color if we don't recognize the yield type.
// Slightly translucent white to keep the UI readable but neutral.
const DEFAULT_HEADER_BG = "rgba(255, 255, 255, 0.25)";

// Shared inline style string for the entire header bar container.
// This controls the dark glassy background and foreground text color.
const HEADER_BAR_STYLE = "background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;";

// #endregion

// #region Logic Helpers

/**
 * Format a number with at most 1 decimal place.
 *
 * Rules:
 * - 0 stays "0"
 * - Integers render without a decimal: 1 → "1"
 * - Non-integers render with one decimal: 1.34 → "1.3", 1.36 → "1.4"
 *
 * This avoids ugly floating-point artifacts (like 1.999999) and keeps
 * the pill text compact for small header elements.
 *
 * @param {number} x - numeric value to format
 * @returns {string} formatted number string
 */
export function fmt1(x) {
  if (x === 0) return "0";
  const v = Math.round(x * 10) / 10; 
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
}

/**
 * Compute the yield multiplier based on the current game Age.
 *
 * - Starts from a base multiplier (usually 1 or 2, provided by the town rule).
 * - If the player is in the Exploration Age, add +1.
 * - If the player is in the Modern Age, add +2.
 * - Otherwise, leave the base multiplier unchanged.
 *
 * This centralizes the "per-age" scaling so each town script doesn't need to
 * duplicate the Age logic.
 *
 * @param {number} [base=1] - base multiplier before age bonuses
 * @returns {number} effective multiplier after age adjustments
 */
export function getEraMultiplier(base = 1) {
  let multiplier = base;
  const ageData = GameInfo?.Ages?.lookup?.(Game.age);
  if (!ageData) return multiplier;
  const ageType = (ageData.AgeType || "").trim();
  if (ageType === "AGE_EXPLORATION") multiplier += 1;
  else if (ageType === "AGE_MODERN") multiplier += 2;
  return multiplier;
}

/**
 * Scan the city's improvements and build a summary object for a given "logical set"
 * of improvement types (e.g., farms + pastures + plantations for Food Town).
 *
 * This function:
 * - Filters improvement instances to those whose logical free-constructible type
 *   is in `targetSet`.
 * - Groups them by a display key (with optional overrides from `displayNameMap`).
 * - Counts how many of each display key exists.
 * - Applies an era multiplier to compute the total yield effect.
 *
 * Return structure:
 * {
 *   items: [
 *     {
 *       key,        // display key used for grouping
 *       ctype,      // ConstructibleType used as icon ID
 *       iconId,     // same as ctype; used by <fxs-icon>
 *       displayName,// localized display string
 *       count       // number of instances for this group
 *     },
 *     ...
 *   ],
 *   total,         // baseTotal * eraMultiplier
 *   multiplier,    // era multiplier actually used
 *   baseCount      // total number of qualifying improvements
 * }
 *
 * @param {Object} options
 * @param {Object} options.city - city object containing Constructibles
 * @param {Set<string>} options.targetSet - logical improvement types we care about
 * @param {Object} [options.displayNameMap] - optional mapping ConstructibleType -> LOC key override
 * @param {number} [options.baseMultiplier=1] - per-improvement yield before era scaling
 * @returns {Object|null} summary object or null if nothing matched
 */
export function getImprovementSummaryForSet({ city, targetSet, displayNameMap, baseMultiplier = 1 } = {}) {
  if (!city || !city.Constructibles) return null;
  if (!(targetSet instanceof Set) || targetSet.size === 0) return null;
  if (!GameInfo?.Constructibles || !Districts || !Constructibles) return null;

  const resultByDisplayKey = Object.create(null);
  const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];

  for (const instanceId of improvements) {
    const instance = Constructibles.get(instanceId);
    if (!instance) continue;

    const location = instance.location;
    if (!location || location.x == null || location.y == null) continue;

    // Use the "free constructible" to determine the logical improvement type at this tile.
    // This respects warehouses or other mechanics that alter the tile's effective improvement.
    const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
    const fcInfo = GameInfo.Constructibles.lookup(fcID);
    if (!fcInfo) continue;

    const logicalType = fcInfo.ConstructibleType;
    if (!targetSet.has(logicalType)) continue;

    // Use the actual instance's ConstructibleType and name for display and icon.
    const info = GameInfo.Constructibles.lookup(instance.type);
    const ctype = info?.ConstructibleType || logicalType;

    // Optionally override the display key from displayNameMap; otherwise use the LOC name or type.
    const displayKey = (displayNameMap && displayNameMap[ctype]) || info?.Name || ctype;

    if (!resultByDisplayKey[displayKey]) {
      resultByDisplayKey[displayKey] = {
        key: displayKey,
        ctype,
        iconId: ctype,                 
        displayName: Locale.compose(displayKey),
        count: 0,
      };
    }
    resultByDisplayKey[displayKey].count += 1;
  }

  const items = Object.values(resultByDisplayKey);
  if (!items.length) return null;

  const baseTotal = items.reduce((sum, it) => sum + it.count, 0);
  const multiplier = baseMultiplier;
  const total = baseTotal * multiplier;

  return { items, total, multiplier, baseCount: baseTotal };
}

/**
 * Get normalized constructible records from a city by class.
 *
 * This avoids repeating:
 * - city.Constructibles.getIdsOfClass(...)
 * - Constructibles.get(...)
 * - GameInfo.Constructibles.lookup(...)
 * - instance.complete checks
 * - tile key creation
 *
 * @param {Object} city
 * @param {string} constructibleClass - "BUILDING", "IMPROVEMENT", etc.
 * @param {Object} options
 * @param {boolean} [options.completedOnly=false]
 * @returns {Array}
 */
export function getConstructibleRecordsByClass(city, constructibleClass, { completedOnly = false } = {}) {
  if (!city?.Constructibles || !Constructibles || !GameInfo?.Constructibles) {
    return [];
  }

  const ids = city.Constructibles.getIdsOfClass(constructibleClass) || [];
  const records = [];

  for (const id of ids) {
    const instance = Constructibles.get(id);
    if (!instance) continue;

    if (completedOnly && !instance.complete) continue;

    const info = GameInfo.Constructibles.lookup(instance.type);
    if (!info) continue;

    const location = instance.location ?? null;
    const hasLocation =
      location &&
      location.x !== null &&
      location.x !== undefined &&
      location.y !== null &&
      location.y !== undefined;

    records.push({
      id,
      instance,
      info,
      type: info.ConstructibleType,
      iconId: info.ConstructibleType,
      nameKey: info.Name,
      displayName: Locale.compose(info.Name),
      location,
      tileKey: hasLocation ? `${location.x},${location.y}` : null,
      complete: !!instance.complete,
    });
  }

  return records;
}

export function getCompletedBuildings(city) {
  return getConstructibleRecordsByClass(city, "BUILDING", {
    completedOnly: true,
  });
}

export function getCompletedImprovements(city) {
  return getConstructibleRecordsByClass(city, "IMPROVEMENT", {
    completedOnly: true,
  });
}

export function isWallConstructibleInfo(info) {
  const typeName = info?.ConstructibleType || "";
  return typeName.includes("WALLS") || typeName.includes("FORTIFICATION");
}

export function isWallRecord(record) {
  return isWallConstructibleInfo(record?.info);
}

export function groupBy(items, getKey) {
  const groups = new Map();

  for (const item of items || []) {
    const key = getKey(item);
    if (key === null || key === undefined || key === "") continue;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  return groups;
}

export function renderIconName({
  iconId,
  name,
  count = null,
  iconSizeClass = "size-5",
} = {}) {
  const countHtml =
    typeof count === "number"
      ? `<span class="opacity-70 ml-1">x${count}</span>`
      : "";

  return `
    <span class="inline-flex items-center gap-2 whitespace-nowrap">
      <fxs-icon data-icon-id="${iconId}" class="${iconSizeClass}"></fxs-icon>
      <span class="opacity-60">| </span>
      <span>${name}</span>
      ${countHtml}
    </span>
  `;
}

// #endregion Logic Helpers