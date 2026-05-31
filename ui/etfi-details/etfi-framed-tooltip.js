// File Path: ui/etfi-details/etfi-framed-tooltip.js
//
// DEPRECATED. The reusable framed hover tooltip now lives in etfi-render.js so
// it can reuse the render kit's renderSectionPanels for model-based content
// (real containers, icons, vertical dividers, x# counts, yield pills). This
// file only re-exports the constants for any straggler imports; the tooltip
// type itself is defined and registered by etfi-render.js. Not loaded by the
// modinfo.
export {
  ETFI_TEXT_TOOLTIP_STYLE,
  ETFI_TIP_ATTR,
  ETFI_TIP_TITLE_ATTR,
  ETFI_TIP_MODEL_ATTR,
} from "./etfi-render.js";
