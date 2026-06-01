// File Path: ui/production-chooser/town-focus-tooltip.js
//
// Author: Zatygold
//
// Custom hover tooltip for Town Focus options in the production chooser.
//
// This is a copy of the base game's `ProductionProjectTooltipType` (from
// base-standard/ui/production-chooser/panel-production-tooltips.js), renamed and
// registered under a UNIQUE tooltip style ("etfi-town-focus-tooltip"). The
// town-focus chooser items are pointed at this style (see
// etfi-town-focus-section.js, which sets dataset.tooltipStyle to
// ETFI_TOWN_FOCUS_TOOLTIP_STYLE) so this tooltip renders instead of the base one.
//
// It currently behaves IDENTICALLY to the base tooltip. It exists so the Town
// Focus tooltip can be customized later (e.g. injecting the
// <etfi-tooltip-details> breakdown) without touching the base game's shared
// tooltip type.

import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";
import { IsElement } from "/core/ui/utilities/utilities-dom.js";
import { GetTownFocusBlp } from "/base-standard/ui/production-chooser/production-chooser-helpers.js";
import { AdvisorUtilities } from "/base-standard/ui/tutorial/advisor-utilities.js";
import { getConnectedCitiesFood, getConvertedGold, composeWithFallback, isTownGrowing } from "../../etfi-utilities.js";
import { buildFocusModel, focusHeaderYield } from "../etfi-town-focus/focus-models.js";
import { fmt, renderSectionPanels, ETFI_SECTION_CFG } from "../etfi-details/etfi-render.js";
import { getHideDetails } from "../etfi-details/etfi-view-state.js";
// Imported for its side effect: registers the <etfi-tooltip-details> custom
// element (also loaded via modinfo) and provides the tag name we instantiate.
import { ETFI_TOOLTIP_DETAILS_TAG } from "../etfi-details/etfi-tooltip-details.js";
// Likewise registers the <etfi-tooltip-section-description> element and provides
// its tag name (the focus description block shown below the header).
import { ETFI_TOWN_FOCUS_SECTION_DESCRIPTION } from "../etfi-details/etfi-tooltip-section-description.js";

// The unique tooltip style name the town-focus items reference.
export const ETFI_TOWN_FOCUS_TOOLTIP_STYLE = "etfi-town-focus-tooltip";

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

// Copy of base ProductionProjectTooltipType (renamed). Customize freely.
class EtfiTownFocusTooltipType {
  _target = null;
  get target() {
    return this._target?.deref() ?? null;
  }
  set target(value) {
    this._target = value ? new WeakRef(value) : null;
  }
  // #region Element References
  tooltip = document.createElement("fxs-tooltip");
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
  details = document.createElement(ETFI_TOOLTIP_DETAILS_TAG);
  gemsContainer = document.createElement("div");
  // Two-column body used when the panel's details are hidden (see applyLayout):
  //   topRow = [leftDesc | divider | rightDesc]  (focus desc | generic desc)
  //   botRow = [leftCats | divider | rightCats]  (focus categories | Gold/Food)
  // The descriptions share a row so the first category on each side lines up.
  // Normal mode stacks everything in bodyRow; requirements is a footer in both.
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
  // Right-side Town's Gold + Food Sent for the hidden (two-column) layout,
  // rendered with the SAME cfg as the left categories so the first category on
  // each side lines up exactly. (Normal mode keeps using the `details` element.)
  rightDetails = document.createElement("div");
  // #endregion
  // Re-render counters bumped onto the data-rev attributes of the custom
  // elements to trigger their render() each time we set new content.
  _detailsRev = 0;
  _descRev = 0;
  // Cached Town's Gold + Food Sent sections (so the hidden layout can re-render
  // them with the inline cfg).
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
    this.tooltip.className = "flex w-96 text-accent-2 font-body text-sm";
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
    //   * sectionDescription — the focus-specific specialization text
    //     (data-description, e.g. "+1 Food on Farms..."), rendered by the
    //     <etfi-tooltip-section-description> element.
    //   * descDivider — a thin separator line between the two blocks.
    //   * description (legacy <p>) — the generic Town behavior
    //     (data-tooltip-description, e.g. "All of the Town's Production is
    //     converted into Gold..."), rendered exactly like the base tooltip.
    this.sectionDescription.className = "flex flex-col";
    this.descDivider.className = "w-full self-center shrink-0";
    this.descDivider.style.cssText =
      "height:0.0625rem; margin-top:0.4rem; margin-bottom:0.4rem; background-color:rgba(77, 83, 102, 0.7);";
    this.description.className = "text-2xs";
    // Body wrapper (always flex-col). Normal mode: a single stacked column.
    // Hidden mode: two stacked rows (descriptions, then categories), each split
    // left | divider | right, so the first category on each side lines up. The
    // requirements line is a footer below the body in both modes. The body width
    // is widened via inline style in hidden mode (see applyLayout).
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
    this.tooltip.append(this.glow, this.header, this.divider, this.bodyRow, this.requirementsContainer);
  }
  getHTML() {
    return this.tooltip;
  }
  reset() {
    return;
  }
  isUpdateNeeded(target) {
    const newTarget = target.closest("town-focus-chooser-item, production-chooser-item");
    if (this.target === newTarget) {
      return false;
    }
    this.target = newTarget;
    if (!this.target) {
      return false;
    }
    return true;
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
  getDescription() {
    if (!this.target) return null;
    if (IsElement(this.target, "town-focus-chooser-item")) {
      return this.target.dataset.tooltipDescription ?? null;
    }
    return this.target.dataset.description ?? null;
  }
  update() {
    if (!this.target) {
      console.error("EtfiTownFocusTooltipType.update: update triggered with no valid target");
      return;
    }
    const projectType = this.getProjectType();
    const cityID = UI.Player.getHeadSelectedCity();
    if (!cityID) {
      return;
    }
    const city = Cities.get(cityID);
    if (!city) {
      return;
    }
    const name = this.target.dataset.name ?? "";
    // Two distinct descriptions, mirroring the town-focus-chooser-item data:
    //   * focusDescription  (data-description) — the focus-specific
    //     specialization text (e.g. "+1 Food on Farms..."). Shown in the
    //     <etfi-tooltip-section-description> block directly below the header.
    //   * tooltipDescription (data-tooltip-description) — the generic Town
    //     behavior (e.g. "All of the Town's Production is converted into
    //     Gold..."). Shown in the legacy `description` <p>, exactly like base.
    // The Growing Town focus has no detail categories. In the two-column (hidden)
    // layout we surface its growth effect ("Increases Town's Growth by 50%.") on
    // the left and the Production->Gold behavior on the right; in single-column
    // mode it stays like the base tooltip (no section description).
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
      // Growing keeps its Food for growth, so use a Production->Gold-only line
      // (the game's default text wrongly says Food is sent to connected Cities).
      tooltipDescription = "LOC_MOD_ETFI_PRODUCTION_TO_GOLD";
    }
    const growthType = Number(this.target.dataset.growthType);
    const productionCost = projectType ? city.Production?.getProjectProductionCost(projectType) : -1;
    const requirementsText = this.getRequirementsText();
    this.header.setAttribute("title", name);
    // Hand the focus-specific description to the
    // <etfi-tooltip-section-description> element and trigger its render.
    this.sectionDescription.etfiDescription = focusDescription;
    this.sectionDescription.setAttribute("data-rev", String(++this._descRev));
    // Render the generic Town description in the legacy <p>, applying the base
    // game's bullet/paragraph spacing pass.
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
    const recommendations = this.target?.dataset.recommendations;
    if (recommendations) {
      const parsedRecommendations = JSON.parse(recommendations);
      const advisorList = parsedRecommendations.map((rec) => rec.class);
      const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
      this.gemsContainer.appendChild(recommendationTooltipContent);
    }
    this.gemsContainer.classList.toggle("hidden", !recommendations);
    this.applyLayout(city);
  }
  // Arrange the body. Normally everything stacks in one column. When the panel's
  // details are hidden, widen into two rows (descriptions, then categories) split
  // by a vertical divider: left = focus description + the focus's detail
  // categories; right = the generic Town description + Town's Gold + Food Sent.
  applyLayout(city) {
    if (getHideDetails()) {
      // Left categories: the hovered focus's breakdown (same look as inline).
      const sections = orderFocusSections(buildFocusModel(city, this.getProjectTypeString()));
      renderSectionPanels(this.focusDetails, sections, ETFI_SECTION_CFG);
      this.focusDetails.classList.toggle("hidden", sections.length === 0);

      this.tooltip.style.width = "44rem";
      this.descDivider.classList.add("hidden");
      // Center the requirements footer under the wide tooltip.
      this.requirementsContainer.classList.add("justify-center");
      this.requirementsText.classList.add("text-center");

      // Render the right Town's Gold + Food Sent with the SAME cfg as the left
      // categories so both sides' panels (margins, padding, spacing) are
      // identical — that's what makes the first category on each side line up.
      renderSectionPanels(this.rightDetails, this._goldFoodSections || [], ETFI_SECTION_CFG);

      // Two stacked rows so the first category on each side lines up: the
      // descriptions share a row (equal height via flex stretch), the categories
      // share the next. The two divider segments stack into one continuous rule.
      setChildren(this.leftDesc, [this.sectionDescription]);
      setChildren(this.rightDesc, [this.description, this.productionCost]);
      setChildren(this.leftCats, [this.focusDetails]);
      setChildren(this.rightCats, [this.rightDetails, this.gemsContainer]);
      setChildren(this.topRow, [this.leftDesc, this.colDividerTop, this.rightDesc]);
      setChildren(this.botRow, [this.leftCats, this.colDividerBot, this.rightCats]);
      setChildren(this.bodyRow, [this.topRow, this.botRow]);
    } else {
      this.tooltip.style.width = "";
      this.focusDetails.classList.add("hidden");
      this.requirementsContainer.classList.remove("justify-center");
      this.requirementsText.classList.remove("text-center");
      setChildren(this.bodyRow, [
        this.sectionDescription,
        this.descDivider,
        this.description,
        this.productionCost,
        this.details,
        this.gemsContainer,
      ]);
    }
  }
  // Feed the <etfi-tooltip-details> container its model and trigger a re-render
  // by bumping data-rev. Builds the default-Town breakdown:
  //   * Town's Gold: a divided row per source (Current Production, Potential
  //     Production, Current Gold), each shown as the Gold it yields,
  //   * Food Sent to Connected Cities: Food/turn sent to each connected City.
  // While the town is still Growing (no active focus), the hovered focus's
  // yields are unrealized, so we fold them into the preview: its Production into
  // Town's Gold (all Production converts to Gold) and its Food into Food Sent
  // (split evenly across the connected Cities). A specialized town already
  // realizes its focus, so its live values are shown unchanged.
  updateDetails(city) {
    const sections = [];

    let unrealizedProduction = 0;
    let unrealizedFood = 0;
    let unrealizedGold = 0;
    if (isTownGrowing(city) && !this.isGrowingFocus()) {
      const model = buildFocusModel(city, this.getProjectTypeString());
      unrealizedProduction = focusHeaderYield(model, "YIELD_PRODUCTION");
      unrealizedFood = focusHeaderYield(model, "YIELD_FOOD");
      unrealizedGold = focusHeaderYield(model, "YIELD_GOLD");
    }

    // Town's Gold — all of the Town's Production converts to Gold, plus any Gold
    // the focus grants directly (e.g. Fort, Resort). One divided row per source:
    // left = [icon] │ amount, right = the colored Gold it yields.
    //   * Current Production   ([production icon])  -> Gold,
    //   * Potential Production ([focus icon])       -> Gold,   (Growing + focus adds Prod)
    //   * Current Gold         ([gold icon]),
    //   * Potential Gold       ([focus icon]).               (Growing + focus adds Gold)
    const { production, gold } = getConvertedGold(city);
    const goldPill = (value) => ({ yieldType: "YIELD_GOLD", value, sign: false });
    // Focus icon (background image) for the "potential" preview rows.
    let focusIconBlp = "";
    if (unrealizedProduction > 0 || unrealizedGold > 0) {
      try { focusIconBlp = GetTownFocusBlp(Number(this.target?.dataset?.growthType), this.getProjectType()); } catch {}
    }
    const focusGoldRow = (value) => ({
      iconClass: "size-5 bg-contain bg-center bg-no-repeat",
      iconStyle: `background-image: url(${focusIconBlp});`,
      name: fmt(value),
      pill: goldPill(value),
    });
    const goldRows = [];
    if (production > 0) goldRows.push({ iconId: "YIELD_PRODUCTION", name: fmt(production), pill: goldPill(production) });
    if (unrealizedProduction > 0) goldRows.push(focusGoldRow(unrealizedProduction));
    if (gold > 0) goldRows.push({ iconId: "YIELD_GOLD", name: fmt(gold), pill: goldPill(gold) });
    if (unrealizedGold > 0) goldRows.push(focusGoldRow(unrealizedGold));
    if (goldRows.length) {
      sections.push({
        title: composeWithFallback("LOC_MOD_ETFI_GOLD_CONVERTED", "Town's Gold"),
        rows: goldRows,
      });
    }

    // Food Sent to Connected Cities — one row per connected City. While Growing
    // the town sends nothing (getSentFoodPerCity() is 0), so we preview the
    // focus's Food split evenly across the Cities. The Growing Town focus keeps
    // its Food for growth, so it shows no Food-Sent section.
    if (!this.isGrowingFocus()) {
      const foodCities = getConnectedCitiesFood(city);
      const addPerCity = unrealizedFood > 0 && foodCities.length ? unrealizedFood / foodCities.length : 0;
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
    this.details.etfiModel = { sections };
    // Hide the host when there's nothing to show.
    this.details.classList.toggle("hidden", sections.length === 0);
    this.details.setAttribute("data-rev", String(++this._detailsRev));
  }
  // True when the hovered focus is the Growing Town (EXPAND growth / no project)
  // — it keeps its Food for growth instead of sending it to connected Cities.
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
  isBlank() {
    return !this.target;
  }
}

// Register our tooltip under its unique style name.
try {
  TooltipManager.registerType(ETFI_TOWN_FOCUS_TOOLTIP_STYLE, new EtfiTownFocusTooltipType());
} catch (e) {
  console.error("[ETFI] failed to register town-focus tooltip", e);
}

export { EtfiTownFocusTooltipType };
