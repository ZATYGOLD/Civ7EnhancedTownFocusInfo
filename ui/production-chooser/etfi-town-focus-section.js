// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold
//
// Overrides the base town-focus chooser to render ETFI info INLINE:
//   * yield total pills (colored), RIGHT-aligned in the name row,
//   * EVERY titled section in its own ticket panel, ordered ABOVE
//     (separatePanel:"top"), in the middle (default), or BELOW
//     (separatePanel:"bottom") a base panel holding any flat rows,
//   * top-level notes attached to the last rendered panel.
// Sections flagged `hidden` (e.g. the Unimproved categories) are shown only when
// the "View Hidden" checkbox in the town-focus section header is enabled.
// Growing Town is left untouched. Dividers match the plot tooltip's look.
//
// Row = { iconId?|iconClass?+iconStyle?, name?, items?, count?, countText?, yields?, subText?, tooltip? }.
// Section = { title?, rows, notes?, separatePanel? ("top"|"bottom"|true), hidden? }.

import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";
import { getTownCity, composeWithFallback } from "../../etfi-utilities.js";
import { ETFI_TOWN_FOCUS_TOOLTIP_STYLE } from "./town-focus-tooltip.js";
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

// Reduce the Town Focus panel width by 5%. The base CSS fixes the panel-town-
// focus width (via the focus item at 24.611rem). We override the panel to 0.95x
// and make the focus ITEMS fill 100% of the panel (minus its padding) rather
// than a fixed rem — otherwise item width + the scrollable's horizontal padding
// exceeds the panel and the right side gets clipped.
const ETFI_TOWN_FOCUS_WIDTH = 25;
(function injectWidthOverride() {
  try {
    if (document.getElementById("etfi-width-override")) return;
    const W = ETFI_TOWN_FOCUS_WIDTH;
    const style = document.createElement("style");
    style.id = "etfi-width-override";
    style.textContent =
      `panel-town-focus { width: ${W}rem !important; max-width: ${W}rem !important; }` +
      `panel-town-focus town-focus-chooser-item { width: 100% !important; }`;
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    console.error("[ETFI] width override failed", e);
  }
})();

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

function viewHidden() {
  try { return !!(ETFI_Settings && ETFI_Settings.ViewHidden); } catch { return false; }
}

function fxsIcon(iconId, sizeClass) {
  const icon = document.createElement("fxs-icon");
  icon.setAttribute("data-icon-id", iconId);
  icon.className = `${sizeClass} shrink-0`;
  return icon;
}

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
  d.className = "self-stretch shrink-0 mx-1";
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
  // Left-aligned category title with the constructible-details horizontal divider.
  const wrap = document.createElement("div");
  wrap.className = "w-full flex flex-col";
  const d = document.createElement("div");
  d.className = "font-title uppercase text-2xs text-secondary";
  d.textContent = label;
  wrap.appendChild(d);
  const div = document.createElement("div");
  div.className = "img-shell-line-divider h-1 w-full self-center my-1";
  wrap.appendChild(div);
  return wrap;
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
  // Tight icon-to-number spacing (gap-0.5 instead of gap-1).
  body.className = "flex items-center gap-0\\.5";
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

  const pill = Pill({ class: "ml-1", small: true, backgroundStyle, children: body });
  // Narrow the pill: trim the horizontal padding (the small Pill defaults to
  // px-1.5). Inline style reliably overrides the component's class.
  pill.style.paddingLeft = "0.25rem";
  pill.style.paddingRight = "0.25rem";
  return pill;
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
  // Optional hover tooltip on the name itself, with a colored "link" cue.
  if (spec.tooltip) {
    nm.setAttribute("data-tooltip-content", spec.tooltip);
    nm.setAttribute("data-tooltip-style", "none"); // suppress the item's project tooltip here
    nm.classList.add("pointer-events-auto");
    // Darker than the (secondary/gold) category title, so the two read distinctly.
    nm.style.color = "rgb(168, 133, 78)";
    nm.style.textDecoration = "underline dotted";
    nm.style.textUnderlineOffset = "0.2rem";
  }
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

function newPanel() {
  const p = document.createElement("div");
  // text-2xs makes the category-card contents (row names, counts, notes) compact.
  p.className = "img-base-ticket-bg-container w-full flex flex-col mt-2 text-2xs";
  p.style.paddingTop = "0.5rem";
  p.style.paddingBottom = "0.5rem";
  return p;
}

// Render each section into its own ticket panel inside `container`.
// Returns the last panel element created (or null).
function renderSectionPanels(container, secs) {
  while (container.firstChild) container.removeChild(container.firstChild);
  let last = null;
  for (const section of secs) {
    const srows = (section.rows || []).filter(Boolean);
    const snotes = (section.notes || []).filter(Boolean);
    if (!srows.length && !snotes.length && !section.title) continue;
    const p = newPanel();
    if (section.title) p.appendChild(sectionTitle(section.title));
    appendRows(p, srows);
    for (const n of snotes) p.appendChild(noteLine(n));
    container.appendChild(p);
    last = p;
  }
  container.classList.toggle("hidden", container.childElementCount === 0);
  return last;
}

// Fully rebuild the focus list. We reuse the base game's own refresh event (the
// same path used when the panel reopens), which rebuilds every
// town-focus-chooser-item from scratch — avoiding partial-DOM updates that
// previously garbled the layout.
function refreshFocusPanel(fromEl) {
  try {
    const panel = (fromEl && (fromEl.closest?.("panel-town-focus") || fromEl.getRootNode?.()?.querySelector?.("panel-town-focus")))
      || document.querySelector("panel-town-focus");
    if (panel) {
      panel.dispatchEvent(new CustomEvent("panel-town-focus-refresh", { bubbles: false, cancelable: true }));
    }
  } catch (e) {
    console.error("[ETFI] refreshFocusPanel failed", e);
  }
}

// --- module-level focus-change listener ------------------------------------
//
// When the player picks a focus, the base panel collapses the chooser (so the
// items DETACH), and the new project/yield state isn't committed until after
// the CityGrowthModeChanged event fires. A per-item listener would be torn down
// before it could re-render. Instead we keep ONE persistent listener at module
// scope that, on any growth/yield change, rebuilds the whole focus list (the
// same full rebuild that closing+reopening the panel performs).
//
// We ALSO refresh the production panel's city yield bar: the base game's
// onCityGrowthModeChanged handler refreshes the focus section and item list but
// never calls updateCityYieldBar(), so the top yield numbers stay stale until
// the panel is reopened. We force that refresh here. Recomputed yields can lag a
// frame after the event, so we run it on a short delay (and again, to be safe).
function refreshProductionYieldBar() {
  try {
    const el = document.querySelector("panel-production-chooser");
    const comp = el && (el.maybeComponent || el.component);
    if (comp && typeof comp.updateCityYieldBar === "function") {
      comp.updateCityYieldBar();
    }
  } catch {}
}

let etfiPanelRefreshTimer = null;
function scheduleFocusPanelRebuild() {
  try {
    if (etfiPanelRefreshTimer) clearTimeout(etfiPanelRefreshTimer);
    etfiPanelRefreshTimer = setTimeout(() => {
      etfiPanelRefreshTimer = null;
      // Only act when the production/town-focus panel is present (city panel open).
      if (document.querySelector("panel-town-focus")) refreshFocusPanel(null);
      refreshProductionYieldBar();
    }, 0);
    // Yields can recompute a frame later than the event; refresh again shortly.
    setTimeout(refreshProductionYieldBar, 120);
  } catch {}
}
try { engine.on("CityGrowthModeChanged", scheduleFocusPanelRebuild); } catch {}
try { engine.on("CityYieldChanged", scheduleFocusPanelRebuild); } catch {}

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

// --- "View Hidden" checkbox in the Town Focus CTA header -------------------
//
// The panel's instructions line (LOC_UI_TOWN_FOCUS_CTA, "Choose a Town Focus:
// Towns without a Growing Town Focus...") sits above the focus list. We wrap it
// in a row and add a "View Hidden" checkbox to its right. The PanelTownFocus
// class isn't exported, so we locate the CTA element by walking up from a focus
// item and inject the checkbox once per panel.
function ensureViewHiddenToggle(fromEl) {
  try {
    const panel = fromEl.closest?.("panel-town-focus") || fromEl.getRootNode?.()?.querySelector?.("panel-town-focus");
    // Constrain the panel width directly (in addition to the injected CSS).
    if (panel) {
      try { panel.style.width = `${ETFI_TOWN_FOCUS_WIDTH}rem`; panel.style.maxWidth = `${ETFI_TOWN_FOCUS_WIDTH}rem`; } catch {}
    }
    const scope = panel || document;
    const cta = scope.querySelector('[data-l10n-id="LOC_UI_TOWN_FOCUS_CTA"]');
    if (!cta || cta.dataset.etfiToggleAttached === "1") return;

    const host = cta.parentElement;
    if (!host) return;
    cta.dataset.etfiToggleAttached = "1";

    // Wrap the CTA in a relative, full-width row so the description stays
    // centered exactly as before; the toggle is positioned absolutely on the
    // right so it does NOT shift the centered text.
    const row = document.createElement("div");
    row.className = "relative flex flex-row items-center justify-center w-full mb-2";
    host.replaceChild(row, cta);

    cta.classList.remove("mb-2");
    row.appendChild(cta);

    const toggle = document.createElement("div");
    toggle.className = "absolute top-1\\/2 flex flex-row items-center";
    // Nudge in from the right edge so it isn't flush against the frame.
    toggle.style.right = ".75rem";
    toggle.style.transform = "translateY(-50%)";

    const label = document.createElement("div");
    label.className = "text-xs mr-1 whitespace-nowrap text-accent-2";
    label.textContent = composeWithFallback("LOC_MOD_ETFI_VIEW_HIDDEN", "View Hidden");
    toggle.appendChild(label);

    const checkbox = document.createElement("fxs-checkbox");
    checkbox.setAttribute("selected", viewHidden() ? "true" : "false");
    checkbox.addEventListener("component-value-changed", (e) => {
      const v = !!(e && e.detail && e.detail.value);
      try { ETFI_Settings.ViewHidden = v; } catch {}
      refreshFocusPanel(checkbox);
    });
    toggle.appendChild(checkbox);

    row.appendChild(toggle);
  } catch (err) {
    console.error("[ETFI] view-hidden toggle failed", err);
  }
}

// --- prototype patch -------------------------------------------------------

const baseRender = TownFocusChooserItem.prototype.render;
const baseOnAttributeChanged = TownFocusChooserItem.prototype.onAttributeChanged;
const baseOnAttach = TownFocusChooserItem.prototype.onAttach;

TownFocusChooserItem.prototype.onAttach = function () {
  if (baseOnAttach) baseOnAttach.call(this);
  // Now that the item is in the DOM, ensure the panel has the View Hidden toggle.
  ensureViewHiddenToggle(this.Root);
};

TownFocusChooserItem.prototype.render = function () {
  baseRender.call(this);

  // Point the item at our own copy of the project tooltip (registered under a
  // unique style) instead of the base "production-project-tooltip", so the Town
  // Focus tooltip can be customized without affecting the shared base type.
  try { this.Root.dataset.tooltipStyle = ETFI_TOWN_FOCUS_TOOLTIP_STYLE; } catch {}

  if (isGrowthFocus(this.Root)) return;

  // Back-reference so the View Hidden toggle can re-render every item.
  this.Root.__etfiItem = this;

  const infoContainer = this.nameElement.parentElement;
  if (!infoContainer) return;
  const container = this.container || infoContainer.parentElement;

  // Shrink the focus description text (base styles it text-sm) to be more compact.
  try {
    if (this.descriptionElement) {
      this.descriptionElement.classList.remove("text-sm");
      this.descriptionElement.classList.add("text-2xs");
      this.descriptionElement.style.lineHeight = "1.25";
    }
  } catch {}

  const inSummary = !!this.Root.closest("town-focus-section");

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);
  this.nameElement.classList.add("shrink-0");
  nameRow.appendChild(this.nameElement);

  this.etfiYields = document.createElement("div");
  this.etfiYields.className = "flex flex-row flex-wrap items-center justify-end ml-auto";
  nameRow.appendChild(this.etfiYields);

  this.etfiTop = null;
  this.etfiDetails = null;
  this.etfiBottom = null;
  if (!inSummary) {
    this.etfiTop = document.createElement("div");
    this.etfiTop.className = "w-full flex flex-col";
    this.etfiDetails = document.createElement("div");
    this.etfiDetails.className = "img-base-ticket-bg-container w-full flex flex-col mt-2 text-2xs";
    this.etfiDetails.style.paddingTop = "0.5rem";
    this.etfiDetails.style.paddingBottom = "0.5rem";
    this.etfiBottom = document.createElement("div");
    this.etfiBottom.className = "w-full flex flex-col";
    if (container) {
      const topRow = document.createElement("div");
      topRow.className = "flex flex-row w-full";
      // Shrink the focus icon (base is size-16 = 4rem) for a more compact card.
      try {
        this.projectIconElement.classList.remove("size-16");
        this.projectIconElement.classList.add("size-12");
      } catch {}
      topRow.appendChild(this.projectIconElement);
      topRow.appendChild(infoContainer);
      container.classList.remove("flex-row");
      container.classList.add("flex-col", "w-full");
      // The base container uses p-3 (0.75rem) all sides; trim the horizontal
      // padding so the focus icon sits closer to the left edge of the card.
      try { container.style.paddingLeft = "0.35rem"; container.style.paddingRight = "0.35rem"; } catch {}
      container.appendChild(topRow);
      container.appendChild(this.etfiTop);
      container.appendChild(this.etfiDetails);
      container.appendChild(this.etfiBottom);
    } else {
      infoContainer.appendChild(this.etfiTop);
      infoContainer.appendChild(this.etfiDetails);
      infoContainer.appendChild(this.etfiBottom);
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
    for (const el of [this.etfiTop, this.etfiDetails, this.etfiBottom]) {
      if (el) { el.classList.add("hidden"); while (el.firstChild) el.removeChild(el.firstChild); }
    }
    return;
  }

  const model = buildModel(this) || { header: [], rows: [], sections: [], notes: [] };

  // Header pills next to the focus name. Merge duplicate yield types into one
  // pill by summing their values (first-seen order is preserved).
  while (this.etfiYields.firstChild) this.etfiYields.removeChild(this.etfiYields.firstChild);
  const headerMerged = [];
  const headerByType = new Map();
  for (const y of model.header || []) {
    if (!y || typeof y.value !== "number") continue;
    const existing = headerByType.get(y.yieldType);
    if (existing) {
      existing.value += y.value;
      if (y.colored === false) existing.colored = false;
    } else {
      const entry = { ...y };
      headerByType.set(y.yieldType, entry);
      headerMerged.push(entry);
    }
  }
  for (const y of headerMerged) {
    this.etfiYields.appendChild(yieldPill(y));
  }
  this.etfiYields.classList.toggle("hidden", this.etfiYields.childElementCount === 0);

  if (!this.etfiDetails) return;

  // Drop hidden sections unless "View Hidden" is enabled.
  const show = viewHidden();
  const sections = (model.sections || []).filter(Boolean).filter((s) => show || !s.hidden);
  const topSecs = sections.filter((s) => s.separatePanel === "top" || s.separatePanel === true);
  const bottomSecs = sections.filter((s) => s.separatePanel === "bottom");
  const midSecs = sections.filter((s) => !s.separatePanel);
  const flat = (model.rows || []).filter(Boolean);
  const notes = (model.notes || []).filter(Boolean);

  // Top zone: top sections, each its own panel.
  const lastTop = renderSectionPanels(this.etfiTop, topSecs);

  // Base panel: any flat (untitled) rows.
  const base = this.etfiDetails;
  while (base.firstChild) base.removeChild(base.firstChild);
  if (flat.length) appendRows(base, flat);
  base.classList.toggle("hidden", base.childElementCount === 0);

  // Bottom zone: middle (default) sections then bottom sections, each its own panel.
  const lastBottom = renderSectionPanels(this.etfiBottom, [...midSecs, ...bottomSecs]);

  // Top-level notes attach to the last rendered panel (falling back to base).
  if (notes.length) {
    let host = lastBottom || (base.childElementCount ? base : null) || lastTop;
    if (!host) host = base;
    for (const n of notes) host.appendChild(noteLine(n));
    host.classList.remove("hidden");
  }
};

export {};
