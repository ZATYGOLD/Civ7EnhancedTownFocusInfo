
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.chunk.js';
import { c as GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';

// #region Etfi Improvements
const ETFI_IMPROVEMENTS = {
  displayNames: {
    IMPROVEMENT_WOODCUTTER: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
    IMPROVEMENT_WOODCUTTER_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_WOODCUTTER",
    IMPROVEMENT_MINE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
    IMPROVEMENT_MINE_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_MINE",
    IMPROVEMENT_FISHING_BOAT: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FISHING_BOAT_RESOURCE: "LOC_MOD_ETFI_IMPROVEMENT_FISHING_BOAT",
    IMPROVEMENT_FARM: "LOC_MOD_ETFI_IMPROVEMENT_FARM",
    IMPROVEMENT_PASTURE: "LOC_MOD_ETFI_IMPROVEMENT_PASTURE",
    IMPROVEMENT_PLANTATION: "LOC_MOD_ETFI_IMPROVEMENT_PLANTATION",
    IMPROVEMENT_CAMP: "LOC_MOD_ETFI_IMPROVEMENT_CAMP",
    IMPROVEMENT_CLAY_PIT: "LOC_MOD_ETFI_IMPROVEMENT_CLAY_PIT",
    IMPROVEMENT_QUARRY: "LOC_MOD_ETFI_IMPROVEMENT_QUARRY",
  },
  sets: {
    food: new Set([
      "IMPROVEMENT_FARM",
      "IMPROVEMENT_PASTURE",
      "IMPROVEMENT_PLANTATION",
      "IMPROVEMENT_FISHING_BOAT",
      "IMPROVEMENT_FISHING_BOAT_RESOURCE",
    ]),
    production: new Set([
      "IMPROVEMENT_CAMP",
      "IMPROVEMENT_WOODCUTTER",
      "IMPROVEMENT_WOODCUTTER_RESOURCE",
      "IMPROVEMENT_CLAY_PIT",
      "IMPROVEMENT_MINE",
      "IMPROVEMENT_MINE_RESOURCE",
      "IMPROVEMENT_QUARRY",
    ]),
  },
};

function getImprovementBonus(city) {
  if (!city || !city.Constructibles) {
    return { total: 0, details: {}, multiplier: 1 };
  }

  const targetImprovements = Array.from(ETFI_IMPROVEMENTS.sets.food);
  const targetSet = new Set(targetImprovements);

  const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];
  const detailedCounts = {};

  for (const instanceId of improvements) {
    const instance = Constructibles.get(instanceId);
    if (!instance) continue;

    const location = instance?.location;
    if (location?.x == null || location?.y == null) continue;

    // Using free constructible to get the warehouse bonus
    const fcID = Districts.getFreeConstructible(
      location,
      GameContext.localPlayerID
    );
    const info = GameInfo.Constructibles.lookup(fcID);
    if (!info) continue;

    if (targetSet.has(info.ConstructibleType)) {
      const displayName = Locale.compose(
        ETFI_IMPROVEMENTS.displayNames[info.ConstructibleType] ||
          info.ConstructibleType
      );
      detailedCounts[displayName] = (detailedCounts[displayName] || 0) + 1;
    }
  }

  const baseTotal = Object.values(detailedCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Food towns use +1/+2/+3 by era (same as your old code: base 1 + age bonus)
  let multiplier = 1;
  const ageData = GameInfo.Ages.lookup(Game.age);
  if (ageData) {
    const currentAge = ageData.AgeType?.trim();
    if (currentAge === "AGE_EXPLORATION") {
      multiplier = 2;
    } else if (currentAge === "AGE_MODERN") {
      multiplier = 3;
    }
  }

  return {
    total: baseTotal * multiplier,
    details: detailedCounts,
    multiplier,
  };
}

// #region Render Tooltip Logic
function renderGranaryBlock(etfiTooltipInstance, city) {
  const tooltipRoot = etfiTooltipInstance.tooltip;
  if (!tooltipRoot) return;

  // Only apply to the specific project
  const projectNameId = etfiTooltipInstance.target?.dataset?.name;
  if (projectNameId !== "LOC_PROJECT_TOWN_GRANARY_NAME") return;

  const bonus = getImprovementBonus(city);

  // Reuse container if it already exists
  let container = tooltipRoot.querySelector(".etfi-granary-block");
  if (container) {
    container.remove(); // remove old one so we can rebuild cleanly
  }

  container = document.createElement("div");
  container.className =
    "etfi-granary-block mt-2 p-2 rounded-md production-chooser-tooltip__subtext-bg flex flex-col gap-1";

  // Top row: icon + total
  const totalRow = document.createElement("div");
  totalRow.className = "flex items-center gap-2 text-accent-2";

  const icon = document.createElement("fxs-icon");
  icon.setAttribute("data-icon-id", "YIELD_FOOD");
  icon.classList.add("size-5");

  const totalText = document.createElement("span");
  totalText.className = "font-semibold";
  totalText.textContent = `+${bonus.total}`;

  totalRow.append(icon, totalText);
  container.appendChild(totalRow);

  // Breakdown rows
  if (bonus.details && Object.keys(bonus.details).length > 0) {
    const breakdown = document.createElement("div");
    breakdown.className = "mt-1 text-xs text-accent-2";

    for (const [name, count] of Object.entries(bonus.details)) {
      const row = document.createElement("div");
      row.className = "flex justify-between";

      const labelSpan = document.createElement("span");
      labelSpan.textContent = name;

      const valueSpan = document.createElement("span");
      valueSpan.textContent = `+${count}`;

      row.append(labelSpan, valueSpan);
      breakdown.appendChild(row);
    }

    // Era multiplier line, if > 1
    if (bonus.multiplier > 1) {
      const eraRow = document.createElement("div");
      eraRow.className =
        "flex justify-between mt-1 pt-1 border-t border-white/10";

      const eraLabel = document.createElement("span");
      eraLabel.textContent = Locale.compose("LOC_MOD_ETFI_ERA_BONUS");

      const eraValue = document.createElement("span");
      eraValue.textContent = `x${bonus.multiplier}`;

      eraRow.append(eraLabel, eraValue);
      breakdown.appendChild(eraRow);
    }

    container.appendChild(breakdown);
  }

  // Insert after the vanilla description
  etfiTooltipInstance.description.insertAdjacentElement("afterend", container);
}

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
    productionCost = document.createElement("div");
    requirementsContainer = document.createElement("div");
    requirementsText = document.createElement("div");
    gemsContainer = document.createElement("div");
    // #endregion
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
      this.gemsContainer.className = "mt-10";
      this.tooltip.append(
        this.glow,
        this.header,
        this.divider,
        this.description,
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
        console.error("ProductionProjectTooltipType.update: update triggered with no valid target");
        return;
      }
      const projectType = this.getProjectType();
      const cityID = UI.Player.getHeadSelectedCity();
      if (!cityID) { return; }
      const city = Cities.get(cityID);
      if (!city) { return; }
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

      // --- Small fix: clear gemsContainer so it doesn’t stack icons on repeated updates ---
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

      // === ETFI: Granary-specific extra info ===
      // Only run on town focus items, and only for LOC_PROJECT_TOWN_GRANARY_NAME
      if (IsElement(this.target, "town-focus-chooser-item")) {
        renderGranaryBlock(this, city);
      }
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

// IMPORTANT: this overrides the existing handler for *only* this tooltip type.
TooltipManager.registerType("production-project-tooltip", new EtfiToolTipType());

export { EtfiToolTipType as default };
