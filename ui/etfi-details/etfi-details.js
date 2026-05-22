// File Path: /ui/etfi-details/etfi-details.js

import styles from "/base-standard/ui/constructible-details/constructible-details.scss.js";

class EtfiDetails extends Component {
  contentDiv = document.createElement("div");

  onInitialize() {
    super.onInitialize();
    this.render();
  }

  onAttach() {
    super.onAttach();
    this.updateFromAttributes();
  }

  render() {
    this.Root.classList.add(
      "mt-10",
      "img-base-ticket-bg-container"
    );

    this.contentDiv.className = "w-full";
    this.Root.appendChild(this.contentDiv);
  }

  updateFromAttributes() {
    const contentHtml = this.Root.getAttribute("content-html") ?? "";
    this.setContent(contentHtml);
  }

  setContent(contentHtml) {
    const hasContent =
      !!contentHtml &&
      contentHtml.trim().length > 0;

    this.contentDiv.innerHTML = hasContent ? contentHtml : "";
    this.Root.classList.toggle("hidden", !hasContent);
  }

  clear() {
    this.setContent("");
  }

  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "content-html":
        this.setContent(newValue ?? "");
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
  ],
});

export { EtfiDetails };