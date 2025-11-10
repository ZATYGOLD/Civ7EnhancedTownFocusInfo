
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.chunk.js';
import { c as GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';

// Recreate the local constant from panel-production-tooltips.js
const bulletChar = String.fromCodePoint(8226);

class EtfiToolTipType {
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
