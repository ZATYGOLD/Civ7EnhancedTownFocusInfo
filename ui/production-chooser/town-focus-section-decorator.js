// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Reshapes the base game's Town Focus cards: yield pills on the name row and
// the inline breakdown panels, plus the panel's Expand Details switch.

import { ComponentUtilities } from "/core/ui-next/utilities/component-utilities.js";
import { ComponentID } from "/core/ui/utilities/utilities-component-id.js";
import { TownFocusChooserItem } from "/base-standard/ui/production-chooser/town-focus-section.js";
import { TownFocusRefreshEvent } from "/base-standard/ui/production-chooser/panel-town-focus.js";
import { getTownCity, composeWithFallback, isGrowthFocusEl } from "../utilities/utilities-town-focus.js";
import { getHideDetails, setHideDetails } from "../components/town-focus-view-state.js";
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
} from "../components/town-focus-rows.js";
import { buildFocusModel } from "../town-focus/focus-models.js";

// When the panel carries the `etfi-hide-details` class (toggled by the header
// switch), every focus card's detail zones are hidden, leaving just the name
// + yield pills. The hide state lives in the shared town-focus-view-state module so
// the focus hover tooltip can read it too. Defaults to showing details.

// The mod's stylesheet, loaded through the engine's own loader rather than an
// injected <style> element. ComponentUtilities.loadStyles() de-duplicates, and
// logs "style-cache: Error loading style - <url>" if the path is wrong, so a
// bad path is diagnosable in the log instead of failing silently.
ComponentUtilities.loadStyles("fs://game/EnhancedTownFocusInfoMod/ui/production-chooser/town-focus-section-decorator.css");

// Fully rebuild the focus list. We reuse the base game's own refresh event (the
// same path used when the panel reopens), which rebuilds every
// town-focus-chooser-item from scratch — avoiding partial-DOM updates that
// previously garbled the layout.
function refreshFocusPanel(fromEl) {
  try {
    const panel = findFocusPanel(fromEl);
    if (panel) {
      // Use the game's own exported event class rather than re-typing its name
      // and option flags — it stays correct if Firaxis renames either.
      panel.dispatchEvent(new TownFocusRefreshEvent());
    }
  } catch (e) {
    console.error("[ETFI] refreshFocusPanel failed", e);
  }
}

function refreshProductionYieldBar() {
  try {
    const el = document.querySelector("panel-production-chooser");
    const comp = el && (el.maybeComponent || el.component);
    if (comp && typeof comp.updateCityYieldBar === "function") {
      comp.updateCityYieldBar();
    }
  } catch {}
}

// These engine events carry the settlement they happened to. Without the filter
// a yield change on ANY of the player's settlements rebuilt the whole panel —
// the base game's own handler (panel-production-chooser.js onCityYieldChanged)
// filters on exactly this payload, so the shape is known-good. An event with no
// cityID is treated as "might be ours" and allowed through.
function isForSelectedCity(data) {
  try {
    const id = data?.cityID;
    if (!id) return true;
    const selected = UI.Player?.getHeadSelectedCity?.();
    if (!selected) return true;
    return ComponentID.isMatch(selected, id);
  } catch (e) {
    console.error("[ETFI] could not compare event cityID; rebuilding anyway", e);
    return true;
  }
}

let etfiPanelRefreshTimer = null;
let etfiYieldBarTimer = null;
function scheduleFocusPanelRebuild(data) {
  if (!isForSelectedCity(data)) return;
  try {
    if (etfiPanelRefreshTimer) clearTimeout(etfiPanelRefreshTimer);
    etfiPanelRefreshTimer = setTimeout(() => {
      etfiPanelRefreshTimer = null;
      refreshFocusPanel(null);
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

// On a focus change the base game already rebuilds the list itself
// (panel-production-chooser dispatches its own TownFocusRefreshEvent), so
// scheduling a second full rebuild here just doubled the cost of one click.
// The yield bar still needs nudging, because that is ours.
function onGrowthModeChanged(data) {
  if (!isForSelectedCity(data)) return;
  try {
    if (etfiYieldBarTimer) clearTimeout(etfiYieldBarTimer);
    etfiYieldBarTimer = setTimeout(() => {
      etfiYieldBarTimer = null;
      refreshProductionYieldBar();
    }, 120);
  } catch (e) {
    console.error("[ETFI] onGrowthModeChanged failed", e);
  }
}

// --- engine subscription lifecycle -----------------------------------------
//
// These events fire for EVERY settlement, not just the one on screen, so
// subscribing at module load scheduled rebuild work all session with no panel
// open. They now follow attach/detach: the first card subscribes, the last to
// detach unsubscribes and cancels any timer still in flight.
const ENGINE_EVENTS = [
  ["CityYieldChanged", scheduleFocusPanelRebuild],
  ["CityGrowthModeChanged", onGrowthModeChanged],
];
let attachedItems = 0;
let engineSubscribed = false;

function subscribeEngineEvents() {
  if (engineSubscribed) return;
  engineSubscribed = true;
  for (const [ev, handler] of ENGINE_EVENTS) {
    try { engine.on(ev, handler); }
    catch (e) { console.error("[ETFI] engine.on failed for", ev, e); }
  }
  try { window.addEventListener("resize", onViewportResize); }
  catch (e) { console.error("[ETFI] resize listener failed to attach", e); }
}

function unsubscribeEngineEvents() {
  if (!engineSubscribed) return;
  engineSubscribed = false;
  for (const [ev, handler] of ENGINE_EVENTS) {
    try { engine.off(ev, handler); }
    catch (e) { console.error("[ETFI] engine.off failed for", ev, e); }
  }
  try { window.removeEventListener("resize", onViewportResize); }
  catch (e) { console.error("[ETFI] resize listener failed to detach", e); }
  // Nothing is listening any more, so drop queued work rather than letting it
  // fire against a panel that has gone away.
  if (etfiPanelRefreshTimer) { clearTimeout(etfiPanelRefreshTimer); etfiPanelRefreshTimer = null; }
  if (etfiYieldBarTimer) { clearTimeout(etfiYieldBarTimer); etfiYieldBarTimer = null; }
}

function projectTypeString(root) {
  const pt = root.getAttribute("data-project-type");
  const projectType = pt != null && pt !== "" ? parseInt(pt) : null;
  if (projectType == null || Number.isNaN(projectType)) return null;
  try { return GameInfo?.Projects?.lookup?.(projectType)?.ProjectType ?? null; } catch { return null; }
}

function buildModel(item) {
  return buildFocusModel(getTownCity(), projectTypeString(item.Root));
}

// Panel width is set BOTH here and in town-focus-section-decorator.css on
// purpose: the sheet is
// the declarative source, this inline set is the guarantee. The base panel
// carries its own width utility classes, so if the sheet fails to load the panel
// silently reverts to its much wider natural width.
//
// And because an inline style beats any stylesheet rule, the narrow-screen
// fallback below CANNOT be a media query — it has to be decided here.
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
//
// Cached, because getComputedStyle forces a style recalculation over the whole
// UI tree and this used to run once per attaching card — ten forced recalcs
// interleaved with ten DOM mutations, all computing the same number. Only
// onViewportResize clears it, which is the only thing that can change it (the
// engine dispatches resize on UI-scale changes too).
let cachedPanelWidthRem = null;
function panelWidthRem() {
  if (cachedPanelWidthRem !== null) return cachedPanelWidthRem;
  let width = ETFI_TOWN_FOCUS_WIDTH;
  try {
    const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rootFontPx = Number.isFinite(px) && px > 0 ? px : ETFI_FALLBACK_ROOT_FONT_PX;
    const viewportRem = window.innerWidth / rootFontPx;
    if (viewportRem <= ETFI_NARROW_BREAKPOINT_REM) width = ETFI_TOWN_FOCUS_WIDTH_NARROW;
  } catch (e) {
    console.error("[ETFI] could not measure the viewport; using the full panel width", e);
  }
  cachedPanelWidthRem = width;
  return width;
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
    cachedPanelWidthRem = null;
    applyPanelWidth(findFocusPanel(null));
  } catch (e) {
    console.error("[ETFI] panel width resize handler failed", e);
  }
}

function expandDetailsLabel() {
  return composeWithFallback("LOC_MOD_ETFI_EXPAND_DETAILS", "Expand Details");
}

// Inject the details checkbox into the Town Focus panel header (once) and keep
// the panel's state in sync on every (re)attach. Checking the box expands the
// details inline; unchecking adds the `etfi-hide-details` class, which moves
// each card's detail zones into the hover tooltip instead.
function ensureHideToggle(fromEl) {
  try {
    const panel = findFocusPanel(fromEl);
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
    toggle.setAttribute("selected", getHideDetails() ? "false" : "true");
    toggle.setAttribute("data-tooltip-content", expandDetailsLabel());
    toggle.addEventListener("component-value-changed", (/** @type {CustomEvent} */ e) => {
      const showDetails = !!(e && e.detail && e.detail.value);
      setHideDetails(!showDetails);
      panel.classList.toggle("etfi-hide-details", getHideDetails());
    });

    const row = document.createElement("div");
    row.id = "etfi-hide-details-row";
    row.className = "flex flex-row items-center";
    row.appendChild(toggle);

    // Anchored out of normal flow so it adds no row that pushes the list down,
    // mirroring the close button at the opposite corner. Do NOT position the
    // content itself — that paints over the close button and blocks clicks.
    const header = panel.querySelector("fxs-header");
    const content = header?.parentElement;
    if (content) {
      // .etfi-anchored carries the absolute placement
      // (town-focus-section-decorator.css); the
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
// Wrapping TownFocusChooserItem is the only way to reshape the base cards, and
// the mod's most brittle contact point: if a patch renames one of these, the
// wrapper wraps `undefined` and the panel breaks far from the cause. So the
// contract is checked up front — a missing method is named in the log and the
// patch is skipped entirely, leaving the stock panel working.
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
      "wrappers in ui/production-chooser/town-focus-section-decorator.js to match.",
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

  hideDescription(this);

  // Growing Town keeps the base card layout — no yield pills, detail panels, or
  // name-row restructuring.
  if (growth) return;

  const infoContainer = this.nameElement.parentElement;
  if (!infoContainer) return;
  const container = this.container || infoContainer.parentElement;

  const inSummary = !!this.Root.closest("town-focus-section");

  try {
    this.projectIconElement.classList.remove("size-16");
    this.projectIconElement.classList.add("size-12");
  } catch {}

  try {
    infoContainer.classList.remove("flex-initial");
    infoContainer.classList.add("flex-auto", "min-w-0");
  } catch {}

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-row items-center w-full";
  infoContainer.replaceChild(nameRow, this.nameElement);

  this.nameElement.classList.add("text-left", "flex-auto", "min-w-0", "truncate");

  this.etfiYields = document.createElement("div");
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

  // Scheduled, not called directly, so render() and the postOnAttach attribute
  // replay that follows it collapse into one rebuild.
  scheduleEtfiUpdate(this);
}

// Coalesce the burst of updates that one attach produces into a single rebuild.
//
// Component.postOnAttach() replays EVERY declared attribute that had a value
// before attach, and panel-town-focus.js sets all four of
// data-name/-description/-growth-type/-project-type before appendChild. Add
// render()'s own update and each card was building its model FIVE times per
// panel refresh, discarding four — roughly 5,000 engine calls where 1,000 would
// do, plus five rounds of DOM teardown and rebuild.
//
// Coalescing per task rather than diffing the attribute values is deliberate:
// the base game keeps ONE persistent summary card (TownFocusSection's
// townFocusItem) and refreshes it by re-setting the same attribute values, which
// still fires attributeChangedCallback. A value-based dirty check would skip
// those and leave the summary card stale. A microtask runs before paint, so the
// single rebuild still lands in the same frame.
function scheduleEtfiUpdate(item) {
  if (item._etfiUpdateQueued) return;
  item._etfiUpdateQueued = true;
  queueMicrotask(() => {
    item._etfiUpdateQueued = false;
    try { item.etfiUpdate(); }
    catch (e) { console.error("[ETFI] etfiUpdate failed", e); }
  });
}

function etfiOnAttributeChanged(name, oldValue, newValue) {
  baseOnAttributeChanged.call(this, name, oldValue, newValue);
  // These two don't affect the model; they only need the base description
  // re-hidden, which is cheap and must not wait for a microtask.
  if (name === "data-name" || name === "data-description") {
    hideDescription(this);
    return;
  }
  if (name === "data-project-type" || name === "data-growth-type") {
    scheduleEtfiUpdate(this);
  }
}

function etfiUpdate() {
  const growth = isGrowthFocusEl(this.Root);

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
  // Rows of at most 3 so the pills don't crowd the focus name.
  appendPillRows(this.etfiYields, headerMerged.map((y) => yieldPill(y)));
  this.etfiYields.classList.toggle("hidden", this.etfiYields.childElementCount === 0);

  if (!this.etfiDetails) return;

  const { top: topSecs, mid: midSecs, bottom: bottomSecs } = splitSectionsByPanel(model.sections);
  const flat = (model.rows || []).filter(Boolean);
  const notes = (model.notes || []).filter(Boolean);

  const lastTop = renderSectionPanels(this.etfiTop, topSecs, ETFI_SECTION_CFG);

  const base = this.etfiDetails;
  clearChildren(base);
  if (flat.length) appendRows(base, flat, ETFI_SECTION_CFG);
  base.classList.toggle("hidden", base.childElementCount === 0);

  const lastBottom = renderSectionPanels(this.etfiBottom, [...midSecs, ...bottomSecs], ETFI_SECTION_CFG);

  if (notes.length) {
    let host = lastBottom || (base.childElementCount ? base : null) || lastTop;
    if (!host) host = base;
    for (const n of notes) host.appendChild(noteLine(n));
    host.classList.remove("hidden");
  }
}

// --- install ---------------------------------------------------------------
//
// The single place the mod takes over the base component.
if (contractOk) {
  TownFocusChooserItem.prototype.onAttach = etfiOnAttach;
  TownFocusChooserItem.prototype.onDetach = etfiOnDetach;
  TownFocusChooserItem.prototype.render = etfiRender;
  TownFocusChooserItem.prototype.onAttributeChanged = etfiOnAttributeChanged;
  TownFocusChooserItem.prototype.etfiUpdate = etfiUpdate;
}
