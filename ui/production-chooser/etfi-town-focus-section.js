// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold
//
// Overrides the base town-focus chooser item to render ETFI info INLINE:
//   * yield total pills (colored), RIGHT-aligned in the name row,
//   * separatePanel sections (their own ticket containers) ABOVE a main detail
//     panel (rows / titled sections / notes).
// Growing Town is left untouched. Dividers match the plot tooltip's look.
//
// Row = { iconId?|iconClass?+iconStyle?, name?, items?:[{iconId,name}], count?, countText?, yields?, subText? }.
// Section = { title?, rows, notes?, separatePanel? }.

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
  CULTURE_VP: "rgba(168,85,200,0.35)", // Tourism
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

// Icon element from a spec: a CSS-class icon (e.g. the appeal hex) takes
// priority, otherwise an fxs-icon by id.
function iconEl(spec) {
  if (spec && spec.iconClass) {
    const d = document.createElement("div");
    d.className = `${spec.iconClass} shrink-0`;
    if (spec.iconStyle) d.style.cssText = spec.iconStyle;
    return d;
  }
  if (spec && spec.iconId) return fxsIcon(spec.iconId, "size-5");
  return null;
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
  d.className = "font-title uppercase text-2xs text-secondary mt-1";
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

  const colored = entry.colored !== false;
  const backgroundStyle =
    colored && isColorful() && YIELD_COLORS[entry.yieldType]
      ? { "background-color": YIELD_COLORS[entry.yieldType] }
      : undefined;

  return Pill({ class: "ml-1", small: true, backgroundStyle, children: body });
}

function appendNameItem(left, spec) {
  const ic = iconEl(spec);
  if (ic) {
    left.appendChild(ic);
    left.appendChild(vDivider());
  }
  const nm = document.createElement("span");
  nm.style.cssText = "overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
  nm.textContent = spec.name ?? "";
  left.appendChild(nm);
}

function detailRow(row) {
  const line = document.createElement("div");
  line.className = "flex justify-between items-center w-full mt-1";

  const left = document.createElement("div");
  left.className = "flex items-center min-w-0";
  left.style.cssText = "flex:1 1 auto; overflow:hidden;";

  if (Array.isArray(row.items) && row.items.length) {
    row.items.forEach((it, i) => {
      if (i > 0) {
        const sep = document.createElement("span");
        sep.className = "opacity-50 mx-1 shrink-0";
        sep.textContent = "•";
        left.appendChild(sep);
      }
      appendNameItem(left, it);
    });
  } else {
    appendNameItem(left, row);
  }

  const countDisplay = row.countText != null ? row.countText : (typeof row.count === "number" ? String(row.count) : null);
  if (countDisplay != null) {
    const c = document.createElement("span");
    c.className = "opacity-70 ml-1 shrink-0";
    c.textContent = `x${countDisplay}`;
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

function appendRows(panel, rows) {
  rows.forEach((row, i) => {
    if (i > 0) panel.appendChild(hDivider());
    panel.appendChild(detailRow(row));
  });
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
  this.etfiExtra = null;
  if (!inSummary) {
    this.etfiExtra = document.createElement("div");
    this.etfiExtra.className = "w-full flex flex-col";
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
      container.appendChild(this.etfiExtra);   // separatePanel sections on top
      container.appendChild(this.etfiDetails); // main panel below
    } else {
      infoContainer.appendChild(this.etfiExtra);
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
    if (this.etfiDetails) { this.etfiDetails.classList.add("hidden"); while (this.etfiDetails.firstChild) this.etfiDetails.removeChild(this.etfiDetails.firstChild); }
    if (this.etfiExtra) { this.etfiExtra.classList.add("hidden"); while (this.etfiExtra.firstChild) this.etfiExtra.removeChild(this.etfiExtra.firstChild); }
    return;
  }

  const model = buildModel(this) || { header: [], rows: [], sections: [], notes: [] };

  while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
  for (const y of model.header || []) {
    if (y && typeof y.value === "number") this.etfiYields.appendChild(yieldPill(y));
  }
  this.etfiYields.classList.toggle("hidden", this.etfiYields.childElementCount === 0);

  if (!this.etfiDetails) return;

  const allSections = (model.sections || []).filter(Boolean);
  const mainSections = allSections.filter((s) => !s.separatePanel);
  const extraSections = allSections.filter((s) => s.separatePanel);

  // Extra panels (rendered above the main panel).
  const extra = this.etfiExtra;
  if (extra) {
    while (extra.firstChild) extra.removeChild(extra.firstChild);
    for (const section of extraSections) {
      const srows = (section.rows || []).filter(Boolean);
      const snotes = (section.notes || []).filter(Boolean);
      if (!srows.length && !snotes.length) continue;
      const p = document.createElement("div");
      p.className = "img-base-ticket-bg-container w-full flex flex-col mt-2";
      if (section.title) p.appendChild(sectionTitle(section.title));
      appendRows(p, srows);
      for (const n of snotes) p.appendChild(noteLine(n));
      extra.appendChild(p);
    }
    extra.classList.toggle("hidden", extra.childElementCount === 0);
  }

  // Main panel: flat rows, inline sections, notes.
  const panel = this.etfiDetails;
  while (panel.firstChild) panel.removeChild(panel.firstChild);
  let any = false;

  const flat = (model.rows || []).filter(Boolean);
  if (flat.length) { appendRows(panel, flat); any = true; }

  for (const section of mainSections) {
    const srows = (section.rows || []).filter(Boolean);
    const snotes = (section.notes || []).filter(Boolean);
    if (!srows.length && !snotes.length && !section.title) continue;
    if (any) panel.appendChild(hDivider());
    if (section.title) panel.appendChild(sectionTitle(section.title));
    appendRows(panel, srows);
    for (const n of snotes) panel.appendChild(noteLine(n));
    any = true;
  }

  const notes = (model.notes || []).filter(Boolean);
  if (notes.length) {
    if (any) panel.appendChild(hDivider());
    for (const n of notes) panel.appendChild(noteLine(n));
    any = true;
  }
  panel.classList.toggle("hidden", panel.childElementCount === 0);
};

export {};
