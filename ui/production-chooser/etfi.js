
/**
 * Enhanced Town Focus Info Mod - Makes Town Focus Tooltips more informative
 * Author: Zatygold
 * Version: 2.0.2
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.js';
import { GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/advisor-utilities.js';

import FoodFocusDetails from '../etfi-town-focus/farm-fish-towns.js';
import MiningDetails from '../etfi-town-focus/mining-town.js';
import HubDetails from '../etfi-town-focus/hub-town.js';
import ResortDetails from '../etfi-town-focus/resort-town.js';
import TradeDetails from '../etfi-town-focus/trade-town.js';
import TempleDetails from '../etfi-town-focus/temple-town.js';
import UrbanCenterDetails from '../etfi-town-focus/urban-town.js';
import FortTownDetails from '../etfi-town-focus/fort-town.js';

import { ETFI_YIELDS, renderHeader } from '../../etfi-utilities.js';

// #region ETFI aliases

const ETFI_PROJECT_KEY_ALIASES = {
  FARMING: [
    "PROJECT_TOWN_GRANARY",
    "TOWN_GRANARY",
    "LOC_PROJECT_TOWN_GRANARY_NAME",
    "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH",
  ],

  FISHING: [
    "PROJECT_TOWN_FISHING",
    "TOWN_FISHING",
    "LOC_PROJECT_TOWN_FISHING_NAME",
  ],

  MINING: [
    "PROJECT_TOWN_PRODUCTION",
    "PROJECT_TOWN_MINING",
    "TOWN_PRODUCTION",
    "TOWN_MINING",
    "LOC_PROJECT_TOWN_PRODUCTION_NAME",
  ],

  HUB: [
    "PROJECT_TOWN_INN",
    "PROJECT_TOWN_HUB",
    "TOWN_INN",
    "TOWN_HUB",
    "LOC_PROJECT_TOWN_INN_NAME",
  ],

  TRADE: [
    "PROJECT_TOWN_TRADE",
    "TOWN_TRADE",
    "LOC_PROJECT_TOWN_TRADE_NAME",
  ],

  RESORT: [
    "PROJECT_TOWN_RESORT",
    "TOWN_RESORT",
    "LOC_PROJECT_TOWN_RESORT_NAME",
  ],

  TEMPLE: [
    "PROJECT_TOWN_TEMPLE",
    "TOWN_TEMPLE",
    "LOC_PROJECT_TOWN_TEMPLE_NAME",
  ],

  URBAN: [
    "PROJECT_TOWN_URBAN_CENTER",
    "PROJECT_TOWN_URBAN",
    "TOWN_URBAN_CENTER",
    "TOWN_URBAN",
    "LOC_PROJECT_TOWN_URBAN_CENTER_NAME",
  ],

  FORT: [
    "PROJECT_TOWN_FORT",
    "TOWN_FORT",
    "LOC_PROJECT_TOWN_FORT_NAME",
  ],
};

// #endregion

// #region ETFI Fallback Yields

const ETFI_FALLBACK_YIELDS = Object.freeze({
  FOOD: [ETFI_YIELDS.FOOD],
  PRODUCTION: [ETFI_YIELDS.PRODUCTION],
  INFLUENCE: [ETFI_YIELDS.INFLUENCE],
  TRADE: [ETFI_YIELDS.TRADE, ETFI_YIELDS.HAPPINESS],
  RESORT: [ETFI_YIELDS.HAPPINESS, ETFI_YIELDS.GOLD],
  TEMPLE: [ETFI_YIELDS.HAPPINESS],
  URBAN: [ETFI_YIELDS.GOLD, ETFI_YIELDS.HAPPINESS],
  FORT: [ETFI_YIELDS.FORTIFY],
});

// #endregion

// #region #region ETFI registry

const ETFI_TOWN_FOCUS_REGISTRY = new Map();

function registerTownFocus(keys, config) {
  for (const key of keys) {
    ETFI_TOWN_FOCUS_REGISTRY.set(key, config);
  }
}

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.FARMING, {
  debugName: "Farming / Growth",
  yields: ETFI_FALLBACK_YIELDS.FOOD,
  createRenderer: () => new FoodFocusDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.FISHING, {
  debugName: "Fishing",
  yields: ETFI_FALLBACK_YIELDS.FOOD,
  createRenderer: () => new FoodFocusDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.MINING, {
  debugName: "Mining / Production",
  yields: ETFI_FALLBACK_YIELDS.PRODUCTION,
  createRenderer: () => new MiningDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.HUB, {
  debugName: "Hub / Inn",
  yields: ETFI_FALLBACK_YIELDS.INFLUENCE,
  createRenderer: () => new HubDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.TRADE, {
  debugName: "Trade",
  yields: ETFI_FALLBACK_YIELDS.TRADE,
  createRenderer: () => new TradeDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.RESORT, {
  debugName: "Resort",
  yields: ETFI_FALLBACK_YIELDS.RESORT,
  createRenderer: () => new ResortDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.TEMPLE, {
  debugName: "Temple",
  yields: ETFI_FALLBACK_YIELDS.TEMPLE,
  createRenderer: () => new TempleDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.URBAN, {
  debugName: "Urban Center",
  yields: ETFI_FALLBACK_YIELDS.URBAN,
  createRenderer: () => new UrbanCenterDetails(),
});

registerTownFocus(ETFI_PROJECT_KEY_ALIASES.FORT, {
  debugName: "Fort",
  yields: ETFI_FALLBACK_YIELDS.FORT,
  createRenderer: () => new FortTownDetails(),
});

// #endregion

// #region EtfiToolTipType

const bulletChar = String.fromCodePoint(8226);

class EtfiToolTipType {
    _target = null;
    get target() {
      return this._target?.deref() ?? null;
    }
    set target(value) {
      this._target = value ? new WeakRef(value) : null;
    }
    tooltip = document.createElement("fxs-tooltip");
    icon = document.createElement("fxs-icon");
    header = document.createElement("fxs-header");
    divider = document.createElement("div");
    glow = document.createElement("div");
    description = document.createElement("p");
    detailsContainer = document.createElement("div");  // NEW: extra “details” block (ETFI info)
    productionCost = document.createElement("div");
    requirementsContainer = document.createElement("div");
    requirementsText = document.createElement("div");
    gemsContainer = document.createElement("div");
   
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
      this.detailsContainer.className = "flex mt-2 p-2 production-chooser-tooltip__subtext-bg etfi-details"; // NEW: details block
      this.productionCost.className = "mt-2";
      this.requirementsContainer.className = "flex mt-2 p-2 production-chooser-tooltip__subtext-bg";
      this.requirementsContainer.append(this.requirementsText);
      this.gemsContainer.className = "mt-10";
      this.tooltip.append(
        this.glow,
        this.header,
        this.divider,
        this.description,
        this.detailsContainer, // NEW: ETFI Container
        this.productionCost,
        this.requirementsContainer,
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
        console.error("EtfiTooltipType.update: update triggered with no valid target");
        return;
      }
      const projectType = this.getProjectType();
      const cityID = UI.Player.getHeadSelectedCity();
      if (!cityID) { return; }
      const city = Cities.get(cityID);
      if (!city) { return; }
      const name = this.target.dataset.name ?? "";
      const description = (this.target.dataset.tooltipDescription || this.target.dataset.description) ?? "";
      const detailsText = IsElement(this.target, "town-focus-chooser-item") ? this.getDetailsText(city) : void 0;   // NEW: project-specific ETFI data
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

      // NEW: apply detailsText
      if (detailsText) {
        this.detailsContainer.innerHTML = detailsText;
        this.detailsContainer.classList.remove("hidden");
      } else {
        this.detailsContainer.innerHTML = "";
        this.detailsContainer.classList.add("hidden");
      }

      if (requirementsText) {
        this.requirementsText.innerHTML = requirementsText;
        this.requirementsContainer.classList.remove("hidden");
      } else {
        this.requirementsContainer.classList.add("hidden");
      }

      // NEW: Small fix | clear gemsContainer so it doesn’t stack icons on repeated updates
      while (this.gemsContainer.hasChildNodes()) {
        this.gemsContainer.removeChild(this.gemsContainer.lastChild);
      }
      
      const recommendations = this.target?.dataset.recommendations;
      if (recommendations) {
        const parsedRecommendations = JSON.parse(recommendations);
        const advisorList = parsedRecommendations.map((rec) => rec.class);
        const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
        this.gemsContainer.appendChild(recommendationTooltipContent);
      }
      this.gemsContainer.classList.toggle("hidden", !recommendations);
    }
    getProjectInfo() {
      const projectType = this.getProjectType();
    
      if (projectType === null || projectType === undefined || Number.isNaN(projectType)) {
        return null;
      }
    
      return GameInfo?.Projects?.lookup?.(projectType) ?? null;
    }

    getTownFocusKey() {
      if (!this.target || !IsElement(this.target, "town-focus-chooser-item")) {
        return null;
      }
    
      const growthType = Number(this.target.dataset.growthType);
    
      // Default Growth focus. Source uses GrowthTypes.EXPAND + ProjectTypes.NO_PROJECT.
      if (
        typeof GrowthTypes !== "undefined" &&
        growthType === GrowthTypes.EXPAND
      ) {
        return this.target.dataset.name ?? "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";
      }
    
      const projectInfo = this.getProjectInfo();
      if (projectInfo?.ProjectType) {
        return projectInfo.ProjectType;
      }
    
      return this.target.dataset.name ?? null;
    }
    
    getTownFocusRegistryEntry() {
      if (!this.target || !IsElement(this.target, "town-focus-chooser-item")) {
        return null;
      }
    
      const focusKey = this.getTownFocusKey();
    
      if (focusKey && ETFI_TOWN_FOCUS_REGISTRY.has(focusKey)) {
        return ETFI_TOWN_FOCUS_REGISTRY.get(focusKey);
      }
    
      const projectInfo = this.getProjectInfo();
      const nameKey = this.target.dataset.name;
    
      console.warn("[ETFI] No town focus registry entry found", {
        focusKey,
        projectType: this.getProjectType(),
        projectTypeKey: projectInfo?.ProjectType,
        nameKey,
        projectInfo,
        growthType: this.target.dataset.growthType,
        target: this.target,
      });
    
      return null;
    }

    getDetailsText(city) {
      const entry = this.getTownFocusRegistryEntry();
      if (!entry) return null;
    
      try {
        const renderer = entry.createRenderer?.();
        const html = renderer?.render?.(city);
    
        return html || this.renderEmptyDetailsHTML(entry.yields);
      } catch (error) {
        console.error("[ETFI] Failed to render town focus details", {
          focus: entry.debugName,
          error,
          target: this.target,
          projectType: this.getProjectType(),
          projectInfo: this.getProjectInfo(),
        });
    
        return this.renderEmptyDetailsHTML(entry.yields);
      }
    }

    renderEmptyDetailsHTML(yields) {
      const normalizedYields = Array.isArray(yields) ? yields.filter(Boolean) : yields ? [yields] : [];
      return `
        <div class="flex flex-col w-full">
          ${renderHeader(normalizedYields, 0)}
        </div>
      `;
    }

    getRequirementsText() {
      const project = this.getProjectInfo();
    
      if (!project) {
        return null;
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
    
      return null;
    }

    isBlank() {
      return !this.target;
    }
}
// #endregion

// IMPORTANT: this overrides the existing handler for *only* this tooltip type.
TooltipManager.registerType("production-project-tooltip", new EtfiToolTipType());

export { EtfiToolTipType as default };
