// File Path: ui/etfi-details/etfi-tooltip-details.js
//
// Author: Zatygold
//
// <etfi-tooltip-details> — a custom container element for the Town Focus
// tooltip. Its job is to own a self-contained DOM block that the custom tooltip
// (ui/production-chooser/town-focus-tooltip.js) can drop in and feed a model, so
// the tooltip can show extra breakdowns without touching the base game's shared
// tooltip type.
//
// DATA FLOW: the tooltip sets a plain object on `element.etfiModel` and bumps
// the observed `data-rev` attribute to trigger a re-render. render() turns that
// model into DOM inside `contentDiv`.
//
// VISUALS: all markup comes from the shared render kit (ui/etfi-details/
// etfi-render.js) — the same ticket panels, section titles, dividers, and yield
// pills the inline focus list uses — so the breakdown reads consistently with
// the rest of the mod. This element passes the ETFI_DETAILS_CFG preset (plain
// yield values, tight spacing). See etfi-render.js for the model shape.

import { renderSectionPanels, ETFI_DETAILS_CFG } from "./etfi-render.js";

const ETFI_TOOLTIP_DETAILS_TAG = "etfi-tooltip-details";

class EtfiTooltipDetails extends Component {
  // Root container for everything this element draws. Kept as one node so a
  // re-render can wipe and rebuild cleanly.
  contentDiv = document.createElement("div");

  onInitialize() {
    super.onInitialize();
    this.contentDiv.className = "etfi-tooltip-details flex flex-col";
    this.Root.appendChild(this.contentDiv);
    this.render();
  }

  onAttributeChanged(name, oldValue, newValue) {
    if (name === "data-rev") {
      this.render();
    } else {
      super.onAttributeChanged?.(name, oldValue, newValue);
    }
  }

  // Read the model the tooltip handed us (may be undefined before first set).
  get model() {
    return this.Root.etfiModel ?? null;
  }

  // Rebuild the container from the current model — one ticket panel per section
  // (only sections that actually have rows).
  render() {
    const model = this.model;
    if (!model) {
      this.contentDiv.innerHTML = "";
      return;
    }
    const sections = (Array.isArray(model.sections) ? model.sections : [])
      .filter((s) => s && Array.isArray(s.rows) && s.rows.length);
    renderSectionPanels(this.contentDiv, sections, ETFI_DETAILS_CFG);
  }
}

Controls.define(ETFI_TOOLTIP_DETAILS_TAG, {
  createInstance: EtfiTooltipDetails,
  description: "Town Focus tooltip details container.",
  classNames: ["etfi-tooltip-details"],
  attributes: [{ name: "data-rev" }],
});

export { EtfiTooltipDetails, ETFI_TOOLTIP_DETAILS_TAG };
