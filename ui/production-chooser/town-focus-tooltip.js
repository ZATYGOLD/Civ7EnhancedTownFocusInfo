// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Hover tooltip for Town Focus cards, built on the game's Solid/ui-next tooltip
// system so it inherits the framed look, filigree border and INSPECT lock hint.
//
// The cards are legacy DOM and cannot be wrapped in a Solid <Tooltip.Trigger>,
// so instead: mount one Solid <Tooltip>, capture the root's auto-generated name
// via a bridge child, and on hover call triggerTooltip(name, Focus/Blur, card).
//
// A no-op legacy type is registered under ETFI_TOWN_FOCUS_TOOLTIP_STYLE so the
// base game's production tooltip stays suppressed for these cards — a registered
// type whose isBlank() returns true makes the legacy manager render nothing.

import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";
import { GetTownFocusBlp } from "/base-standard/ui/production-chooser/production-chooser-helpers.js";
import { AdvisorUtilities } from "/base-standard/ui/tutorial/advisor-utilities.js";
import { render } from "/core/vendor/solid-js/web/dist/web.js";
import { createComponent, useContext, createEffect, createSignal } from "/core/vendor/solid-js/dist/solid.js";
import { Tooltip, TooltipContext, TooltipHorizontalPosition } from "/core/ui-next/components/tooltip.js";
import { TooltipModel } from "/core/ui-next/components/tooltip-model.js";
import { TriggerType } from "/core/ui-next/components/trigger.js";
import { getConnectedCitiesFood, getConvertedGold, composeWithFallback, isTownGrowing, isGrowthFocusEl } from "../utilities/utilities-town-focus.js";
import { buildFocusModel, focusHeaderYield } from "../town-focus/focus-models.js";
import { fmt, renderSectionPanels, setChildren, applyListSpacing, splitSectionsByPanel, ETFI_SECTION_CFG, ETFI_DETAILS_CFG } from "../components/town-focus-rows.js";
import { getHideDetails } from "../components/town-focus-view-state.js";
import { ETFI_TOWN_FOCUS_SECTION_DESCRIPTION } from "../components/etfi-tooltip-section-description.js";

// The unique tooltip style name the town-focus items reference (see
// town-focus-section-decorator.js). Kept so the base tooltip is overridden/suppressed.
export const ETFI_TOWN_FOCUS_TOOLTIP_STYLE = "etfi-town-focus-tooltip";

// The legacy DOM tag of a Town Focus card. Scoped to town-focus cards only — we
// now drive triggering ourselves, so we must NOT fire on generic production items.
const CARD_SELECTOR = "town-focus-chooser-item";

function orderFocusSections(model) {
  const { top, mid, bottom } = splitSectionsByPanel(model?.sections);
  return [...top, ...mid, ...bottom];
}

class EtfiTownFocusTooltipContent {
  target = null;
  // `root` replaces the legacy <fxs-tooltip> shell: the Solid Tooltip.Frame now
  // provides the border/background/INSPECT hint, so this is a plain column.
  root = document.createElement("div");
  icon = document.createElement("fxs-icon");
  header = document.createElement("fxs-header");
  divider = document.createElement("div");
  glow = document.createElement("div");
  sectionDescription = document.createElement(ETFI_TOWN_FOCUS_SECTION_DESCRIPTION);
  descDivider = document.createElement("div");
  description = document.createElement("p");
  productionCost = document.createElement("div");
  requirementsContainer = document.createElement("div");
  requirementsText = document.createElement("div");
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
  _descRev = 0;
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
    // Divider height/color come from town-focus-section-decorator.css; the vertical margin is
    // specific to this separator so it stays inline.
    this.descDivider.className = "w-full self-center shrink-0 etfi-divider-h";
    this.descDivider.style.marginTop = "0.4rem";
    this.descDivider.style.marginBottom = "0.4rem";
    this.description.className = "text-2xs";
    this.bodyRow.className = "flex flex-col w-full";
    this.topRow.className = "flex flex-row w-full";
    this.botRow.className = "flex flex-row w-full";
    for (const cell of [this.leftDesc, this.rightDesc, this.leftCats, this.rightCats]) {
      cell.className = "flex flex-col flex-1 min-w-0";
    }
    this.colDividerTop.className = "self-stretch shrink-0 mx-3 etfi-divider-v";
    this.colDividerBot.className = "self-stretch shrink-0 mx-3 etfi-divider-v";
    this.focusDetails.className = "flex flex-col hidden";
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
      focusDescription = this.target.dataset.description || "";
      if (!focusDescription) {
        try {
          const def = projectType ? GameInfo.Projects.lookup(projectType) : null;
          if (def?.Description) focusDescription = def.Description;
        } catch (e) {
          console.error("[ETFI] project description lookup failed", e);
        }
      }
    }
    let tooltipDescription = this.target.dataset.tooltipDescription || "";
    if (growing && hidden) {
      tooltipDescription = "LOC_MOD_ETFI_PRODUCTION_TO_GOLD";
    }
    const growthType = Number(this.target.dataset.growthType);
    const productionCost = projectType ? city.Production?.getProjectProductionCost(projectType) : -1;
    const requirementsText = this.getRequirementsText();
    this.header.setAttribute("title", name);
    this.sectionDescription.etfiDescription = focusDescription;
    this.sectionDescription.setAttribute("data-rev", String(++this._descRev));
    this.description.innerHTML = tooltipDescription ? Locale.stylize(tooltipDescription) : "";
    this.description.classList.toggle("hidden", !tooltipDescription);
    this.descDivider.classList.toggle("hidden", !(focusDescription && tooltipDescription));
    applyListSpacing(this.description);
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
  // Widen (or restore) the Tooltip.Frame hosting this content. `img-tooltip-border`
  // caps at 30rem, narrower than our 44rem two-column layout, so without the
  // game's own `--wide` variant (60rem) the right column spills over the map.
  //
  // MUST go through a Solid signal, not the DOM: applyLayout runs from update(),
  // which happens BEFORE triggerTooltip() mounts the tooltip, so the content root
  // is still detached and has no frame parent to poke.
  setWideFrame(wide) {
    setWideFrameSignal(!!wide);
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
      this.root.classList.add("etfi-tooltip-wide");
      // Tooltip.Frame carries `img-tooltip-border`, which the game's stylesheet
      // caps at max-width 30rem — narrower than our 44rem two-column layout, so
      // the right column would overflow and render outside the frame. The game
      // ships an opt-in wide variant (max-width 60rem) for exactly this.
      this.setWideFrame(true);
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
      this.root.classList.remove("etfi-tooltip-wide");
      this.setWideFrame(false);
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
  isGrowingFocus() {
    return isGrowthFocusEl(this.target);
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

// Whether the frame must use the game's wide variant (60rem) instead of the
// default 30rem cap — true while the panel's details are collapsed and this
// tooltip renders its 44rem two-column layout. Read reactively by Tooltip.Frame
// below, so it applies on the very first render of the tooltip.
const [isWideFrame, setWideFrameSignal] = createSignal(false);

const CONTENT = new EtfiTownFocusTooltipContent();

const TOOLTIP_NAME = { value: null };

function NameCapture() {
  const ctx = useContext(TooltipContext);
  if (ctx) TOOLTIP_NAME.value = ctx.name;
  return null;
}

// Sub-tooltips render into the legacy #tooltips layer, which has no z-index and
// sits below #uinext-tooltips (10000) — so they'd hide behind this tooltip when
// it's locked. Lift #tooltips only while locked, so we don't reorder the game's
// tooltip layers for the rest of the session.
function LegacyLayerLift() {
  const ctx = useContext(TooltipContext);
  const model = TooltipModel.get();
  const layer = document.getElementById("tooltips");
  createEffect(() => {
    const locked = ctx ? model.isLocked(ctx.name) : false;
    if (layer) layer.classList.toggle("etfi-legacy-layer-lift", locked);
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
        // Registration-only: no trigger or content, so it never displays, but
        // mounting a nested <Tooltip> registers it on our root. Both the INSPECT
        // hint and lock()/auto-lock are gated on having at least one registered
        // child, so this is what makes the tooltip lockable at all. (1.5.0
        // renamed the gate from a counter to childTooltipList; trick unchanged.)
        createComponent(Tooltip, { get children() { return null; } }),
        createComponent(Tooltip.Content, {
          get children() {
            return createComponent(Tooltip.Frame, {
              get ["class"]() {
                return isWideFrame() ? "img-tooltip-border--wide" : "";
              },
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

  // ModelRegistry only resolves models once the engine is ready; touching
  // TooltipModel before then throws. This runs at module load, so an unguarded
  // throw would abort the entire module — including the ETFI_TOWN_FOCUS_TOOLTIP_STYLE
  // export that town-focus-section-decorator.js imports. Retry instead of dying.
  let model;
  try {
    model = TooltipModel.get();
  } catch {
    setTimeout(mountTownFocusTooltip, 250);
    return;
  }

  const host = document.createElement("div");
  host.style.display = "none";
  root.appendChild(host);
  try {
    // Solid's render() returns the disposer for this root; keep it so the
    // teardown below can unwind the reactive tree, not just the listeners.
    disposeSolidRoot = render(() => createComponent(TownFocusTooltipTree, {}), host);
  } catch (e) {
    console.error("[ETFI] town-focus tooltip mount failed", e);
    return;
  }
  // The card whose content is currently built/shown. Guards against rebuilding on
  // every bubbled mouseover (which reloaded icons and caused visible flicker) —
  // we only re-run update() when the hovered card actually changes.
  let shownCard = null;

  const onMouseOver = (e) => {
    const card = e.target?.closest?.(CARD_SELECTOR);
    if (!card || !TOOLTIP_NAME.value) return;
    // Innermost-tooltip rule: if the cursor is over an inner element with its own
    // tooltip style, let that one own the hover — otherwise both fire and overlap.
    // While locked we leave ours pinned so those links stay hoverable inside it.
    const styled = e.target?.closest?.("[data-tooltip-style]");
    if (styled && styled !== card && card.contains(styled)) {
      if (!model.isLocked(TOOLTIP_NAME.value)) {
        model.triggerTooltip(TOOLTIP_NAME.value, TriggerType.Blur, card);
        shownCard = null;
      }
      return;
    }
    // Guard against rebuilding on every bubbled mouseover (causes flicker).
    if (card === shownCard) return;
    if (CONTENT.setTarget(card)) {
      try { CONTENT.update(); } catch (err) { console.error("[ETFI] town-focus tooltip update failed", err); }
      shownCard = card;
      model.triggerTooltip(TOOLTIP_NAME.value, TriggerType.Focus, card);
    }
  };

  const onMouseOut = (e) => {
    const card = e.target?.closest?.(CARD_SELECTOR);
    if (!card || !TOOLTIP_NAME.value) return;
    if (!card.contains(e.relatedTarget)) {
      model.triggerTooltip(TOOLTIP_NAME.value, TriggerType.Blur, card);
      if (shownCard === card) shownCard = null;
    }
  };

  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);

  // Teardown counterpart to the mount. Nothing calls it during normal play —
  // the tooltip is a session singleton — but it keeps the listeners and the
  // Solid root removable rather than permanently pinned.
  disposeTownFocusTooltip = () => {
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    try { disposeSolidRoot?.(); } catch (e) { console.error("[ETFI] tooltip dispose failed", e); }
    disposeSolidRoot = null;
    try { host.remove(); } catch {}
    shownCard = null;
    disposeTownFocusTooltip = null;
  };
}

let disposeTownFocusTooltip = null;
let disposeSolidRoot = null;

export function unmountTownFocusTooltip() {
  disposeTownFocusTooltip?.();
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
