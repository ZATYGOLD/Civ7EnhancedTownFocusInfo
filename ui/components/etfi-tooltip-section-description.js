// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Owns the focus description block for the Town Focus tooltip. A separate
// element so the description renders self-contained without modifying the base
// game's shared tooltip type.
//
// town-focus-tooltip.js sets the text on `element.etfiDescription` and bumps the
// observed `data-rev` attribute to trigger a re-render.

import { applyListSpacing } from "./town-focus-rows.js";

const ETFI_TOWN_FOCUS_SECTION_DESCRIPTION = "etfi-tooltip-section-description";

class EtfiTooltipSectionDescription extends Component {
  contentDiv = document.createElement("p");

  onInitialize() {
    super.onInitialize();
    this.contentDiv.className = "etfi-tooltip-section-description font-body text-2xs";
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

  get description() {
    return this.Root.etfiDescription ?? "";
  }

  render() {
    const text = this.description;
    if (!text) {
      this.contentDiv.innerHTML = "";
      this.Root.classList.add("hidden");
      return;
    }
    this.Root.classList.remove("hidden");
    this.contentDiv.innerHTML = Locale.stylize(Locale.compose(text));

    // The same spacing pass the base project tooltip applies.
    applyListSpacing(this.contentDiv);
  }
}

Controls.define(ETFI_TOWN_FOCUS_SECTION_DESCRIPTION, {
  createInstance: EtfiTooltipSectionDescription,
  description: "Town Focus tooltip description container.",
  classNames: ["etfi-tooltip-section-description"],
  attributes: [{ name: "data-rev" }],
});

export { EtfiTooltipSectionDescription, ETFI_TOWN_FOCUS_SECTION_DESCRIPTION };
