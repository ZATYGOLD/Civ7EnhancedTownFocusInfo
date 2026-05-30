// File Path: ui/etfi-details/etfi-details.js
//
// Author: Zatygold
//
// <etfi-details> — a custom element scaffold for a future Town Focus tooltip
// renderer. This is intentionally minimal: by default it renders NOTHING and
// changes nothing in the base game. It exists so a custom tooltip (built later
// in ui/production-chooser/town-focus-tooltip.js) can create an <etfi-details>
// element, hand it a model, and have it draw the breakdown.
//
// DATA FLOW (intended): the tooltip sets a plain object on `element.etfiModel`
// and bumps the observed `data-rev` attribute to trigger a re-render. The
// render() method below is where that model would be turned into DOM. It is
// left empty on purpose — fill it in when building the custom tooltip.

class EtfiDetails extends Component {
  contentDiv = document.createElement("div");

  onInitialize() {
    super.onInitialize();
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

  // Build DOM from this.Root.etfiModel here. Empty by default (no-op).
  render() {
    // Intentionally blank — default behavior renders nothing.
  }
}

Controls.define("etfi-details", {
  createInstance: EtfiDetails,
  description: "Town Focus details renderer (scaffold).",
  classNames: ["etfi-details"],
  attributes: [{ name: "data-rev" }],
});

export {};
