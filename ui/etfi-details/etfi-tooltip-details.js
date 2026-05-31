// File Path: ui/etfi-details/etfi-tooltip-details.js
//
// Author: Zatygold
//
// <etfi-tooltip-details> — a custom container element for the Town Focus
// tooltip. (Renamed from <etfi-details>.) Its job is to own a self-contained
// DOM block that the custom tooltip (ui/production-chooser/town-focus-tooltip.js)
// can drop in and feed a model, so the tooltip can show extra breakdowns
// without touching the base game's shared tooltip type.
//
// DATA FLOW: the tooltip sets a plain object on `element.etfiModel` and bumps
// the observed `data-rev` attribute to trigger a re-render. render() turns that
// model into DOM inside `contentDiv`.
//
// VISUALS: each section renders as its own "ticket" panel
// (img-base-ticket-bg-container) with an uppercase title (+ optional total
// yield pill on the right) and one row per item — the same panel / title /
// yield-pill language used by the inline focus list (etfi-town-focus-section.js),
// so the breakdown reads consistently with the rest of the mod.
//
// Expected model shape:
//   {
//     sections: [
//       {
//         title:  string,                       // panel heading
//         total?: { yieldType, value },         // pill shown right of the title
//         rows:   [ {
//           name?:   string,                    // left label, OR
//           iconId?: string,                    // icon + vert. divider before the name
//           items?:  [{yieldType,value}],       // inline values (vert. divider between) on the left
//           pill?:   { yieldType, value },      // a pill on the right
//           yields?: [{yieldType,value}],       // plain values on the right
//           valueText?: string,                 // plain text on the right (e.g. turns)
//           tooltip?: string,
//         } ],
//       },
//       ...
//     ],
//   }

import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";

const ETFI_TOOLTIP_DETAILS_TAG = "etfi-tooltip-details";

// Divider color + yield pill colors, matching the focus list
// (etfi-town-focus-section.js) so this container is visually consistent.
const DIVIDER_COLOR = "rgba(77, 83, 102, 0.7)";
const YIELD_COLORS = {
  YIELD_FOOD: "rgba(128,179,77,0.35)",
  YIELD_PRODUCTION: "rgba(163,61,41,0.35)",
  YIELD_GOLD: "rgba(246,206,85,0.35)",
  YIELD_SCIENCE: "rgba(108,166,224,0.35)",
  YIELD_CULTURE: "rgba(92,92,214,0.35)",
  YIELD_HAPPINESS: "rgba(245,153,61,0.35)",
  YIELD_DIPLOMACY: "rgba(175,183,207,0.35)",
  CULTURE_VP: "rgba(168,85,200,0.35)",
};

function fmt(v) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}

function isColorful() {
  try { return !!(ETFI_Settings && ETFI_Settings.IsColorful); } catch { return false; }
}

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

  // Rebuild the container from the current model — one ticket panel per section.
  render() {
    this.contentDiv.innerHTML = "";
    const model = this.model;
    if (!model) return;

    const sections = (Array.isArray(model.sections) ? model.sections : [])
      .filter((s) => s && Array.isArray(s.rows) && s.rows.length);

    for (const section of sections) {
      const panel = document.createElement("div");
      panel.className = "etfi-tooltip-details__panel img-base-ticket-bg-container w-full flex flex-col mt-1";
      // The ticket container defaults to a tall 1.333rem top/bottom padding,
      // which leaves dead space above the title and below the last row. Trim it
      // down to the border-image width so the panel hugs its content.
      panel.style.paddingTop = "0.6666666667rem";
      panel.style.paddingBottom = "0.6666666667rem";

      if (section.title) panel.appendChild(this.sectionTitle(section.title, section.total));

      // Divider line between every row (matches the focus-list rows).
      section.rows.forEach((row, i) => {
        if (i > 0) panel.appendChild(this.hDivider());
        panel.appendChild(this.detailRow(row));
      });

      this.contentDiv.appendChild(panel);
    }
  }

  // Thin horizontal divider between rows (same look as the focus-list rows).
  hDivider() {
    const d = document.createElement("div");
    d.className = "w-full shrink-0";
    d.style.cssText = `height:0.0625rem; margin-top:0.125rem; margin-bottom:0.125rem; background-color:${DIVIDER_COLOR};`;
    return d;
  }

  // Thin vertical divider between inline yield values on a single row (same look
  // as the focus-list vDivider).
  vDivider() {
    const d = document.createElement("div");
    d.className = "self-stretch shrink-0";
    d.style.cssText = `width:0.0625rem; margin-left:0.25rem; margin-right:0.25rem; background-color:${DIVIDER_COLOR};`;
    return d;
  }

  // Uppercase title (left) + optional total yield pill (right) + shell-line
  // divider, matching the focus-list section titles. Margins kept tight.
  sectionTitle(label, total) {
    const wrap = document.createElement("div");
    wrap.className = "w-full flex flex-col";

    const row = document.createElement("div");
    row.className = "w-full flex flex-row items-center justify-between";
    const d = document.createElement("div");
    d.className = "font-title uppercase text-2xs text-secondary";
    d.textContent = label;
    row.appendChild(d);
    if (total && typeof total.value === "number") row.appendChild(this.yieldPill(total));
    wrap.appendChild(row);

    const line = document.createElement("div");
    line.className = "img-shell-line-divider h-1 w-full self-center";
    line.style.cssText = "margin-top:0.0625rem; margin-bottom:0.0625rem;";
    wrap.appendChild(line);
    return wrap;
  }

  // One row, two layouts:
  //   * row.items  -> inline yield values on the left, separated by a vertical
  //                   divider (no name label),
  //   * row.name   -> a name label on the left.
  // The right side shows row.pill (as a pill) and/or row.yields (plain values).
  detailRow(row) {
    const line = document.createElement("div");
    line.className = "etfi-tooltip-details__row flex justify-between items-center w-full";
    line.style.marginTop = "0.0625rem";

    const left = document.createElement("div");
    left.className = "flex items-center min-w-0";
    left.style.cssText = "flex:1 1 auto; overflow:hidden;";

    if (Array.isArray(row.items) && row.items.length) {
      let n = 0;
      for (const y of row.items) {
        if (!y || typeof y.value !== "number") continue;
        if (n > 0) left.appendChild(this.vDivider());
        left.appendChild(this.yieldValue(y));
        n++;
      }
    } else {
      // Optional leading icon + vertical divider, then the name (same pattern as
      // the focus-list appendNameItem).
      if (row.iconId) {
        const ic = document.createElement("fxs-icon");
        ic.setAttribute("data-icon-id", row.iconId);
        ic.className = "size-5 shrink-0";
        left.appendChild(ic);
        left.appendChild(this.vDivider());
      }
      const nm = document.createElement("span");
      nm.style.cssText = "overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
      nm.textContent = row.name ?? "";
      if (row.tooltip) {
        nm.setAttribute("data-tooltip-content", row.tooltip);
        nm.setAttribute("data-tooltip-style", "none");
        nm.classList.add("pointer-events-auto");
      }
      left.appendChild(nm);
    }

    const right = document.createElement("div");
    right.className = "flex items-center justify-end flex-wrap shrink-0";
    if (row.pill && typeof row.pill.value === "number") right.appendChild(this.yieldPill(row.pill));
    for (const y of row.yields || []) {
      if (!y || typeof y.value !== "number") continue;
      right.appendChild(this.yieldValue(y));
    }
    // Plain text value (no yield icon), e.g. a turns count.
    if (row.valueText != null) {
      const span = document.createElement("span");
      span.className = "font-semibold text-xs ml-1";
      span.textContent = String(row.valueText);
      right.appendChild(span);
    }

    line.append(left, right);
    return line;
  }

  // A plain "[yield icon] +N" value (no pill background) for individual rows.
  yieldValue(entry) {
    const cell = document.createElement("div");
    cell.className = "flex items-center shrink-0";

    const icon = document.createElement("fxs-icon");
    icon.setAttribute("data-icon-id", entry.yieldType);
    icon.className = "size-4 shrink-0";
    cell.appendChild(icon);

    const span = document.createElement("span");
    span.className = "font-semibold text-xs";
    span.textContent = `+${fmt(entry.value)}`;
    cell.appendChild(span);
    return cell;
  }

  // A "[yield icon] +N" pill — used for the section-title total only, identical
  // to etfi-town-focus-section.js yieldPill.
  yieldPill(entry) {
    const body = document.createElement("div");
    body.className = "flex items-center gap-0\\.5";

    const icon = document.createElement("fxs-icon");
    icon.setAttribute("data-icon-id", entry.yieldType);
    icon.className = "size-4 shrink-0";
    body.appendChild(icon);

    const span = document.createElement("span");
    span.className = "font-semibold text-xs";
    span.textContent = `+${fmt(entry.value)}`;
    body.appendChild(span);

    const colored = entry.colored !== false;
    const backgroundStyle =
      colored && isColorful() && YIELD_COLORS[entry.yieldType]
        ? { "background-color": YIELD_COLORS[entry.yieldType] }
        : undefined;

    const pill = Pill({ class: "ml-1", small: true, backgroundStyle, children: body });
    pill.style.paddingLeft = "0.25rem";
    pill.style.paddingRight = "0.25rem";
    return pill;
  }
}

Controls.define(ETFI_TOOLTIP_DETAILS_TAG, {
  createInstance: EtfiTooltipDetails,
  description: "Town Focus tooltip details container.",
  classNames: ["etfi-tooltip-details"],
  attributes: [{ name: "data-rev" }],
});

export { EtfiTooltipDetails, ETFI_TOOLTIP_DETAILS_TAG };
