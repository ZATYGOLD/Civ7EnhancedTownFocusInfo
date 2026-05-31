// File Path: ui/etfi-details/etfi-tooltip-section-description.js
//
// Author: Zatygold
//
// <etfi-tooltip-section-description> — a custom container element for the Town
// Focus tooltip that owns the focus DESCRIPTION block (the same description text
// shown by the inline focus list). The custom tooltip
// (ui/production-chooser/town-focus-tooltip.js) instantiates it and feeds it the
// description, so the description renders as a self-contained element below the
// tooltip header without touching the base game's shared tooltip type.
//
// DATA FLOW: the tooltip sets the text on `element.etfiDescription` and bumps the
// observed `data-rev` attribute to trigger a re-render. render() resolves the
// text (a LOC key or composed string) and stylizes it into `contentDiv`.

const ETFI_TOWN_FOCUS_SECTION_DESCRIPTION = "etfi-tooltip-section-description";

const bulletChar = String.fromCodePoint(8226);

class EtfiTooltipSectionDescription extends Component {
  // Single content node so a re-render can wipe and rebuild cleanly.
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

  // The description text the tooltip handed us (may be undefined before set).
  get description() {
    return this.Root.etfiDescription ?? "";
  }

  // Resolve (compose a LOC key; no-op for plain text), stylize for icons/markup,
  // and apply the base game's list/paragraph spacing pass. Hide when empty.
  render() {
    const text = this.description;
    if (!text) {
      this.contentDiv.innerHTML = "";
      this.Root.classList.add("hidden");
      return;
    }
    this.Root.classList.remove("hidden");
    this.contentDiv.innerHTML = Locale.stylize(Locale.compose(text));

    // Same paragraph/list spacing pass the base project tooltip uses.
    let firstChild = true;
    let prevChildIsList = false;
    for (const node of this.contentDiv.children) {
      const isList = Boolean(node.innerHTML.match(bulletChar));
      if (isList) node.classList.add("ml-4");
      if (!firstChild) {
        if (!prevChildIsList || !isList) node.classList.add("mt-2");
      } else {
        firstChild = false;
      }
      prevChildIsList = isList;
    }
  }
}

Controls.define(ETFI_TOWN_FOCUS_SECTION_DESCRIPTION, {
  createInstance: EtfiTooltipSectionDescription,
  description: "Town Focus tooltip description container.",
  classNames: ["etfi-tooltip-section-description"],
  attributes: [{ name: "data-rev" }],
});

export { EtfiTooltipSectionDescription, ETFI_TOWN_FOCUS_SECTION_DESCRIPTION };
