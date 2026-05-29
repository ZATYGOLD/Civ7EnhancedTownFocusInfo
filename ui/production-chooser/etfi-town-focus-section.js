// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold
//
// Overrides the base town-focus chooser item to render ETFI info INLINE:
//   * yield total pills (colored), RIGHT-aligned in the name row,
//   * the detail rows in their own full-width panel BELOW the icon+info row
//     (selection list only; the production summary shows pills only).
// The default "Growing Town" focus is left untouched (custom treatment TBD).
//
// A custom element can't be re-defined, so we patch the exported class's
// prototype. Per-focus data comes from the model builders (which use the
// etfi-utilities API); this file just dispatches by project type and renders.

import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";
import { getTownCity } from "../../etfi-utilities.js";
import { buildFoodModel } from "../etfi-town-focus/farm-fish-towns.js";
import { buildMiningModel } from "../etfi-town-focus/mining-town.js";
import { buildTradeModel } from "../etfi-town-focus/trade-town.js";
import { buildHubModel } from "../etfi-town-focus/hub-town.js";

const YIELD_COLORS = {
  YIELD_FOOD: "rgba(128,179,77,0.35)",
  YIELD_PRODUCTION: "rgba(163,61,41,0.35)",
  YIELD_GOLD: "rgba(246,206,85,0.35)",
  YIELD_SCIENCE: "rgba(108,166,224,0.35)",
  YIELD_CULTURE: "rgba(92,92,214,0.35)",
  YIELD_HAPPINESS: "rgba(245,153,61,0.35)",
  YIELD_DIPLOMACY: "rgba(175,183,207,0.35)",
};

function fmt(v) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}

function isColorful() {
  try { return !!(ETFI_Settings && ETFI_Settings.IsColorful); } catch { return false; }
}

function fxsIcon(iconId, sizeClass) {
  const icon = document.createElement("fxs-icon");
  icon.setAttribute("data-icon-id", iconId);
  icon.className = `${sizeClass} shrink-0`;
  return icon;
}

// The default "Growing Town" focus gets its own treatment later — no standard
// ETFI UI for it.
function isGrowthFocus(root) {
  const gt = root.getAttribute("data-growth-type");
  const growthType = gt != null && gt !== "" ? parseInt(gt) : null;
  if (typeof GrowthTypes !== "undefined" && growthType === GrowthTypes.EXPAND) return true;
  const pt = root.getAttribute("data-project-type");
  const projectType = pt != null && pt !== "" ? parseInt(pt) : null;
  if (typeof ProjectTypes !== "undefined" && projectType === ProjectTypes.NO_PROJECT) return true;
  return false;
}

// Compact colored Pill (icon + value) for the name-row yield totals.
function yieldPill(entry) {
  const body = document.createElement("div");
  body.className = "flex items-center gap-1";
  body.appendChild(fxsIcon(entry.yieldType, "size-4"));
  const span = document.createElement("span");
  span.className = "font-semibold text-xs";
  span.textContent = `+${fmt(entry.value)}`;
  body.appendChild(span);

  const backgroundStyle =
    isColorful() && YIELD_COLORS[entry.yieldType]
      ? { "background-color": YIELD_COLORS[entry.yieldType] }
      : undefined;

  return Pill({ class: "ml-1", small: true, backgroundStyle, children: body });
}

function detailRow(row) {
  const line = document.createElement("div");
  line.className = "flex justify-between items-center w-full mt-1";

  const left = document.createElement("div");
  left.className = "flex items-center min-w-0";
  left.style.cssText = "flex:1 1 auto; overflow:hidden;";
  if (row.iconId) left.appendChild(fxsIcon(row.iconId, "size-5"));
  const name = document.createElement("span");
  name.className = "ml-1";
  name.style.cssText = "overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
  name.textContent = row.name ?? "";
  left.appendChild(name);
  if (typeof row.count === "number") {
    const c = document.createElement("span");
    c.className = "opacity-70 ml-1 shrink-0";
    c.textContent = `x${row.count}`;
    left.appendChild(c);
  }

  const right = document.createElement("div");
  right.className = "flex items-center justify-end flex-wrap shrink-0";
  for (const y of row.yields || []) {
    if (!y || typeof y.value !== "number") continue;
    right.appendChild(yieldPill(y));
  }

  line.append(left, right);

  if (row.subText) {
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col w-full";
    wrap.appendChild(line);
    const sub = document.createElement("div");
    sub.className = "ml-6 opacity-70";
    sub.style.fontSize = "0.85em";
    sub.textContent = row.subText;
    wrap.appendChild(sub);
    return wrap;
  }
  return line;
}

// --- model dispatch --------------------------------------------------------

function projectTypeString(root) {
  const pt = root.getAttribute("data-project-type");
  const projectType = pt != null && pt !== "" ? parseInt(pt) : null;
  if (projectType == null || Number.isNaN(projectType)) return null;
  try { return GameInfo?.Projects?.lookup?.(projectType)?.ProjectType ?? null; } catch { return null; }
}

function buildModel(item) {
  const city = getTownCity();
  if (!city) return null;
  switch (projectTypeString(item.Root)) {
    case "PROJECT_TOWN_GRANARY":
    case "PROJECT_TOWN_FISHING":
      return buildFoodModel(city);
    case "PROJECT_TOWN_PRODUCTION":
      return buildMiningModel(city);
    case "PROJECT_TOWN_TRADE":
      return buildTradeModel(city);
    case "PROJECT_TOWN_INN":
      return buildHubModel(city);
    default:
      return null; // focuses not yet implemented (next batch)
  }
}

// --- prototype patch -------------------------------------------------------

const baseRender = TownFocusChooserItem.prototype.render;
const baseOnAttributeChanged = TownFocusChooserItem.prototype.onAttributeChanged;

TownFocusChooserItem.prototype.render = function () {
  baseRender.call(this);

  // Growing Town (default growth) focus gets its own treatment later — no
  // standard ETFI UI at all. Leave the base item untouched. (etfiUpdate
  // re-checks in case the focus type is only known after the first render.)
  if (isGrowthFocus(this.Root)) return;

  const infoContainer = this.nameElement.parentElement;
  if (!infoContainer) return;
  const container = this.container || infoContainer.parentElement;

  // The item is reused in the production-panel SUMMARY (inside a
  // <town-focus-section>) and the focus SELECTION list. The detail panel only
  // shows in the selection list; the summary gets just the pills.
  const inSummary = !!this.Root.closest("town-focus-section");

  // Colored yield pills, RIGHT-aligned in the name row (both contexts).
  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);
  this.nameElement.classList.add("shrink-0");
  nameRow.appendChild(this.nameElement);

  this.etfiYields = document.createElement("div");
  this.etfiYields.className = "flex flex-row flex-wrap items-center justify-end ml-auto";
  nameRow.appendChild(this.etfiYields);

  // Details panel: selection list only; full width below the icon+info row.
  this.etfiDetails = null;
  if (!inSummary) {
    this.etfiDetails = document.createElement("div");
    this.etfiDetails.className = "img-base-ticket-bg-container w-full flex flex-col mt-2";
    if (container) {
      const topRow = document.createElement("div");
      topRow.className = "flex flex-row w-full";
      topRow.appendChild(this.projectIconElement);
      topRow.appendChild(infoContainer);
      container.classList.remove("flex-row");
      container.classList.add("flex-col", "w-full");
      container.appendChild(topRow);
      container.appendChild(this.etfiDetails);
    } else {
      infoContainer.appendChild(this.etfiDetails);
    }
  }

  this.etfiUpdate();
};

TownFocusChooserItem.prototype.onAttributeChanged = function (name, oldValue, newValue) {
  baseOnAttributeChanged.call(this, name, oldValue, newValue);
  if (
    name === "data-project-type" ||
    name === "data-growth-type" ||
    name === "data-name" ||
    name === "data-description"
  ) {
    this.etfiUpdate();
  }
};

TownFocusChooserItem.prototype.etfiUpdate = function () {
  if (!this.etfiYields) return;

  // Growing Town focus: blank the ETFI UI (its attributes may arrive late).
  if (isGrowthFocus(this.Root)) {
    this.etfiYields.classList.add("hidden");
    while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
    if (this.etfiDetails) {
      this.etfiDetails.classList.add("hidden");
      while (this.etfiDetails.firstChild) this.etfiDetails.removeChild(this.etfiDetails.firstChild);
    }
    return;
  }

  const model = buildModel(this) || { header: [], rows: [] };

  while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
  for (const y of model.header || []) {
    if (y && typeof y.value === "number") this.etfiYields.appendChild(yieldPill(y));
  }
  this.etfiYields.classList.toggle("hidden", this.etfiYields.childElementCount === 0);

  if (this.etfiDetails) {
    while (this.etfiDetails.firstChild) this.etfiDetails.removeChild(this.etfiDetails.firstChild);
    for (const row of model.rows || []) {
      if (row) this.etfiDetails.appendChild(detailRow(row));
    }
    this.etfiDetails.classList.toggle("hidden", this.etfiDetails.childElementCount === 0);
  }
};

export {};
