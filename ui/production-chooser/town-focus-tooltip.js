// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/production-chooser/town-focus-tooltip.js
//
// Author: Zatygold
//
// Custom hover tooltip for Town Focus options in the production chooser, built on
// the game's NEW (Solid/ui-next) tooltip system so it inherits the framed look,
// the filigree border, and the native INSPECT [..] lock hint.
//
// The Town Focus cards (town-focus-chooser-item) are legacy DOM, so we cannot wrap
// them in a Solid <Tooltip.Trigger>. Instead we:
//   1. Mount a single Solid <Tooltip> (root -> Content -> Frame -> our content).
//   2. Capture the root's auto-generated tooltip name via a bridge child.
//   3. On hover of a card, rebuild our content for that card and call
//      TooltipModel.triggerTooltip(name, Focus/Blur, card) to show/hide it.
// A tiny no-op legacy type is still registered under our style name so the base
// game's production tooltip stays suppressed for these cards (the cards point at
// ETFI_TOWN_FOCUS_TOOLTIP_STYLE; a registered type whose isBlank() is true makes
// the legacy TooltipManager render nothing).
//
// The body content (focus descriptions, Town's Gold / Food Sent breakdown, and the
// two-column "expanded" layout when inline details are hidden) is unchanged from
// the previous implementation — only the shell + delivery mechanism are new.

import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";
import { GetTownFocusBlp } from "/base-standard/ui/production-chooser/production-chooser-helpers.js";
import { AdvisorUtilities } from "/base-standard/ui/tutorial/advisor-utilities.js";
import { render } from "/core/vendor/solid-js/web/dist/web.js";
import { createComponent, useContext, createEffect } from "/core/vendor/solid-js/dist/solid.js";
import { Tooltip, TooltipContext, TooltipHorizontalPosition } from "/core/ui-next/components/tooltip.js";
import { TooltipModel } from "/core/ui-next/components/tooltip-model.js";
import { TriggerType } from "/core/ui-next/components/trigger.js";
import { getConnectedCitiesFood, getConvertedGold, composeWithFallback, isTownGrowing } from "../../etfi-utilities.js";
import { buildFocusModel, focusHeaderYield } from "../etfi-town-focus/focus-models.js";
import { fmt, renderSectionPanels, ETFI_SECTION_CFG, ETFI_DETAILS_CFG } from "../etfi-details/etfi-render.js";
import { getHideDetails } from "../etfi-details/etfi-view-state.js";
// Registers the <etfi-tooltip-section-description> element (the focus description
// block below the header) and provides its tag name.
import { ETFI_TOWN_FOCUS_SECTION_DESCRIPTION } from "../etfi-details/etfi-tooltip-section-description.js";

// The unique tooltip style name the town-focus items reference (see
// etfi-town-focus-section.js). Kept so the base tooltip is overridden/suppressed.
export const ETFI_TOWN_FOCUS_TOOLTIP_STYLE = "etfi-town-focus-tooltip";

// The legacy DOM tag of a Town Focus card. Scoped to town-focus cards only — we
// now drive triggering ourselves, so we must NOT fire on generic production items.
const CARD_SELECTOR = "town-focus-chooser-item";

const bulletChar = String.fromCodePoint(8226);

// Replace a container's children (GameFace lacks Element.replaceChildren).
function setChildren(parent, nodes) {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  for (const n of nodes) if (n) parent.appendChild(n);
}

// Order a focus model's sections the same way the inline card does: top zone,
// then default, then bottom. Returns a flat list for renderSectionPanels.
function orderFocusSections(model) {
  const sections = (model && Array.isArray(model.sections) ? model.sections : []).filter(Boolean);
  const top = sections.filter((s) => s.separatePanel === "top" || s.separatePanel === true);
  const mid = sections.filter((s) => !s.separatePanel);
  const bottom = sections.filter((s) => s.separatePanel === "bottom");
  return [...top, ...mid, ...bottom];
}

// Builds + owns the tooltip body DOM. One persistent instance is mounted inside
// the Solid Tooltip.Frame; setTarget()+update() re-render it in place per hover.
class EtfiTownFocusTooltipContent {
  target = null;
  // #region Element References
  // `root` replaces the legacy <fxs-tooltip> shell: the Solid Tooltip.Frame now
  // provides the border/background/INSPECT hint, so this is a plain column.
  root = document.createElement("div");
  icon = document.createElement("fxs-icon");
  header = document.createElement("fxs-header");
  divider = document.createElement("div");
  glow = document.createElement("div");
  sectionDescription = document.createElement(ETFI_TOWN_FOCUS_SECTION_DESCRIPTION);
  // Thin separator drawn between the two descriptions (focus-specific above,
  // generic Town behavior below) so they read as distinct blocks.
  descDivider = document.createElement("div");
  description = document.createElement("p");
  productionCost = document.createElement("div");
  requirementsContainer = document.createElement("div");
  requirementsText = document.createElement("div");
  // Town's Gold + Food Sent. Re-rendered per layout (see applyLayout): normal =
  // tooltip cfg, hidden = inline cfg (to align with the left categories).
  details = document.createElement("div");
  gemsContainer = document.createElement("div");
  // Two-column body used when the panel's details are hidden (see applyLayout):
  //   topRow = [leftDesc | divider | rightDesc]  (focus desc | generic desc)
  //   botRow = [leftCats | divider | rightCats]  (focus categories | Gold/Food)
  bodyRow = document.createElement("div");
  topRow = document.createElement("div");
  botRow = document.createElement("div");
  leftDesc = document.createElement("div");
  rightDesc = document.createElement("div");
  leftCats = document.createElement("div");
  rightCats = document.createElement("div");
  colDividerTop = document.createElement("div");
  colDividerBot = document.createElement("div");
  focusDetails = document.createElement("div");
  // #endregion
  // Bumped onto the section-description element's data-rev to re-render it.
  _descRev = 0;
  // Cached Town's Gold + Food Sent sections (re-rendered per layout).
  _goldFoodSections = [];
  constructor() {
    this.glow.classList.add(
      "h-24",
      "absolute",
      "inset-x-0",
      "-top-7",
      "img-fxs-header-glow",
      "pointer-events-none"
    );
    this.root.className = "relative flex flex-col w-96 text-accent-2 font-body text-sm";
    this.header.setAttribute("filigree-style", "none");
    this.header.setAttribute("header-bg-glow", "true");
    this.icon.className = "size-12";
    const dividerLeft = document.createElement("div");
    const dividerRight = document.createElement("div");
    dividerLeft.classList.add("filigree-shell-small-left");
    dividerRight.classList.add("filigree-shell-small-right");
    this.divider.className = "flex flex-row items-center self-center";
    this.divider.append(dividerLeft, this.icon, dividerRight);
    this.productionCost.className = "mt-2";
    this.requirementsContainer.className = "flex mt-2 p-2 production-chooser-tooltip__subtext-bg";
    this.requirementsContainer.append(this.requirementsText);
    this.details.className = "flex flex-col";
    this.gemsContainer.className = "mt-10";
    // Layout below the header:
    //   * sectionDescription — the focus-specific specialization text.
    //   * descDivider — a thin separator line between the two blocks.
    //   * description (legacy <p>) — the generic Town behavior.
    this.sectionDescription.className = "flex flex-col";
    this.descDivider.className = "w-full self-center shrink-0";
    this.descDivider.style.cssText =
      "height:0.0625rem; margin-top:0.4rem; margin-bottom:0.4rem; background-color:rgba(77, 83, 102, 0.7);";
    this.description.className = "text-2xs";
    this.bodyRow.className = "flex flex-col w-full";
    this.topRow.className = "flex flex-row w-full";
    this.botRow.className = "flex flex-row w-full";
    for (const cell of [this.leftDesc, this.rightDesc, this.leftCats, this.rightCats]) {
      cell.className = "flex flex-col flex-1 min-w-0";
    }
    const colDivStyle = "width:0.0625rem; background-color:rgba(77, 83, 102, 0.7);";
    this.colDividerTop.className = "self-stretch shrink-0 mx-3";
    this.colDividerTop.style.cssText = colDivStyle;
    this.colDividerBot.className = "self-stretch shrink-0 mx-3";
    this.colDividerBot.style.cssText = colDivStyle;
    this.focusDetails.className = "flex flex-col hidden";
    // Default (normal-mode) parenting; applyLayout() re-parents as needed.
    this.bodyRow.append(
      this.sectionDescription,
      this.descDivider,
      this.description,
      this.productionCost,
      this.details,
      this.gemsContainer
    );
    this.root.append(this.glow, this.header, this.divider, this.bodyRow, this.requirementsContainer);
  }
  setTarget(card) {
    this.target = card ?? null;
    return !!this.target;
  }
  getProjectType() {
    if (!this.target) {
      return null;
    }
    if (this.target.hasAttribute("data-project-type")) {
      return Number(this.target.dataset.projectType);
    }
    if (this.target.hasAttribute("data-type")) {
      return Game.getHash(this.target.dataset.type);
    }
    return null;
  }
  // The hovered focus's ProjectType string (e.g. "PROJECT_TOWN_PRODUCTION"),
  // used to look up its preview model.
  getProjectTypeString() {
    const pt = this.getProjectType();
    if (pt == null) return null;
    try {
      return GameInfo.Projects.lookup(pt)?.ProjectType ?? null;
    } catch {
      return null;
    }
  }
  update() {
    if (!this.target) {
      return;
    }
    const projectType = this.getProjectType();
    const cityID = UI.Player?.getHeadSelectedCity?.();
    if (!cityID) {
      return;
    }
    const city = Cities.get(cityID);
    if (!city) {
      return;
    }
    const name = this.target.dataset.name ?? "";
    // Two distinct descriptions, mirroring the town-focus-chooser-item data:
    //   * focusDescription  (data-description) — the focus-specific text.
    //   * tooltipDescription (data-tooltip-description) — the generic behavior.
    const hidden = getHideDetails();
    const growing = this.isGrowingFocus();
    let focusDescription;
    if (growing) {
      focusDescription = hidden ? (this.target.dataset.description || "") : "";
    } else {
      focusDescription = this.target.dataset.description || this.target.__etfiDescription || "";
      if (!focusDescription) {
        try {
          const def = projectType ? GameInfo.Projects.lookup(projectType) : null;
          if (def?.Description) focusDescription = def.Description;
        } catch {}
      }
    }
    let tooltipDescription = this.target.dataset.tooltipDescription || "";
    if (growing && hidden) {
      // Growing keeps its Food for growth, so use a Production->Gold-only line.
      tooltipDescription = "LOC_MOD_ETFI_PRODUCTION_TO_GOLD";
    }
    const growthType = Number(this.target.dataset.growthType);
    const productionCost = projectType ? city.Production?.getProjectProductionCost(projectType) : -1;
    const requirementsText = this.getRequirementsText();
    this.header.setAttribute("title", name);
    // Hand the focus-specific description to the section-description element.
    this.sectionDescription.etfiDescription = focusDescription;
    this.sectionDescription.setAttribute("data-rev", String(++this._descRev));
    // Render the generic Town description in the legacy <p>.
    this.description.innerHTML = tooltipDescription ? Locale.stylize(tooltipDescription) : "";
    this.description.classList.toggle("hidden", !tooltipDescription);
    // Only show the separator when BOTH descriptions are present.
    this.descDivider.classList.toggle("hidden", !(focusDescription && tooltipDescription));
    let firstChild = true;
    let prevChildIsList = false;
    for (const node of this.description.children) {
      const isList = Boolean(node.innerHTML.match(bulletChar));
      if (isList) node.classList.add("ml-4");
      if (!firstChild) {
        if (!prevChildIsList || !isList) node.classList.add("mt-2");
      } else {
        firstChild = false;
      }
      prevChildIsList = isList;
    }
    const iconBlp = GetTownFocusBlp(growthType, projectType);
    this.icon.style.backgroundImage = `url(${iconBlp})`;
    if (productionCost !== void 0 && productionCost > 0) {
      this.productionCost.innerHTML = Locale.stylize(
        "LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST",
        productionCost,
        "YIELD_PRODUCTION"
      );
      this.productionCost.classList.remove("hidden");
    } else {
      this.productionCost.classList.add("hidden");
    }
    if (requirementsText) {
      this.requirementsText.innerHTML = requirementsText;
      this.requirementsContainer.classList.remove("hidden");
    } else {
      this.requirementsContainer.classList.add("hidden");
    }
    this.updateDetails(city);
    // Clear any prior advisor recommendation before (maybe) re-adding.
    setChildren(this.gemsContainer, []);
    const recommendations = this.target?.dataset.recommendations;
    if (recommendations) {
      try {
        const parsedRecommendations = JSON.parse(recommendations);
        const advisorList = parsedRecommendations.map((rec) => rec.class);
        const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
        this.gemsContainer.appendChild(recommendationTooltipContent);
      } catch {}
    }
    this.gemsContainer.classList.toggle("hidden", !recommendations);
    this.applyLayout(city);
  }
  // Arrange the body. Normally everything stacks in one column. When the panel's
  // details are hidden, widen into two rows (descriptions, then categories) split
  // by a vertical divider.
  applyLayout(city) {
    const growing = this.isGrowingFocus();
    let leftSections;
    if (growing) {
      const comingSoon = composeWithFallback("LOC_MOD_ETFI_COMING_SOON", "Coming Soon");
      leftSections = [{ title: comingSoon, rows: [{ iconId: "YIELD_FOOD", name: comingSoon }] }];
    } else {
      leftSections = orderFocusSections(buildFocusModel(city, this.getProjectTypeString()));
    }
    renderSectionPanels(this.focusDetails, leftSections, ETFI_SECTION_CFG);
    const hasLeft = leftSections.length > 0;

    if (getHideDetails()) {
      this.focusDetails.classList.toggle("hidden", !hasLeft);
      this.root.style.width = "44rem";
      this.descDivider.classList.add("hidden");
      this.requirementsContainer.classList.add("justify-center");
      this.requirementsText.classList.add("text-center");

      renderSectionPanels(this.details, this._goldFoodSections || [], ETFI_SECTION_CFG);
      setChildren(this.leftDesc, [this.sectionDescription]);
      setChildren(this.rightDesc, [this.description, this.productionCost]);
      setChildren(this.leftCats, [this.focusDetails]);
      setChildren(this.rightCats, [this.details, this.gemsContainer]);
      setChildren(this.topRow, [this.leftDesc, this.colDividerTop, this.rightDesc]);
      setChildren(this.botRow, [this.leftCats, this.colDividerBot, this.rightCats]);
      setChildren(this.bodyRow, [this.topRow, this.botRow]);
    } else {
      this.root.style.width = "";
      renderSectionPanels(this.details, this._goldFoodSections || [], ETFI_DETAILS_CFG);
      const showLeft = growing && hasLeft;
      this.focusDetails.classList.toggle("hidden", !showLeft);
      this.requirementsContainer.classList.remove("justify-center");
      this.requirementsText.classList.remove("text-center");
      const normal = [
        this.sectionDescription,
        this.descDivider,
        this.description,
        this.productionCost,
        this.details,
      ];
      if (showLeft) normal.push(this.focusDetails);
      normal.push(this.gemsContainer);
      setChildren(this.bodyRow, normal);
    }
  }
  // Build the default-Town breakdown into _goldFoodSections (applyLayout renders
  // it): Town's Gold (Production converted + base Gold + the focus's added
  // Production/Gold) and Food Sent per connected City.
  updateDetails(city) {
    const sections = [];

    const { production, gold } = getConvertedGold(city);
    const growingTown = isTownGrowing(city);
    let cProjStr = null, cProjNum = null, cGrowthNum = null;
    if (growingTown) {
      if (!this.isGrowingFocus()) {
        cProjStr = this.getProjectTypeString();
        cProjNum = this.getProjectType();
        cGrowthNum = Number(this.target?.dataset?.growthType);
      }
    } else {
      try {
        cProjNum = city.Growth?.projectType ?? null;
        cProjStr = cProjNum != null ? (GameInfo.Projects.lookup(cProjNum)?.ProjectType ?? null) : null;
        cGrowthNum = typeof GrowthTypes !== "undefined" ? GrowthTypes.PROJECT : null;
      } catch {}
    }
    const cModel = cProjStr ? buildFocusModel(city, cProjStr) : null;
    const addProd = cModel ? focusHeaderYield(cModel, "YIELD_PRODUCTION") : 0;
    const addGold = cModel ? focusHeaderYield(cModel, "YIELD_GOLD") : 0;
    const addFood = growingTown && cModel ? focusHeaderYield(cModel, "YIELD_FOOD") : 0;
    const baseProduction = growingTown ? production : Math.max(0, production - addProd);
    const baseGold = growingTown ? gold : Math.max(0, gold - addGold);

    const goldPill = (value) => ({ yieldType: "YIELD_GOLD", value, sign: false });
    let focusIconBlp = "";
    if (addProd > 0 || addGold > 0) {
      try { focusIconBlp = GetTownFocusBlp(cGrowthNum, cProjNum); } catch {}
    }
    const focusGoldRow = (value) => ({
      iconClass: "size-5 bg-contain bg-center bg-no-repeat",
      iconStyle: `background-image: url(${focusIconBlp});`,
      name: fmt(value),
      pill: goldPill(value),
    });
    const goldRows = [];
    if (baseProduction > 0) goldRows.push({ iconId: "YIELD_PRODUCTION", name: fmt(baseProduction), pill: goldPill(baseProduction) });
    if (addProd > 0) goldRows.push(focusGoldRow(addProd));
    if (addGold > 0) goldRows.push(focusGoldRow(addGold));
    if (baseGold > 0) goldRows.push({ iconId: "YIELD_GOLD", name: fmt(baseGold), pill: goldPill(baseGold) });
    if (goldRows.length) {
      sections.push({
        title: composeWithFallback("LOC_MOD_ETFI_GOLD_CONVERTED", "Town's Gold"),
        rows: goldRows,
      });
    }

    if (!this.isGrowingFocus()) {
      const foodCities = getConnectedCitiesFood(city);
      const addPerCity = addFood > 0 && foodCities.length ? addFood / foodCities.length : 0;
      const rows = foodCities
        .map((c) => ({ name: c.name, food: (typeof c.food === "number" ? c.food : 0) + addPerCity }))
        .filter((c) => c.food > 0)
        .map((c) => ({
          iconId: "CITY_URBAN",
          name: c.name,
          pill: { yieldType: "YIELD_FOOD", value: c.food },
        }));
      if (rows.length) {
        sections.push({
          title: composeWithFallback("LOC_MOD_ETFI_FOOD_TO_CITIES", "Food Sent"),
          rows,
        });
      }
    }

    this._goldFoodSections = sections;
  }
  // True when the hovered focus is the Growing Town (EXPAND growth / no project).
  isGrowingFocus() {
    const gt = this.target?.dataset?.growthType;
    const growthType = gt != null && gt !== "" ? Number(gt) : null;
    if (typeof GrowthTypes !== "undefined" && growthType === GrowthTypes.EXPAND) return true;
    const pt = this.getProjectType();
    if (typeof ProjectTypes !== "undefined" && pt === ProjectTypes.NO_PROJECT) return true;
    return false;
  }
  getRequirementsText() {
    const projectType = this.getProjectType() ?? -1;
    const project = GameInfo.Projects.lookup(projectType);
    if (!project) {
      return void 0;
    }
    if (project.PrereqPopulation > 0) {
      return Locale.compose("LOC_UI_PRODUCTION_REQUIRES_POPULATION", project.PrereqPopulation);
    }
    if (project.PrereqConstructible) {
      const definition = GameInfo.Constructibles.lookup(project.PrereqConstructible);
      if (definition) {
        return Locale.compose("LOC_UI_PRODUCTION_REQUIRES_CONSTRUCTIBLE", Locale.compose(definition.Name));
      }
    }
    return void 0;
  }
}

// ----------------------------------------------------------------------------
// New-tooltip wiring
// ----------------------------------------------------------------------------

// The single persistent content instance shown inside the Solid Tooltip.Frame.
const CONTENT = new EtfiTownFocusTooltipContent();

// Holds the Solid Tooltip root's auto-generated name (set on mount) so the
// legacy DOM hover handlers can trigger it.
const TOOLTIP_NAME = { value: null };

// Bridge child: reads the root context and stores its name. Renders nothing.
function NameCapture() {
  const ctx = useContext(TooltipContext);
  if (ctx) TOOLTIP_NAME.value = ctx.name;
  return null;
}

// Our concept-link sub-tooltips render via the legacy TooltipManager into the
// #tooltips layer, which has no z-index and sits BELOW the new tooltip layer
// (#uinext-tooltips, z-index 10000). So when this tooltip is locked and the user
// hovers a concept-link inside it, that sub-tooltip would appear hidden behind us.
// While (and only while) our tooltip is locked, lift #tooltips above the new layer
// so the concept sub-tooltips are visible; restore it when unlocked so we don't
// reorder tooltip layers for the rest of the game.
function LegacyLayerLift() {
  const ctx = useContext(TooltipContext);
  const model = TooltipModel.get();
  const layer = document.getElementById("tooltips");
  createEffect(() => {
    const locked = ctx ? model.isLocked(ctx.name) : false;
    if (layer) layer.style.zIndex = locked ? "10001" : "";
  });
  return null;
}

function TownFocusTooltipTree() {
  return createComponent(Tooltip, {
    // Anchor to the RIGHT of the hovered card so the (often wide) tooltip does
    // not cover the production / town-focus panel on the left.
    initialHPosition: TooltipHorizontalPosition.RIGHT,
    get children() {
      return [
        createComponent(NameCapture, {}),
        createComponent(LegacyLayerLift, {}),
        // Registration-only nested tooltip. It has no trigger/content so it never
        // displays, but mounting a nested <Tooltip> root bumps OUR root's
        // childTooltipCount to 1. Both the INSPECT hint (Tooltip.Frame ->
        // Tooltip.InspectHint, gated on childTooltipCount > 0) and the model's
        // lock()/auto-lock (same gate) require that count to be > 0. With it set,
        // the tooltip can be inspected/locked, after which the mouse can move into
        // it to hover the concept-link rows inside.
        createComponent(Tooltip, { get children() { return null; } }),
        createComponent(Tooltip.Content, {
          get children() {
            return createComponent(Tooltip.Frame, {
              get children() {
                return CONTENT.root;
              },
            });
          },
        }),
      ];
    },
  });
}

function mountTownFocusTooltip() {
  const root = document.body || document.documentElement;
  if (!root) { setTimeout(mountTownFocusTooltip, 200); return; }

  // Hidden host — Tooltip.Content portals itself into #uinext-tooltips, so the
  // host's position in the DOM is irrelevant.
  const host = document.createElement("div");
  host.style.display = "none";
  root.appendChild(host);
  render(() => createComponent(TownFocusTooltipTree, {}), host);

  const model = TooltipModel.get();
  // The card whose content is currently built/shown. Guards against rebuilding on
  // every bubbled mouseover (which reloaded icons and caused visible flicker) —
  // we only re-run update() when the hovered card actually changes.
  let shownCard = null;
  document.addEventListener("mouseover", (e) => {
    const card = e.target?.closest?.(CARD_SELECTOR);
    if (!card || !TOOLTIP_NAME.value) return;
    // Innermost-tooltip rule: if the cursor is over an inner element that carries
    // its OWN tooltip style (a concept-link row name -> etfi-text-tooltip), let
    // that legacy tooltip own the hover and do NOT also show the focus tooltip.
    // Otherwise both fire at once and overlap. (When the focus tooltip is locked
    // we leave it pinned so the user can still hover those links inside it.)
    const styled = e.target?.closest?.("[data-tooltip-style]");
    if (styled && styled !== card && card.contains(styled)) {
      if (!model.isLocked(TOOLTIP_NAME.value)) {
        model.triggerTooltip(TOOLTIP_NAME.value, TriggerType.Blur, card);
        shownCard = null;
      }
      return;
    }
    // Already showing this exact card — nothing to rebuild (prevents flicker).
    if (card === shownCard) return;
    if (CONTENT.setTarget(card)) {
      try { CONTENT.update(); } catch (err) { console.error("[ETFI] town-focus tooltip update failed", err); }
      shownCard = card;
      model.triggerTooltip(TOOLTIP_NAME.value, TriggerType.Focus, card);
    }
  }, true);
  document.addEventListener("mouseout", (e) => {
    const card = e.target?.closest?.(CARD_SELECTOR);
    if (!card || !TOOLTIP_NAME.value) return;
    // Only blur when actually leaving the card (not moving within it).
    if (!card.contains(e.relatedTarget)) {
      model.triggerTooltip(TOOLTIP_NAME.value, TriggerType.Blur, card);
      if (shownCard === card) shownCard = null;
    }
  }, true);
}

mountTownFocusTooltip();

// Suppress the base game's production tooltip for our cards: the cards point their
// data-tooltip-style at ETFI_TOWN_FOCUS_TOOLTIP_STYLE; registering a type here
// whose isBlank() is always true makes the legacy TooltipManager render nothing,
// leaving the field clear for our Solid tooltip above.
const NOOP_SUPPRESSOR = {
  isUpdateNeeded() { return false; },
  isBlank() { return true; },
  reset() {},
  update() {},
  getHTML() { return document.createElement("div"); },
};
try {
  TooltipManager.registerType(ETFI_TOWN_FOCUS_TOOLTIP_STYLE, NOOP_SUPPRESSOR);
} catch (e) {
  console.error("[ETFI] failed to register town-focus tooltip suppressor", e);
}
