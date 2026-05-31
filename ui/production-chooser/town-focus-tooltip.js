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
import { getConnectedCitiesFood, getConvertedGold, getGrowthSavings, composeWithFallback } from "../../etfi-utilities.js";
// Imported for its side effect: registers the <etfi-tooltip-details> custom
// element (also loaded via modinfo) and provides the tag name we instantiate.
import { ETFI_TOOLTIP_DETAILS_TAG } from "../etfi-details/etfi-tooltip-details.js";

// The unique tooltip style name the town-focus items reference.
export const ETFI_TOWN_FOCUS_TOOLTIP_STYLE = "etfi-town-focus-tooltip";

const bulletChar = String.fromCodePoint(8226);

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
  description = document.createElement("p");
  productionCost = document.createElement("div");
  requirementsContainer = document.createElement("div");
  requirementsText = document.createElement("div");
  details = document.createElement(ETFI_TOOLTIP_DETAILS_TAG);
  gemsContainer = document.createElement("div");
  // #endregion
  // Re-render counter bumped onto the <etfi-tooltip-details> data-rev attribute
  // to trigger its render() each time we set a new model.
  _detailsRev = 0;
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
    this.tooltip.append(
      this.glow,
      this.header,
      this.divider,
      this.description,
      this.productionCost,
      this.requirementsContainer,
      this.details,
      this.gemsContainer
    );
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
    const description = (this.target.dataset.tooltipDescription || this.target.dataset.description) ?? "";
    const growthType = Number(this.target.dataset.growthType);
    const productionCost = projectType ? city.Production?.getProjectProductionCost(projectType) : -1;
    const requirementsText = this.getRequirementsText();
    this.header.setAttribute("title", name);
    this.description.innerHTML = description ? Locale.stylize(description) : "";
    let firstChild = true;
    let prevChildisList = false;
    for (const node of this.description.children) {
      const isList = Boolean(node.innerHTML.match(bulletChar));
      if (isList) node.classList.add("ml-4");
      if (!firstChild) {
        if (!prevChildisList || !isList) {
          node.classList.add("mt-2");
        }
      } else {
        firstChild = false;
      }
      prevChildisList = isList;
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
  }
  // Feed the <etfi-tooltip-details> container its model and trigger a re-render
  // by bumping data-rev. Builds the default-Town breakdown:
  //   * Converted Gold: Production (converted) + base Gold = total Gold/turn,
  //   * Food Sent to Connected Cities: Food/turn sent to each connected City.
  updateDetails(city) {
    const sections = [];

    // Total Gold — all of the Town's Production is converted into Gold, so the
    // total Gold/turn = Production + base Gold. One inline row: Production and
    // Gold (split by a vertical divider) on the left, the total as a pill right.
    const { production, gold, total } = getConvertedGold(city);
    if (production > 0 || gold > 0) {
      sections.push({
        title: composeWithFallback("LOC_MOD_ETFI_GOLD_CONVERTED", "Gold Converted"),
        rows: [
          {
            items: [
              { yieldType: "YIELD_PRODUCTION", value: production },
              { yieldType: "YIELD_GOLD", value: gold },
            ],
            pill: { yieldType: "YIELD_GOLD", value: total },
          },
        ],
      });
    }

    if (this.isGrowingFocus()) {
      // Growing Town keeps its Food (NOT sent to Cities); the +50% growth focus
      // lowers the Food needed to grow. Show the Food and Turns it saves.
      const sav = getGrowthSavings(city);
      if (sav && (sav.foodSaved > 0 || (sav.turnsSaved != null && sav.turnsSaved > 0))) {
        const rows = [];
        if (sav.foodSaved > 0) {
          rows.push({
            name: composeWithFallback("LOC_MOD_ETFI_FOOD_SAVED", "Food Saved"),
            pill: { yieldType: "YIELD_FOOD", value: sav.foodSaved },
          });
        }
        if (sav.turnsSaved != null && sav.turnsSaved > 0) {
          rows.push({
            name: composeWithFallback("LOC_MOD_ETFI_TURNS_SAVED", "Turns Saved"),
            valueText: String(sav.turnsSaved),
          });
        }
        if (rows.length) {
          sections.push({ title: composeWithFallback("LOC_MOD_ETFI_GROWTH", "Growth"), rows });
        }
      }
    } else {
      // Food Sent to Connected Cities — one row per connected City (only when the
      // Town is actually sending Food, i.e. getSentFoodPerCity() > 0).
      const foodCities = getConnectedCitiesFood(city)
        .filter((c) => typeof c.food === "number" && c.food > 0);
      if (foodCities.length) {
        sections.push({
          title: composeWithFallback("LOC_MOD_ETFI_FOOD_TO_CITIES", "Food Sent"),
          rows: foodCities.map((c) => ({
            iconId: "CITY_URBAN",
            name: c.name,
            pill: { yieldType: "YIELD_FOOD", value: c.food },
          })),
        });
      }
    }

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
