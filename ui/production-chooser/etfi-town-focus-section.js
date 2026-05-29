// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold
//
// Overrides the base town-focus chooser item to render ETFI info INLINE:
//   * yield total pills (colored), RIGHT-aligned in the name row,
//   * detail rows / titled sections / notes in their own full-width panel BELOW
//     the icon+info row (selection list only; the summary shows pills only).
// Growing Town is left untouched. Dividers match the plot tooltip's look.
//
// Model: { header:[{yieldType,value}], rows:[row], sections:[{title,rows}],
//          notes:[stylized] }  where row = { iconId?, name, count?, yields?, subText? }.

import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";
import { getTownCity } from "../../etfi-utilities.js";
import { buildFoodModel } from "../etfi-town-focus/farm-fish-towns.js";
import { buildMiningModel } from "../etfi-town-focus/mining-town.js";
import { buildTradeModel } from "../etfi-town-focus/trade-town.js";
import { buildHubModel } from "../etfi-town-focus/hub-town.js";
import { buildTempleModel } from "../etfi-town-focus/temple-town.js";
import { buildUrbanModel } from "../etfi-town-focus/urban-town.js";
import { buildFortModel } from "../etfi-town-focus/fort-town.js";
import { buildResortModel } from "../etfi-town-focus/resort-town.js";
import { buildFactoryModel } from "../etfi-town-focus/factory-town.js";

const DIVIDER_COLOR = "rgba(77, 83, 102, 0.7)";

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

function vDivider() {
  const d = document.createElement("div");
  d.className = "self-stretch shrink-0 mx-2";
  d.style.cssText = `width:0.0625rem; background-color:${DIVIDER_COLOR};`;
  return d;
}

function hDivider() {
  const d = document.createElement("div");
  d.className = "w-full shrink-0 my-1";
  d.style.cssText = `height:0.0625rem; background-color:${DIVIDER_COLOR};`;
  return d;
}

function sectionTitle(label) {
  const d = document.createElement("div");
  d.className = "font-title uppercase text-2xs text-secondary mt-1 mb-0\\.5";
  d.textContent = label;
  return d;
}

function noteLine(text) {
  const p = document.createElement("p");
  p.className = "mt-1 opacity-80";
  p.style.fontSize = "0.85em";
  p.innerHTML = Locale.stylize(text);
  return p;
}

function isGrowthFocus(root) {
  const gt = root.getAttribute("data-growth-type");
  const growthType = gt != null && gt !== "" ? parseInt(gt) : null;
  if (typeof GrowthTypes !== "undefined" && growthType === GrowthTypes.EXPAND) return true;
  const pt = root.getAttribute("data-project-type");
  const projectType = pt != null && pt !== "" ? parseInt(pt) : null;
  if (typeof ProjectTypes !== "undefined" && projectType === ProjectTypes.NO_PROJECT) return true;
  return false;
}

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
  if (row.iconId) {
    left.appendChild(fxsIcon(row.iconId, "size-5"));
    left.appendChild(vDivider());
  }
  const name = document.createElement("span");
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

// --- prototype patch -------------------------------------------------------

const baseRender = TownFocusChooserItem.prototype.render;
const baseOnAttributeChanged = TownFocusChooserItem.prototype.onAttributeChanged;

TownFocusChooserItem.prototype.render = function () {
  baseRender.call(this);

  if (isGrowthFocus(this.Root)) return;

  const infoContainer = this.nameElement.parentElement;
  if (!infoContainer) return;
  const container = this.container || infoContainer.parentElement;

  const inSummary = !!this.Root.closest("town-focus-section");

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);
  this.nameElement.classList.add("shrink-0");
  nameRow.appendChild(this.nameElement);

  this.etfiYields = document.createElement("div");
  this.etfiYields.className = "flex flex-row flex-wrap items-center justify-end ml-auto";
  nameRow.appendChild(this.etfiYields);

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

  if (isGrowthFocus(this.Root)) {
    this.etfiYields.classList.add("hidden");
    while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
    if (this.etfiDetails) {
      this.etfiDetails.classList.add("hidden");
      while (this.etfiDetails.firstChild) this.etfiDetails.removeChild(this.etfiDetails.firstChild);
    }
    return;
  }

  const model = buildModel(this) || { header: [], rows: [], sections: [], notes: [] };

  // Header pills.
  while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
  for (const y of model.header || []) {
    if (y && typeof y.value === "number") this.etfiYields.appendChild(yieldPill(y));
  }
  this.etfiYields.classList.toggle("hidden", this.etfiYields.childElementCount === 0);

  if (!this.etfiDetails) return;

  // Body: flat rows, then titled sections, then notes — divided between blocks.
  const panel = this.etfiDetails;
  while (panel.firstChild) panel.removeChild(panel.firstChild);
  let any = false;

  const appendRows = (rows) => {
    rows.forEach((row, i) => {
      if (i > 0) panel.appendChild(hDivider());
      panel.appendChild(detailRow(row));
    });
  };

  const flat = (model.rows || []).filter(Boolean);
  if (flat.length) {
    appendRows(flat);
    any = true;
  }

  for (const section of model.sections || []) {
    if (!section) continue;
    const srows = (section.rows || []).filter(Boolean);
    if (!srows.length && !section.title) continue;
    if (any) panel.appendChild(hDivider());
    if (section.title) panel.appendChild(sectionTitle(section.title));
    appendRows(srows);
    any = true;
  }

  const notes = (model.notes || []).filter(Boolean);
  if (notes.length) {
    if (any) panel.appendChild(hDivider());
    for (const note of notes) panel.appendChild(noteLine(note));
    any = true;
  }

  panel.classList.toggle("hidden", panel.childElementCount === 0);
};

export {};
