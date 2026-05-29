// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold
//
// Overrides the base town-focus chooser item
//   Base/modules/base-standard/ui/production-chooser/town-focus-section.js
// to render ETFI info INLINE in the focus list item:
//   * yield total pills (colored), RIGHT-aligned in the name row,
//   * the detail rows in their own full-width panel BELOW the icon+info row.
//
// A custom element can only be customElements.define'd once, so we cannot
// re-register "town-focus-chooser-item". Instead we import the exported class
// and patch its prototype (render + onAttributeChanged). The base layout and
// the tooltip hook stay intact; we restructure the container to a column so the
// details panel can span the full width under the focus icon.
//
// Rendering uses only safe pieces: the real Pill component, fxs-icon,
// Locale.stylize, and the game's ticket panel CSS. NOTE: the model is SAMPLE
// data for now — this chunk validates placement/layout. Real per-focus data
// comes from the API next.

import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";

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

  // Pill(...) returns a DOM element.
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
  return line;
}

// SAMPLE model — placeholder to validate inline placement. Real per-focus data
// (from the API) replaces buildModel() next. (Second yield is preview-only.)
function buildModel(item) {
  return {
    header: [
      { yieldType: "YIELD_FOOD", value: 5 },
      { yieldType: "YIELD_GOLD", value: 2 },
    ],
    rows: [
      { iconId: "IMPROVEMENT_FARM", name: Locale.compose("LOC_MOD_ETFI_IMPROVEMENT_FARM"), count: 3, yields: [{ yieldType: "YIELD_FOOD", value: 3 }, { yieldType: "YIELD_GOLD", value: 1 }] },
      { iconId: "IMPROVEMENT_PASTURE", name: Locale.compose("LOC_MOD_ETFI_IMPROVEMENT_PASTURE"), count: 1, yields: [{ yieldType: "YIELD_FOOD", value: 1 }] },
      { iconId: "IMPROVEMENT_FISHING_BOAT_RESOURCE", name: Locale.compose("LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT"), count: 1, yields: [{ yieldType: "YIELD_FOOD", value: 1 }, { yieldType: "YIELD_GOLD", value: 1 }] },
    ],
  };
}

// --- prototype patch -------------------------------------------------------

const baseRender = TownFocusChooserItem.prototype.render;
const baseOnAttributeChanged = TownFocusChooserItem.prototype.onAttributeChanged;

TownFocusChooserItem.prototype.render = function () {
  baseRender.call(this);

  const infoContainer = this.nameElement.parentElement;
  if (!infoContainer) return;
  const container = this.container || infoContainer.parentElement;

  // 1) Colored yield pills, RIGHT-aligned in the name row (name left, pills right).
  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);
  this.nameElement.classList.add("shrink-0");
  nameRow.appendChild(this.nameElement);

  this.etfiYields = document.createElement("div");
  this.etfiYields.className = "flex flex-row flex-wrap items-center justify-end ml-auto";
  nameRow.appendChild(this.etfiYields);

  // 2) Details panel: full width, BELOW the icon+info row. Restructure the
  //    chooser item's container into a column so the panel fills the width
  //    (including under the focus icon).
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
  if (!this.etfiYields || !this.etfiDetails) return;
  const model = buildModel(this);

  while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
  for (const y of model.header || []) {
    if (y && typeof y.value === "number") this.etfiYields.appendChild(yieldPill(y));
  }

  while (this.etfiDetails.firstChild) this.etfiDetails.removeChild(this.etfiDetails.firstChild);
  for (const row of model.rows || []) {
    if (row) this.etfiDetails.appendChild(detailRow(row));
  }
};

export {};
