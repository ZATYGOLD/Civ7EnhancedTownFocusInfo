// File Path: /ui/etfi-details/etfi-details.js

import styles from "/base-standard/ui/constructible-details/constructible-details.scss.js";

import FoodFocusDetails from "../etfi-town-focus/farm-fish-towns.js";
import MiningDetails from "../etfi-town-focus/mining-town.js";
import HubDetails from "../etfi-town-focus/hub-town.js";
import ResortDetails from "../etfi-town-focus/resort-town.js";
import TradeDetails from "../etfi-town-focus/trade-town.js";
import TempleDetails from "../etfi-town-focus/temple-town.js";
import UrbanCenterDetails from "../etfi-town-focus/urban-town.js";
import FortTownDetails from "../etfi-town-focus/fort-town.js";

import { ETFI_YIELDS, renderHeader } from "../../etfi-utilities.js";

// #region ETFI aliases

const ETFI_PROJECT_KEY_ALIASES = {
  FARMING: [
    "PROJECT_TOWN_GRANARY",
    "TOWN_GRANARY",
    "LOC_PROJECT_TOWN_GRANARY_NAME",
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
    "PROJECT_TOWN_RELIGIOUS_SITE",
    "TOWN_TEMPLE",
    "TOWN_RELIGIOUS_SITE",
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

// #region ETFI fallback yields

const ETFI_FALLBACK_YIELDS = Object.freeze({
  FOOD: [ETFI_YIELDS.FOOD],
  PRODUCTION: [ETFI_YIELDS.PRODUCTION],
  INFLUENCE: [ETFI_YIELDS.INFLUENCE],
  TRADE: [ETFI_YIELDS.TRADE, ETFI_YIELDS.HAPPINESS],
  RESORT: [ETFI_YIELDS.HAPPINESS, ETFI_YIELDS.GOLD],
  TEMPLE: [ETFI_YIELDS.HAPPINESS],
  URBAN: [ETFI_YIELDS.SCIENCE, ETFI_YIELDS.CULTURE],
  FORT: [ETFI_YIELDS.FORTIFY, ETFI_YIELDS.GOLD],
});

// #endregion

// #region ETFI registry

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
  debugName: "Religious Site / Temple",
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

class EtfiDetails extends Component {
  contentDiv = document.createElement("div");

  cityID = null;
  projectType = null;
  growthType = null;
  focusName = "";
  contentHtml = "";

  onInitialize() {
    super.onInitialize();
    this.render();
  }

  onAttach() {
    super.onAttach();
    this.readAttributes();
    this.update();
  }

  render() {
    this.Root.classList.add(
      "mt-10",
      "img-base-ticket-bg-container"
    );

    this.contentDiv.className = "w-full";
    this.Root.appendChild(this.contentDiv);
  }

  readAttributes() {
    const cityIDAttribute = this.Root.getAttribute("city-id");
    const projectTypeAttribute = this.Root.getAttribute("project-type");
    const growthTypeAttribute = this.Root.getAttribute("growth-type");
    const focusNameAttribute = this.Root.getAttribute("focus-name");
    const contentHtmlAttribute = this.Root.getAttribute("content-html");

    this.cityID = cityIDAttribute ? Number(cityIDAttribute) : null;

    this.projectType =
      projectTypeAttribute !== null && projectTypeAttribute !== ""
        ? Number(projectTypeAttribute)
        : null;

    this.growthType =
      growthTypeAttribute !== null && growthTypeAttribute !== ""
        ? Number(growthTypeAttribute)
        : null;

    this.focusName = focusNameAttribute ?? "";
    this.contentHtml = contentHtmlAttribute ?? "";
  }

  update() {
    // Compatibility mode:
    // etfi.js currently calculates detailsText and passes it through content-html.
    // Keep this first so the current playable setup keeps working.
    if (this.contentHtml && this.contentHtml.trim().length > 0) {
      this.setContent(this.contentHtml);
      return;
    }

    const city = this.getCity();
    if (!city) {
      this.clear();
      return;
    }

    const entry = this.getTownFocusRegistryEntry();
    if (!entry) {
      this.clear();
      return;
    }

    try {
      const renderer = entry.createRenderer?.();
      const html = renderer?.render?.(city);

      this.setContent(html || this.renderEmptyDetailsHTML(entry.yields));
    } catch (error) {
      console.error("[ETFI] Failed to render town focus details", {
        focus: entry.debugName,
        error,
        cityID: this.cityID,
        projectType: this.projectType,
        growthType: this.growthType,
        focusName: this.focusName,
        projectInfo: this.getProjectInfo(),
      });

      this.setContent(this.renderEmptyDetailsHTML(entry.yields));
    }
  }

  getCity() {
    if (!this.cityID) {
      return null;
    }

    return Cities.get(this.cityID) ?? null;
  }

  getProjectInfo() {
    if (
      this.projectType === null ||
      this.projectType === undefined ||
      Number.isNaN(this.projectType)
    ) {
      return null;
    }

    return GameInfo?.Projects?.lookup?.(this.projectType) ?? null;
  }

  isDefaultGrowthFocus() {
    const isExpandGrowth =
      typeof GrowthTypes !== "undefined" &&
      this.growthType === GrowthTypes.EXPAND;

    const isNoProject =
      typeof ProjectTypes !== "undefined"
        ? this.projectType === ProjectTypes.NO_PROJECT
        : this.focusName === "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";

    return isExpandGrowth && isNoProject;
  }

  getTownFocusKey() {
    if (this.isDefaultGrowthFocus()) {
      return null;
    }

    const projectInfo = this.getProjectInfo();
    if (projectInfo?.ProjectType) {
      return projectInfo.ProjectType;
    }

    return this.focusName || null;
  }

  getTownFocusRegistryEntry() {
    if (this.isDefaultGrowthFocus()) {
      return null;
    }

    const focusKey = this.getTownFocusKey();

    if (focusKey && ETFI_TOWN_FOCUS_REGISTRY.has(focusKey)) {
      return ETFI_TOWN_FOCUS_REGISTRY.get(focusKey);
    }

    const projectInfo = this.getProjectInfo();

    console.warn("[ETFI] No town focus registry entry found in etfi-details", {
      focusKey,
      projectType: this.projectType,
      projectTypeKey: projectInfo?.ProjectType,
      focusName: this.focusName,
      growthType: this.growthType,
      projectInfo,
    });

    return null;
  }

  renderEmptyDetailsHTML(yields) {
    const normalizedYields = Array.isArray(yields)
      ? yields.filter(Boolean)
      : yields
        ? [yields]
        : [];

    return `
      <div class="flex flex-col w-full">
        ${renderHeader(normalizedYields, 0)}
      </div>
    `;
  }

  setContent(html) {
    const hasContent = !!html && html.trim().length > 0;

    this.contentDiv.innerHTML = hasContent ? html : "";
    this.Root.classList.toggle("hidden", !hasContent);
  }

  clear() {
    this.setContent("");
  }

  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "content-html":
      case "city-id":
      case "project-type":
      case "growth-type":
      case "focus-name":
        this.readAttributes();
        this.update();
        break;

      default:
        super.onAttributeChanged(name, oldValue, newValue);
        break;
    }
  }
}

Controls.define("etfi-details", {
  createInstance: EtfiDetails,
  description: "Enhanced Town Focus Info details block",
  classNames: ["etfi-details", "hidden"],
  styles: [styles],
  attributes: [
    {
      name: "content-html",
      description: "Rendered ETFI details HTML",
    },
    {
      name: "city-id",
      description: "Selected city ID",
    },
    {
      name: "project-type",
      description: "Town focus project type/hash",
    },
    {
      name: "growth-type",
      description: "Town focus growth type",
    },
    {
      name: "focus-name",
      description: "Town focus name key",
    },
  ],
});

export { EtfiDetails };