// File Path: ui/etfi-town-focus/factory-town.js

// Factory Town:
// +1 Resource Slot.
// +5 Trade Range.
// Additional Factory purchase logic can be added later.

import { ETFI_YIELDS } from "../../etfi-utilities.js";

import {
  renderFocusDetails,
  renderHeaderTextPill,
} from "./town-focus-html.js";

const RESOURCE_SLOTS = 1;
const TRADE_RANGE = 5;

const RESOURCE_SLOT_ICON_ID = "RADIAL_RESOURCES";

export default class FactoryTownDetails {
  render(city) {
    if (!city) return null;

    const resourceSlotPillHtml = renderHeaderTextPill({
      iconId: RESOURCE_SLOT_ICON_ID,
      label: "Resource Slot",
      value: RESOURCE_SLOTS,
      colorKey: ETFI_YIELDS.GOLD,
    });

    return renderFocusDetails({
      headerYields: ETFI_YIELDS.TRADE,
      headerTotals: TRADE_RANGE,
      headerExtraHtml: resourceSlotPillHtml,
      summaryLabel: "",
      summaryValue: "",
      bodyHtml: "",
    });
  }
}