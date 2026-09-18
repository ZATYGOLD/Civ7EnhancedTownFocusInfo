// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/production-chooser/etfi-town-focus-section.js
//
// Author: Zatygold

import { ComponentUtilities } from "/core/ui-next/utilities/component-utilities.js";
import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { TownFocusRefreshEvent } from "/base-standard/ui/production-chooser/panel-town-focus.js";
import { getTownCity, composeWithFallback, isGrowthFocusEl } from "../utilities/etfi-utilities.js";
import { getHideDetails, setHideDetails } from "../etfi-details/etfi-view-state.js";
import { ETFI_TOWN_FOCUS_TOOLTIP_STYLE } from "./town-focus-tooltip.js";
import {
  yieldPill,
  noteLine,
  appendRows,
  appendPillRows,
  renderSectionPanels,
  splitSectionsByPanel,
  clearChildren,
  ETFI_SECTION_CFG,
} from "../etfi-details/etfi-render.js";
import { buildFocusModel } from "../etfi-town-focus/focus-models.js";

// When the panel carries the `etfi-hide-details` class (toggled by the header
// switch), every focus card's detail zones are hidden, leaving just the name
// + yield pills. The hide state lives in the shared etfi-view-state module so
// the focus hover tooltip can read it too. Defaults to showing details.

// The mod's stylesheet, loaded through the engine's own loader rather than an
// injected <style> element. ComponentUtilities.loadStyles() de-duplicates, and
// logs "style-cache: Error loading style - <url>" if the path is wrong, so a
// bad path is diagnosable in the log instead of failing silently.
ComponentUtilities.loadStyles("fs://game/EnhancedTownFocusInfoMod/ui/etfi-styles.css");

// Fully rebuild the focus list. We reuse the base game's own refresh event (the
// same path used when the panel reopens), which rebuilds every
// town-focus-chooser-item from scratch — avoiding partial-DOM updates that
// previously garbled the layout.
function refreshFocusPanel(fromEl) {
  try {
    const panel = (fromEl && (fromEl.closest?.("panel-town-focus") || fromEl.getRootNode?.()?.querySelector?.("panel-town-focus")))
      || document.querySelector("panel-town-focus");
    if (panel) {
      // Use the game's own exported event class rather than re-typing its name
      // and option flags — it stays correct if Firaxis renames either.
      panel.dispatchEvent(new TownFocusRefreshEvent());
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
let etfiYieldBarTimer = null;
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
    if (etfiYieldBarTimer) clearTimeout(etfiYieldBarTimer);
    etfiYieldBarTimer = setTimeout(() => {
      etfiYieldBarTimer = null;
      refreshProductionYieldBar();
    }, 120);
  } catch (e) {
    console.error("[ETFI] scheduleFocusPanelRebuild failed", e);
  }
}

// --- engine subscription lifecycle -----------------------------------------
//
// These two engine events fire for EVERY settlement in the game, not just the
// one on screen, so subscribing at module load meant scheduling rebuild work
// for the whole session even with no panel open. Instead they follow the same
// attach/detach lifecycle the game's own components use: the first focus card
// to attach subscribes, the last one to detach unsubscribes and cancels any
// timer still in flight. `attachedItems` is the reference count — focus cards
// attach and detach as a group whenever the panel opens, closes, or refreshes.
const ENGINE_EVENTS = ["CityGrowthModeChanged", "CityYieldChanged"];
let attachedItems = 0;
let engineSubscribed = false;

function subscribeEngineEvents() {
  if (engineSubscribed) return;
  engineSubscribed = true;
  for (const ev of ENGINE_EVENTS) {
    try { engine.on(ev, scheduleFocusPanelRebuild); }
    catch (e) { console.error("[ETFI] engine.on failed for", ev, e); }
  }
  try { window.addEventListener("resize", onViewportResize); }
  catch (e) { console.error("[ETFI] resize listener failed to attach", e); }
}

function unsubscribeEngineEvents() {
  if (!engineSubscribed) return;
  engineSubscribed = false;
  for (const ev of ENGINE_EVENTS) {
    try { engine.off(ev, scheduleFocusPanelRebuild); }
    catch (e) { console.error("[ETFI] engine.off failed for", ev, e); }
  }
  try { window.removeEventListener("resize", onViewportResize); }
  catch (e) { console.error("[ETFI] resize listener failed to detach", e); }
  // Nothing is listening any more, so drop queued work rather than letting it
  // fire against a panel that has gone away.
  if (etfiPanelRefreshTimer) { clearTimeout(etfiPanelRefreshTimer); etfiPanelRefreshTimer = null; }
  if (etfiYieldBarTimer) { clearTimeout(etfiYieldBarTimer); etfiYieldBarTimer = null; }
}

// --- model dispatch --------------------------------------------------------

function projectTypeString(root) {
  const pt = root.getAttribute("data-project-type");
  const projectType = pt != null && pt !== "" ? parseInt(pt) : null;
  if (projectType == null || Number.isNaN(projectType)) return null;
  try { return GameInfo?.Projects?.lookup?.(projectType)?.ProjectType ?? null; } catch { return null; }
}

function buildModel(item) {
  return buildFocusModel(getTownCity(), projectTypeString(item.Root));
}

// --- panel width constraint ------------------------------------------------

// The panel width. Set BOTH here and in etfi-styles.css on purpose: the
// stylesheet rule is the declarative source of truth, and this inline set is
// the guarantee. The panel is built by the base game with its own width utility
// classes, and if the stylesheet ever fails to load the panel silently falls
// back to its natural (much wider) content width — a visible regression rather
// than a caught error. Inline styles win over both.
//
// Because the inline set wins, the narrow-screen fallback below CANNOT be a CSS
// media query — an inline style beats any stylesheet rule. It has to be decided
// here.
const ETFI_TOWN_FOCUS_WIDTH = 26;
// On a narrow screen, fall back to the base game's own chooser-item width
// (town-focus-chooser-item in panel-production-chooser.css) so the panel takes
// no more room than the stock UI was laid out for.
const ETFI_TOWN_FOCUS_WIDTH_NARROW = 24.61;
// The game's own small-screen breakpoint (1280px at the default 18px/rem), used
// throughout base-standard's stylesheets as `@media (max-width: 71.1111rem)`.
const ETFI_NARROW_BREAKPOINT_REM = 71.1111;
// Auto-scale only steps the root font size at 1440p and 4K, so 1rem is 18px at
// 1080p, 900p and 720p alike — the UI does not shrink to fit smaller screens.
const ETFI_FALLBACK_ROOT_FONT_PX = 18;

// Width is chosen in rem-relative terms rather than raw pixels so that the
// player's UI scale counts too: scaling the UI to 150% at 1080p squeezes the
// layout exactly as much as running at 720p, and should narrow the panel for
// the same reason.
function panelWidthRem() {
  try {
    const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rootFontPx = Number.isFinite(px) && px > 0 ? px : ETFI_FALLBACK_ROOT_FONT_PX;
    const viewportRem = window.innerWidth / rootFontPx;
    return viewportRem <= ETFI_NARROW_BREAKPOINT_REM
      ? ETFI_TOWN_FOCUS_WIDTH_NARROW
      : ETFI_TOWN_FOCUS_WIDTH;
  } catch (e) {
    console.error("[ETFI] could not measure the viewport; using the full panel width", e);
    return ETFI_TOWN_FOCUS_WIDTH;
  }
}

function applyPanelWidth(panel) {
  if (!panel) return;
  const w = `${panelWidthRem()}rem`;
  panel.style.width = w;
  panel.style.maxWidth = w;
}

function findFocusPanel(fromEl) {
  return fromEl?.closest?.("panel-town-focus")
    || fromEl?.getRootNode?.()?.querySelector?.("panel-town-focus")
    || document.querySelector("panel-town-focus");
}

function constrainPanelWidth(fromEl) {
  try {
    const panel = findFocusPanel(fromEl);
    if (!panel) return;
    panel.classList.add("etfi-panel");
    applyPanelWidth(panel);
  } catch (err) {
    console.error("[ETFI] panel width constraint failed", err);
  }
}

// The engine dispatches `resize` both on a real resolution change and whenever
// the UI scale is changed (global-scaling.js updateScales -> dispatch resize),
// so this one listener covers both ways the viewport's rem width can change.
function onViewportResize() {
  try {
    applyPanelWidth(findFocusPanel(null));
  } catch (e) {
    console.error("[ETFI] panel width resize handler failed", e);
  }
}

// Static hover label for the details checkbox. Checked expands the details
// inline on each focus; unchecked moves them into the hover tooltip.
function expandDetailsLabel() {
  return composeWithFallback("LOC_MOD_ETFI_EXPAND_DETAILS", "Expand Details");
}

// Inject the details checkbox into the Town Focus panel header (once) and keep
// the panel's state in sync on every (re)attach. Checking the box expands the
// details inline; unchecking adds the `etfi-hide-details` class, which moves
// each card's detail zones into the hover tooltip instead.
function ensureHideToggle(fromEl) {
  try {
    const panel = fromEl?.closest?.("panel-town-focus")
      || fromEl?.getRootNode?.()?.querySelector?.("panel-town-focus")
      || document.querySelector("panel-town-focus");
    if (!panel) return;
    panel.classList.toggle("etfi-hide-details", getHideDetails());

    // The panel persists while you switch settlements, so re-sync the existing
    // toggle to the now-selected town's own state rather than recreating it.
    const existing = panel.querySelector("#etfi-hide-details-row fxs-switch");
    if (existing) {
      existing.setAttribute("selected", getHideDetails() ? "false" : "true");
      return;
    }

    // fxs-switch takes the same `selected` attribute and emits the same
    // component-value-changed event as fxs-checkbox, so this is a drop-in swap —
    // it just reads as a toggle, matching the mod's Options entries.
    const toggle = document.createElement("fxs-switch");
    // On = expand Details inline (the default); off moves them to the hover
    // tooltip.
    toggle.setAttribute("selected", getHideDetails() ? "false" : "true");
    toggle.setAttribute("data-tooltip-content", expandDetailsLabel());
    toggle.addEventListener("component-value-changed", (/** @type {CustomEvent} */ e) => {
      const showDetails = !!(e && e.detail && e.detail.value);
      setHideDetails(!showDetails);
      panel.classList.toggle("etfi-hide-details", getHideDetails());
    });

    const row = document.createElement("div");
    // The id is also the stylesheet hook that positions the row and scales the
    // switch — see etfi-styles.css.
    row.id = "etfi-hide-details-row";
    row.className = "flex flex-row items-center";
    row.appendChild(toggle);

    // Place the checkbox OUT of the normal flow so it doesn't add a row that
    // pushes the focus list down. The panel Root is already position:relative
    // (and the close button is anchored to it at top-right), so anchor the
    // checkbox to the Root's top-left corner — mirroring the close button. We do
    // NOT position the content itself: that would paint the content over the
    // close button and make it unclickable. Fall back to a header row if needed.
    const header = panel.querySelector("fxs-header");
    const content = header?.parentElement;
    if (content) {
      // .etfi-anchored carries the absolute placement (etfi-styles.css); the
      // fallback branch below deliberately stays in normal flow.
      row.classList.add("etfi-anchored");
      content.appendChild(row);
    } else {
      const scrollable = panel.querySelector("fxs-scrollable");
      const host = scrollable?.parentElement;
      if (!scrollable || !host) return;
      row.classList.add("justify-end", "w-full", "mb-1");
      host.insertBefore(row, scrollable);
    }
  } catch (e) {
    console.error("[ETFI] ensureHideToggle failed", e);
  }
}

// Hide the base game's inline focus description. (class + inline display:none,
// since a class alone can be overridden by the element's other display
// utilities in some render paths.)
function hideDescription(item) {
  try {
    if (item.descriptionElement) {
      item.descriptionElement.classList.add("hidden");
      item.descriptionElement.style.display = "none";
    }
  } catch {}
}

// --- prototype patch -------------------------------------------------------
//
// The mod works by wrapping three TownFocusChooserItem methods. That is the
// only way to reshape the base game's focus cards, but it is also the mod's
// most brittle contact point: if a game patch renames or removes one of these,
// the wrapper silently wraps `undefined` and the panel breaks in a way that is
// hard to trace back here.
//
// So the contract is verified up front. A missing method is reported once, by
// name, and the patch is skipped entirely — the player gets the stock,
// unmodified Town Focus panel instead of a half-patched broken one, and the log
// says exactly which method to look at.
const REQUIRED_METHODS = ["render", "onAttach", "onDetach", "onAttributeChanged"];

function verifyBaseContract() {
  const proto = TownFocusChooserItem?.prototype;
  if (!proto) {
    console.error(
      "[ETFI] TownFocusChooserItem has no prototype; the mod's focus-card patch is disabled. " +
      "The game's town-focus-section.js has probably changed shape.",
    );
    return false;
  }
  const missing = REQUIRED_METHODS.filter((m) => typeof proto[m] !== "function");
  if (missing.length) {
    console.error(
      "[ETFI] TownFocusChooserItem is missing expected method(s):", missing.join(", ") +
      ". The mod's focus-card patch is disabled so the stock panel keeps working. " +
      "This usually means a game patch renamed them; update REQUIRED_METHODS and the " +
      "wrappers in ui/production-chooser/etfi-town-focus-section.js to match.",
    );
    return false;
  }
  return true;
}

const contractOk = verifyBaseContract();

const baseRender = TownFocusChooserItem?.prototype?.render;
const baseOnAttributeChanged = TownFocusChooserItem?.prototype?.onAttributeChanged;
const baseOnAttach = TownFocusChooserItem?.prototype?.onAttach;
const baseOnDetach = TownFocusChooserItem?.prototype?.onDetach;

// The wrappers are defined unconditionally and installed at the bottom of this
// file, but only when the contract above held.
function etfiOnAttach() {
  attachedItems++;
  subscribeEngineEvents();
  if (baseOnAttach) baseOnAttach.call(this);
  // Now that the item is in the DOM, pin the panel width and ensure the
  // hide-details checkbox is present.
  constrainPanelWidth(this.Root);
  ensureHideToggle(this.Root);
}

// Mirror of etfiOnAttach. The base class's onDetach is inherited from the
// engine's Component, so it is called through rather than skipped.
function etfiOnDetach() {
  attachedItems = Math.max(0, attachedItems - 1);
  if (attachedItems === 0) unsubscribeEngineEvents();
  if (baseOnDetach) baseOnDetach.call(this);
}

function etfiRender() {
  baseRender.call(this);

  try { this.Root.dataset.tooltipStyle = ETFI_TOWN_FOCUS_TOOLTIP_STYLE; } catch {}

  const growth = isGrowthFocusEl(this.Root);

  // Hide the inline focus description for every focus.
  hideDescription(this);

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

  // flex-auto / min-w-0 / truncate are the game's own utility classes and are
  // exact equivalents of the inline styles they replace.
  try {
    infoContainer.classList.remove("flex-initial");
    infoContainer.classList.add("flex-auto", "min-w-0");
  } catch {}

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);

  this.nameElement.classList.add("text-left", "flex-auto", "min-w-0", "truncate");

  this.etfiYields = document.createElement("div");
  // Pills stack in rows of at most 3 (see etfiUpdate), right-aligned. The
  // margin nudges them off the right edge of the card (see etfi-styles.css).
  this.etfiYields.className = "etfi-name-pills flex flex-col items-end shrink-0";

  nameRow.append(this.nameElement, this.etfiYields);

  this.etfiTop = null;
  this.etfiDetails = null;
  this.etfiBottom = null;
  if (!inSummary) {
    this.etfiTop = document.createElement("div");
    this.etfiTop.className = "etfi-detail-zone w-full flex flex-col";
    this.etfiDetails = document.createElement("div");
    this.etfiDetails.className = "etfi-detail-zone etfi-details-pad img-base-ticket-bg-container w-full flex flex-col mt-2 text-2xs";
    this.etfiBottom = document.createElement("div");
    this.etfiBottom.className = "etfi-detail-zone w-full flex flex-col";

    if (container) {
      const topRow = document.createElement("div");
      topRow.className = "flex flex-row w-full";
      topRow.appendChild(this.projectIconElement);
      topRow.appendChild(infoContainer);
      container.classList.remove("flex-row");
      // etfi-card-pad trims the base container's p-3 horizontal padding so the
      // focus icon sits closer to the left edge of the card (etfi-styles.css).
      container.classList.add("flex-col", "w-full", "etfi-card-pad");
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
}

function etfiOnAttributeChanged(name, oldValue, newValue) {
  baseOnAttributeChanged.call(this, name, oldValue, newValue);
  if (
    name === "data-project-type" ||
    name === "data-growth-type" ||
    name === "data-name" ||
    name === "data-description"
  ) {
    this.etfiUpdate();
  }
}

function etfiUpdate() {
  const growth = isGrowthFocusEl(this.Root);

  // Keep the inline description hidden (re-asserted here since the summary item
  // is reused across focus changes).
  hideDescription(this);

  if (!this.etfiYields) return;

  if (growth) {
    this.etfiYields.classList.add("hidden");
    clearChildren(this.etfiYields);
    for (const el of [this.etfiTop, this.etfiDetails, this.etfiBottom]) {
      if (el) { el.classList.add("hidden"); clearChildren(el); }
    }
    return;
  }

  const model = buildModel(this) || { header: [], rows: [], sections: [], notes: [] };

  // Header pills next to the focus name. Merge duplicate yield types into one
  // pill by summing their values (first-seen order is preserved).
  clearChildren(this.etfiYields);
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
  // Lay the pills out in rows of at most 3 so they don't crowd / overlap the
  // focus name; a 4th+ pill wraps to a new line.
  appendPillRows(this.etfiYields, headerMerged.map((y) => yieldPill(y)));
  this.etfiYields.classList.toggle("hidden", this.etfiYields.childElementCount === 0);

  if (!this.etfiDetails) return;

  const { top: topSecs, mid: midSecs, bottom: bottomSecs } = splitSectionsByPanel(model.sections);
  const flat = (model.rows || []).filter(Boolean);
  const notes = (model.notes || []).filter(Boolean);

  // Top zone: top sections, each its own panel.
  const lastTop = renderSectionPanels(this.etfiTop, topSecs, ETFI_SECTION_CFG);

  // Base panel: any flat (untitled) rows.
  const base = this.etfiDetails;
  clearChildren(base);
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
}

// --- install ---------------------------------------------------------------
//
// The single place the mod takes over the base component. If the contract check
// at the top of this section failed, nothing is installed and the stock Town
// Focus panel is left exactly as the game built it.
if (contractOk) {
  TownFocusChooserItem.prototype.onAttach = etfiOnAttach;
  TownFocusChooserItem.prototype.onDetach = etfiOnDetach;
  TownFocusChooserItem.prototype.render = etfiRender;
  TownFocusChooserItem.prototype.onAttributeChanged = etfiOnAttributeChanged;
  TownFocusChooserItem.prototype.etfiUpdate = etfiUpdate;
}
