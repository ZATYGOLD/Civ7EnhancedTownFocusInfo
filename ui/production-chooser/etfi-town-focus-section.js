// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold

import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { ProductionChooserAccordionSection } from "/base-standard/ui/production-chooser/production-chooser-accordion.js";
import { getTownCity } from "../../etfi-utilities.js";
import { ETFI_TOWN_FOCUS_TOOLTIP_STYLE } from "./town-focus-tooltip.js";
import {
  DIVIDER_COLOR,
  yieldPill,
  noteLine,
  appendRows,
  renderSectionPanels,
  ETFI_SECTION_CFG,
} from "../etfi-details/etfi-render.js";
import { buildFoodModel } from "../etfi-town-focus/farm-fish-towns.js";
import { buildMiningModel } from "../etfi-town-focus/mining-town.js";
import { buildTradeModel } from "../etfi-town-focus/trade-town.js";
import { buildHubModel } from "../etfi-town-focus/hub-town.js";
import { buildTempleModel } from "../etfi-town-focus/temple-town.js";
import { buildUrbanModel } from "../etfi-town-focus/urban-town.js";
import { buildFortModel } from "../etfi-town-focus/fort-town.js";
import { buildResortModel } from "../etfi-town-focus/resort-town.js";
import { buildFactoryModel } from "../etfi-town-focus/factory-town.js";

// Monotonic counter for unique accordion element ids (one per focus card).
let etfiAccordionSeq = 0;

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

function isGrowthFocus(root) {
  const gt = root.getAttribute("data-growth-type");
  const growthType = gt != null && gt !== "" ? parseInt(gt) : null;
  if (typeof GrowthTypes !== "undefined" && growthType === GrowthTypes.EXPAND) return true;
  const pt = root.getAttribute("data-project-type");
  const projectType = pt != null && pt !== "" ? parseInt(pt) : null;
  if (typeof ProjectTypes !== "undefined" && projectType === ProjectTypes.NO_PROJECT) return true;
  return false;
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

// --- panel width constraint ------------------------------------------------

// Constrain the Town Focus panel width directly (in addition to the injected
// CSS override) once an item is attached and can reach its host panel.
function constrainPanelWidth(fromEl) {
  try {
    const panel = fromEl.closest?.("panel-town-focus") || fromEl.getRootNode?.()?.querySelector?.("panel-town-focus");
    if (panel) {
      try { panel.style.width = `${ETFI_TOWN_FOCUS_WIDTH}rem`; panel.style.maxWidth = `${ETFI_TOWN_FOCUS_WIDTH}rem`; } catch {}
    }
  } catch (err) {
    console.error("[ETFI] panel width constraint failed", err);
  }
}

// Hide the inline focus description and surface it as a hover tooltip on the
// focus name instead. data-tooltip-style="none" suppresses the item's rich
// project tooltip for the name element, so hovering the name shows just the
// description text. Idempotent — safe to call on every render/update (and
// re-asserted in etfiUpdate because data-description can arrive after the
// first render, and the summary item is reused across focus changes).
function applyNameDescriptionTooltip(item) {
  const nameEl = item.nameElement;
  if (!nameEl) return;
  try {
    if (item.descriptionElement) {
      item.descriptionElement.classList.add("hidden");
      // Inline display:none as well — a class alone can be overridden by the
      // element's other display utilities in some render paths.
      item.descriptionElement.style.display = "none";
    }
    const descKey = item.Root.getAttribute("data-description");
    if (descKey) {
      nameEl.setAttribute("data-tooltip-content", Locale.compose(descKey));
      nameEl.setAttribute("data-tooltip-style", "none");
      nameEl.classList.add("pointer-events-auto");
    }
  } catch {}
}

// --- prototype patch -------------------------------------------------------

const baseRender = TownFocusChooserItem.prototype.render;
const baseOnAttributeChanged = TownFocusChooserItem.prototype.onAttributeChanged;
const baseOnAttach = TownFocusChooserItem.prototype.onAttach;

TownFocusChooserItem.prototype.onAttach = function () {
  if (baseOnAttach) baseOnAttach.call(this);
  // Now that the item is in the DOM, pin the panel width.
  constrainPanelWidth(this.Root);
};

TownFocusChooserItem.prototype.render = function () {
  baseRender.call(this);

  try { this.Root.dataset.tooltipStyle = ETFI_TOWN_FOCUS_TOOLTIP_STYLE; } catch {}

  const growth = isGrowthFocus(this.Root);

  // Inline description hidden; shown as a hover tooltip on the focus name.
  applyNameDescriptionTooltip(this);

  // Growing Town keeps the base card layout — no yield pills, detail panels, or
  // name-row restructuring.
  if (growth) return;

  const infoContainer = this.nameElement.parentElement;
  if (!infoContainer) return;
  const container = this.container || infoContainer.parentElement;

  const inSummary = !!this.Root.closest("town-focus-section");

  // Shrink the focus icon (base is size-16 = 4rem) for a more compact card.
  try {
    this.projectIconElement.classList.remove("size-16");
    this.projectIconElement.classList.add("size-12");
  } catch {}

  try {
    infoContainer.classList.remove("flex-initial");
    infoContainer.style.flex = "1 1 auto";
    infoContainer.style.minWidth = "0";
  } catch {}

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);

  this.nameElement.classList.add("text-left");
  this.nameElement.style.flex = "1 1 auto";
  this.nameElement.style.minWidth = "0";
  this.nameElement.style.overflow = "hidden";
  this.nameElement.style.textOverflow = "ellipsis";
  this.nameElement.style.whiteSpace = "nowrap";

  this.etfiYields = document.createElement("div");
  this.etfiYields.className = "flex flex-row flex-wrap items-center justify-end shrink-0";

  nameRow.append(this.nameElement, this.etfiYields);

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

    // Wrap all of the detail panels in a collapsible "Details" accordion (the
    // game's own ProductionChooserAccordionSection — rotating chevron, list-bg
    // header, animated height). Collapsed by default. etfiUpdate() keeps
    // refilling etfiTop/etfiDetails/etfiBottom in place inside the slot, so the
    // inner formatting is unchanged — only the show/hide wrapper is new.
    // Title is applied via data-l10n-id inside the accordion, so pass the raw
    // LOC key (resolved by the localization system, not pre-composed text).
    this.etfiAccordion = new ProductionChooserAccordionSection(
      `etfi-details-${++etfiAccordionSeq}`,
      "LOC_MOD_ETFI_DETAILS",
      false
    );
    // Group the clickable header and the panels it reveals into ONE cohesive
    // container so the dropdown doesn't read as a floating header above loose
    // panels. We:
    //   * drop the base ml-4 indent so it aligns with the compact card,
    //   * remove the header's mb-2 gap so the content sits flush beneath it,
    //   * give the whole accordion a shared background + subtle border frame
    //     with rounded corners (overflow-hidden clips the header art to match).
    const acc = this.etfiAccordion;
    acc.root.classList.remove("ml-4");
    acc.header.classList.remove("mb-2");
    acc.root.style.borderRadius = "0.3333333333rem";
    acc.root.style.overflow = "hidden";
    acc.root.style.border = `0.0625rem solid ${DIVIDER_COLOR}`;
    acc.root.style.backgroundColor = "rgba(0, 0, 0, 0.22)";
    // Small inset so the revealed panels don't butt up against the frame.
    acc.slot.style.paddingLeft = "0.3rem";
    acc.slot.style.paddingRight = "0.3rem";
    acc.slot.style.paddingBottom = "0.35rem";
    acc.slot.append(this.etfiTop, this.etfiDetails, this.etfiBottom);

    if (container) {
      const topRow = document.createElement("div");
      topRow.className = "flex flex-row w-full";
      topRow.appendChild(this.projectIconElement);
      topRow.appendChild(infoContainer);
      container.classList.remove("flex-row");
      container.classList.add("flex-col", "w-full");
      // The base container uses p-3 (0.75rem) all sides; trim the horizontal
      // padding so the focus icon sits closer to the left edge of the card.
      try { container.style.paddingLeft = "0.35rem"; container.style.paddingRight = "0.35rem"; } catch {}
      container.appendChild(topRow);
      container.appendChild(this.etfiAccordion.root);
    } else {
      infoContainer.appendChild(this.etfiAccordion.root);
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
  const growth = isGrowthFocus(this.Root);

  // Inline description hidden; shown as a hover tooltip on the focus name.
  applyNameDescriptionTooltip(this);

  if (!this.etfiYields) return;

  if (growth) {
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

  const sections = (model.sections || []).filter(Boolean);
  const topSecs = sections.filter((s) => s.separatePanel === "top" || s.separatePanel === true);
  const bottomSecs = sections.filter((s) => s.separatePanel === "bottom");
  const midSecs = sections.filter((s) => !s.separatePanel);
  const flat = (model.rows || []).filter(Boolean);
  const notes = (model.notes || []).filter(Boolean);

  // Top zone: top sections, each its own panel.
  const lastTop = renderSectionPanels(this.etfiTop, topSecs, ETFI_SECTION_CFG);

  // Base panel: any flat (untitled) rows.
  const base = this.etfiDetails;
  while (base.firstChild) base.removeChild(base.firstChild);
  if (flat.length) appendRows(base, flat, ETFI_SECTION_CFG);
  base.classList.toggle("hidden", base.childElementCount === 0);

  // Bottom zone: middle (default) sections then bottom sections, each its own panel.
  const lastBottom = renderSectionPanels(this.etfiBottom, [...midSecs, ...bottomSecs], ETFI_SECTION_CFG);

  // Top-level notes attach to the last rendered panel (falling back to base).
  if (notes.length) {
    let host = lastBottom || (base.childElementCount ? base : null) || lastTop;
    if (!host) host = base;
    for (const n of notes) host.appendChild(noteLine(n));
    host.classList.remove("hidden");
  }
};

export {};
