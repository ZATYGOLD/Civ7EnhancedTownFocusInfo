import { getModifierTextByContext, parseConstructibleAdjacencyNameOnly } from '/core/ui/utilities/utilities-core-textprovider.js';
import { getConstructibleTagsFromType } from '/base-standard/ui/utilities/utilities-tags.js';
import styles from '/base-standard/ui/constructible-details/constructible-details.scss.js';


const bulletChar = String.fromCodePoint(8226);
class EtfiDetails extends Component {
  constructibleType = "";
  isPurchase = false;
  constructibleIcon = document.createElement("fxs-icon");
  tagDiv = document.createElement("div");
  baseYieldTextDiv = document.createElement("div");
  modifierTextDiv = document.createElement("div");
  tooltipTextDiv = document.createElement("div");
  adjacencyDiv = document.createElement("div");
  costDiv = document.createElement("div");
  maintenanceDiv = document.createElement("div");
  warehouseBonusContainer = document.createElement("div");
  warehouseBonusValue = document.createElement("div");
  adjacencyBonusContainer = document.createElement("div");
  adjacencyBonusValue = document.createElement("div");
  get dividerStyle() {
    return this.Root.getAttribute("divider-style") ?? "normal";
  }
  onInitialize() {
    super.onInitialize();
    this.render();
  }
  onAttach() {
    super.onAttach();
    const typeAttribute = this.Root.getAttribute("constructible-type");
    if (typeAttribute) {
      this.constructibleType = typeAttribute;
      this.update();
    }
  }
  render() {
    this.Root.classList.add("mt-10", "img-base-ticket-bg-container");
    this.constructibleIcon.classList.add("size-20", "self-center", "-mt-16", "mb-2\\.5");
    this.Root.appendChild(this.constructibleIcon);
    this.tagDiv.className = "w-full flex flex-wrap self-center justify-center";
    this.Root.appendChild(this.tagDiv);
    if (this.dividerStyle === "text-divider") {
      const detailsSubheader = document.createElement("div");
      detailsSubheader.className = "flex items-center w-full";
      detailsSubheader.innerHTML = `
				<div class="constructible-details__divider-line-left"></div>
				<p data-l10n-id="LOC_UI_CONTENT_MGR_DETAILS" class="mx-2 font-title text-secondary text-sm uppercase"></p>
				<div class="constructible-details__divider-line-right"></div>
			`;
      this.Root.appendChild(detailsSubheader);
    } else {
      const divider = document.createElement("div");
      divider.className = "img-shell-line-divider h-1 w-1\\/2 self-center mb-2";
      this.Root.appendChild(divider);
    }
    this.baseYieldTextDiv.classList.add("mb-2", "flex");
    this.Root.appendChild(this.baseYieldTextDiv);
    this.adjacencyDiv.classList.add("mb-2");
    this.Root.appendChild(this.adjacencyDiv);
    this.modifierTextDiv.classList.add("mb-2");
    this.Root.appendChild(this.modifierTextDiv);
    this.tooltipTextDiv.classList.add("mb-2");
    this.Root.appendChild(this.tooltipTextDiv);
    const divider2 = document.createElement("div");
    divider2.classList.add("img-shell-line-divider", "h-1", "w-1\\/2", "self-center", "mb-2");
    this.Root.appendChild(divider2);
    this.Root.appendChild(this.costDiv);
    this.maintenanceDiv.classList.add("flex", "items-center");
    this.Root.appendChild(this.maintenanceDiv);
    this.warehouseBonusContainer.className = "flex mb-2 hidden";
    this.Root.appendChild(this.warehouseBonusContainer);
    const warehousePrefix = document.createElement("div");
    warehousePrefix.className = "mr-2";
    warehousePrefix.setAttribute("data-l10n-id", "LOC_BUILDING_PLACEMENT_WAREHOUSE_IMPROVEMENTS");
    this.warehouseBonusContainer.appendChild(warehousePrefix);
    this.warehouseBonusContainer.appendChild(this.warehouseBonusValue);
    const warehouseFontIcon = document.createElement("div");
    warehouseFontIcon.innerHTML = Locale.stylize("[icon:YIELD_WAREHOUSE]");
    this.warehouseBonusContainer.appendChild(warehouseFontIcon);
    this.adjacencyBonusContainer.className = "flex mb-2 hidden";
    this.Root.appendChild(this.adjacencyBonusContainer);
    const adjacencyPrefix = document.createElement("div");
    adjacencyPrefix.className = "mr-2";
    adjacencyPrefix.setAttribute("data-l10n-id", "LOC_BUILDING_PLACEMENT_HIGHEST_ADJACENCIES");
    this.adjacencyBonusContainer.appendChild(adjacencyPrefix);
    this.adjacencyBonusContainer.appendChild(this.adjacencyBonusValue);
    const adjacencyFontIcon = document.createElement("div");
    adjacencyFontIcon.innerHTML = Locale.stylize("[icon:YIELD_ADJACENCY]");
    this.adjacencyBonusContainer.appendChild(adjacencyFontIcon);
  }
  update() {
    const iconOnlyEntries = /* @__PURE__ */ new Set(["BUILDING_OPEN", "BUILDING_ADD", "BUILDING_WARNING"]);
    if (iconOnlyEntries.has(this.constructibleType)) {
      this.constructibleIcon.setAttribute("data-icon-id", this.constructibleType);
      return;
    }
    const definition = GameInfo.Projects.lookup(this.projectType)
    if (!definition) {
      console.error(
        `constructible-details: updateGate failed to find definition for constructible type ${this.constructibleType}`
      );
      return;
    }
    this.constructibleIcon.setAttribute("data-icon-id", this.constructibleType);
    this.tagDiv.innerHTML = "";
    const tags = getConstructibleTagsFromType(this.constructibleType);
    for (const tag of tags) {
      const tagPill = document.createElement("div");
      tagPill.className = "img-hud-production-pill flex items-center text-2xs mx-1 mb-2";
      this.tagDiv.appendChild(tagPill);
      const tagText = document.createElement("div");
      tagText.className = "px-2 uppercase leading-none";
      tagText.setAttribute("data-l10n-id", tag);
      tagPill.appendChild(tagText);
    }
    this.baseYieldTextDiv.innerHTML = "";
    for (const yieldChange of GameInfo.Constructible_YieldChanges) {
      if (yieldChange.ConstructibleType == this.constructibleType) {
        const result = Locale.stylize(
          "LOC_UI_POS_YIELD_ICON_ONLY",
          yieldChange.YieldChange,
          yieldChange.YieldType
        );
        if (result) {
          const baseYieldElement = document.createElement("div");
          baseYieldElement.classList.add("mr-2");
          baseYieldElement.innerHTML = result;
          this.baseYieldTextDiv.appendChild(baseYieldElement);
        }
      }
    }
    let modifierText = "";
    for (const modifier of GameInfo.ConstructibleModifiers) {
      if (modifier.ConstructibleType == this.constructibleType) {
        const s = getModifierTextByContext(modifier.ModifierId, "Description");
        if (s) {
          modifierText += Locale.stylize(s);
        }
      }
    }
    this.modifierTextDiv.classList.toggle("hidden", !modifierText);
    this.modifierTextDiv.innerHTML = modifierText;
    this.tooltipTextDiv.innerHTML = definition.Tooltip ? Locale.stylize(definition.Tooltip) : "";
    let firstChild = true;
    let prevChildisList = false;
    for (const node of this.tooltipTextDiv.children) {
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
    const selectedCityID = UI.Player.getHeadSelectedCity();
    const selectedCity = selectedCityID ? Cities.get(selectedCityID) : null;
    if (selectedCity) {
      if (this.isPurchase) {
        const purchaseCost = selectedCity.Gold?.getBuildingPurchaseCost(
          YieldTypes.YIELD_GOLD,
          this.constructibleType
        );
        this.costDiv.innerHTML = purchaseCost ? Locale.stylize("LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST", purchaseCost, "YIELD_PRODUCTION") : "";
      } else {
        const productionCost = selectedCity.Production?.getConstructibleProductionCost(this.constructibleType);
        this.costDiv.innerHTML = productionCost ? Locale.stylize("LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST", productionCost, "YIELD_PRODUCTION") : "";
      }
    } else {
      this.costDiv.innerHTML = "";
    }
    this.maintenanceDiv.innerHTML = "";
    const allMaintenance = selectedCity?.Constructibles?.getMaintenance(this.constructibleType);
    if (allMaintenance && allMaintenance.length > 0) {
      for (let index = 0; index < allMaintenance.length; index++) {
        const value = allMaintenance[index];
        if (value > 0) {
          if (this.maintenanceDiv.childElementCount == 0) {
            const prefixText = document.createElement("div");
            prefixText.classList.add("mr-2");
            prefixText.innerHTML = Locale.compose("LOC_UI_PRODUCTION_MAINTENANCE");
            this.maintenanceDiv.appendChild(prefixText);
          }
          const yieldDefinition = GameInfo.Yields[index];
          if (yieldDefinition) {
            const maintenanceText = document.createElement("div");
            maintenanceText.classList.add("mr-2");
            maintenanceText.innerHTML = Locale.stylize(
              "LOC_UI_PRODUCTION_MAINTENANCE_NEGATIVE_VALUE",
              value,
              yieldDefinition.YieldType
            );
            this.maintenanceDiv.appendChild(maintenanceText);
          }
        }
      }
      this.maintenanceDiv.classList.remove("hidden");
    } else {
      this.maintenanceDiv.classList.add("hidden");
    }
    this.updateAdjacencies();
  }
  updateAdjacencies() {
    this.adjacencyDiv.innerHTML = "";
    const selectedCityID = UI.Player.getHeadSelectedCity();
    const selectedCity = selectedCityID ? Cities.get(selectedCityID) : null;
    const adjacenciesChangeDef = [];
    for (const definition of GameInfo.Constructible_Adjacencies) {
      if (definition.ConstructibleType == this.constructibleType) {
        const yieldChangeDef = GameInfo.Adjacency_YieldChanges.find((o) => o.ID == definition.YieldChangeId);
        if (yieldChangeDef) {
          if (definition.RequiresActivation) {
            if (selectedCity && selectedCity.Constructibles) {
              if (!selectedCity.Constructibles.isAdjacencyUnlocked(yieldChangeDef.ID)) {
                continue;
              }
            }
          }
          adjacenciesChangeDef.push(yieldChangeDef);
        }
      }
    }
    const numAdjacencies = adjacenciesChangeDef.length;
    this.adjacencyDiv.classList.toggle("hidden", numAdjacencies < 1);
    let firstAdjacency = true;
    for (const yieldDefinition of GameInfo.Yields) {
      const perTypeChangeMap = /* @__PURE__ */ new Map();
      for (const changeDefinition of adjacenciesChangeDef) {
        if (changeDefinition.YieldType == yieldDefinition.YieldType) {
          const entries = perTypeChangeMap.get(changeDefinition.YieldChange);
          if (entries) {
            entries.push(changeDefinition);
          } else {
            const newArray = [changeDefinition];
            perTypeChangeMap.set(changeDefinition.YieldChange, newArray);
          }
        }
      }
      for (const [value, definitions] of perTypeChangeMap) {
        const adjacencyDescription = document.createElement("div");
        adjacencyDescription.classList.toggle("mt-2", !firstAdjacency);
        adjacencyDescription.classList.toggle("mb-2", definitions.length > 1);
        if (definitions.length <= 1) {
          adjacencyDescription.innerHTML = Locale.stylize(
            "LOC_UI_ADJACENCY_INFO_OBJECT",
            value,
            `[icon:${yieldDefinition.YieldType}]`,
            parseConstructibleAdjacencyNameOnly(definitions[0])
          );
          this.adjacencyDiv.appendChild(adjacencyDescription);
          firstAdjacency = false;
          continue;
        }
        adjacencyDescription.innerHTML = Locale.stylize(
          "LOC_UI_ADJACENCY_INFO_GENERIC",
          value,
          yieldDefinition.YieldType
        );
        this.adjacencyDiv.appendChild(adjacencyDescription);
        const adjacencyItems = document.createElement("div");
        adjacencyItems.classList.add("ml-4");
        const listOfItems = `[BLIST]${definitions.map((changeDefinition) => `[LI] ${parseConstructibleAdjacencyNameOnly(changeDefinition)}`).join("")}[/BLIST]`;
        adjacencyItems.setAttribute("data-l10n-id", listOfItems);
        this.adjacencyDiv.appendChild(adjacencyItems);
        firstAdjacency = false;
      }
    }
  }
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "constructible-type":
        if (this.constructibleType != newValue) {
          this.constructibleType = newValue;
          this.update();
        }
        break;
      case "is-purchase":
        this.isPurchase = newValue.toLowerCase() == "true";
        break;
      case "adjacency-bonus":
        if (newValue) {
          this.adjacencyBonusContainer.classList.remove("hidden");
          this.adjacencyBonusValue.textContent = newValue;
        } else {
          this.adjacencyBonusContainer.classList.add("hidden");
        }
        break;
      case "warehouse-bonus":
        if (newValue) {
          this.warehouseBonusContainer.classList.remove("hidden");
          this.warehouseBonusValue.textContent = newValue;
        } else {
          this.warehouseBonusContainer.classList.add("hidden");
        }
        break;
      default:
        super.onAttributeChanged(name, oldValue, newValue);
    }
  }
}
Controls.define("etfi-details", {
  createInstance: EtfiDetails,
  description: "Enhanced Town Focus Info details block",
  classNames: ["etfi-details", "hidden"],
  styles: [styles],
  attributes: [
    { name: "city-id", description: "Selected city ID" },
    { name: "project-type", description: "Town focus project type/hash" },
    { name: "growth-type", description: "Town focus growth type" },
    { name: "focus-name", description: "Town focus name key" },
  ]
});
//# sourceMappingURL=constructible-details.js.map
