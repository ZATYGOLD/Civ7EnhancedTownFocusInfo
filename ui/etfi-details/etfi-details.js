// File Path: /ui/etfi-details/etfi-details.js

import styles from '/base-standard/ui/constructible-details/constructible-details.scss.js';

const bulletChar = String.fromCodePoint(8226);

class EtfiDetails extends Component {
  onInitialize() {
    super.onInitialize();
    this.render();
  }
  onAttach() {
    super.onAttach();
  }
  render() {
    this.Root.classList.add("mt-10", "img-base-ticket-bg-container");
  }
  update() {
 
  }
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
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

export { EtfiDetails };
