// File Path: ui/etfi-details/etfi-render.js
//
// Author: Zatygold
//
// Shared visual "render kit" for the Town Focus UI. These are the yield pills,
// dividers, section titles, ticket panels, and row renderer used by BOTH:
//   * the inline focus list   (ui/production-chooser/etfi-town-focus-section.js)
//   * the hover-tooltip detail (ui/etfi-details/etfi-tooltip-details.js)
// Keeping them in one place guarantees the two stay visually identical — a
// change to a pill color, divider, or spacing happens once.
//
// The two consumers want slightly different spacing and a couple of behavior
// differences (the inline list shows yields as colored pills and gives row
// names a dotted "link" cue; the tooltip shows yields as plain values). Those
// differences are captured in a single `cfg` object — see ETFI_SECTION_CFG and
// ETFI_DETAILS_CFG below — that each consumer passes through. The DOM/markup is
// otherwise identical between them.
//
// Row model (a superset understood by detailRow):
//   {
//     name?:      string,                 // left label, OR
//     iconId?:    string,                 // fxs-icon id (icon + divider before name)
//     iconClass?: string, iconStyle?: string,  // custom class-based icon instead
//     items?:     [ ... ],                // multiple left entries:
//                                         //   - {yieldType,value} -> inline yield
//                                         //     VALUES separated by a vert divider
//                                         //   - {iconId/name,...}  -> names joined
//                                         //     by a "•" bullet
//     count? / countText?:                // "x#" appended after the left label
//     pill?:   { yieldType, value },      // a pill on the right
//     yields?: [{yieldType,value}],       // right-side yields (pills or values,
//                                         //   per cfg.yieldsAsPills)
//     valueText?: string,                 // plain text on the right (e.g. turns)
//     subText?:  string,                  // a sub-line beneath the row
//     tooltip?:  string,                  // hover tooltip on the name
//   }

import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";

// Divider color + per-yield pill background colors.
export const DIVIDER_COLOR = "rgba(77, 83, 102, 0.7)";
export const YIELD_COLORS = {
  YIELD_FOOD: "rgba(128,179,77,0.35)",
  YIELD_PRODUCTION: "rgba(163,61,41,0.35)",
  YIELD_GOLD: "rgba(246,206,85,0.35)",
  YIELD_SCIENCE: "rgba(108,166,224,0.35)",
  YIELD_CULTURE: "rgba(92,92,214,0.35)",
  YIELD_HAPPINESS: "rgba(245,153,61,0.35)",
  YIELD_DIPLOMACY: "rgba(175,183,207,0.35)",
  CULTURE_VP: "rgba(168,85,200,0.35)", // Tourism
};

// Per-consumer rendering configuration. The markup is shared; only these knobs
// differ. (rem values are spacing; classes are Tailwind utilities.)
export const ETFI_SECTION_CFG = {
  yieldsAsPills: true,        // inline list shows colored yield pills
  nameLinkCue: true,          // names with a tooltip get a dotted "link" cue
  rowMarginTopRem: 0.25,      // detailRow top margin (was mt-1)
  hDividerMarginYRem: 0.25,   // between-row divider margin (was my-1)
  titleLineMarginYRem: 0.25,  // section-title underline margin (was my-1)
  panelMarginTopClass: "mt-2",
  panelPadRem: 0.5,
};
export const ETFI_DETAILS_CFG = {
  yieldsAsPills: false,       // tooltip shows plain yield values
  nameLinkCue: false,
  rowMarginTopRem: 0.0625,
  hDividerMarginYRem: 0.125,
  titleLineMarginYRem: 0.0625,
  panelMarginTopClass: "mt-1",
  panelPadRem: 0.6666666667,
};

export function fmt(v) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}

export function isColorful() {
  try { return !!(ETFI_Settings && ETFI_Settings.IsColorful); } catch { return false; }
}

export function fxsIcon(iconId, sizeClass) {
  const icon = document.createElement("fxs-icon");
  icon.setAttribute("data-icon-id", iconId);
  icon.className = `${sizeClass} shrink-0`;
  return icon;
}

// Icon for a row's left label: a custom class-based icon (iconClass/iconStyle)
// or an fxs-icon by id (size-5). Returns null when the spec has no icon.
export function iconEl(spec) {
  if (spec && spec.iconClass) {
    const d = document.createElement("div");
    d.className = `${spec.iconClass} shrink-0`;
    if (spec.iconStyle) d.style.cssText = spec.iconStyle;
    return d;
  }
  if (spec && spec.iconId) return fxsIcon(spec.iconId, "size-5");
  return null;
}

// Thin vertical divider between inline items on a single row.
export function vDivider() {
  const d = document.createElement("div");
  d.className = "self-stretch shrink-0 mx-1";
  d.style.cssText = `width:0.0625rem; background-color:${DIVIDER_COLOR};`;
  return d;
}

// Thin horizontal divider between rows. marginYRem controls top/bottom spacing.
export function hDivider(marginYRem = 0.125) {
  const d = document.createElement("div");
  d.className = "w-full shrink-0";
  d.style.cssText = `height:0.0625rem; margin-top:${marginYRem}rem; margin-bottom:${marginYRem}rem; background-color:${DIVIDER_COLOR};`;
  return d;
}

// A "[yield icon] +N" pill (colored background when the colorful option is on).
export function yieldPill(entry) {
  const body = document.createElement("div");
  // Tight icon-to-number spacing (gap-0.5 instead of gap-1).
  body.className = "flex items-center gap-0\\.5";
  body.appendChild(fxsIcon(entry.yieldType, "size-4"));
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
  // Narrow the pill: trim the horizontal padding (the small Pill defaults to
  // px-1.5). Inline style reliably overrides the component's class.
  pill.style.paddingLeft = "0.25rem";
  pill.style.paddingRight = "0.25rem";
  return pill;
}

// A plain "[yield icon] +N" value (no pill background) for individual rows.
export function yieldValue(entry) {
  const cell = document.createElement("div");
  cell.className = "flex items-center shrink-0";
  cell.appendChild(fxsIcon(entry.yieldType, "size-4"));
  const span = document.createElement("span");
  span.className = "font-semibold text-xs";
  span.textContent = `+${fmt(entry.value)}`;
  cell.appendChild(span);
  return cell;
}

export function noteLine(text) {
  const p = document.createElement("p");
  p.className = "mt-1 opacity-80";
  p.style.fontSize = "0.85em";
  p.innerHTML = Locale.stylize(text);
  return p;
}

// Uppercase title (left) + optional total yield pill (right) + shell-line
// underline. lineMarginYRem controls the underline's top/bottom margin.
export function sectionTitle(label, { total, lineMarginYRem = 0.0625 } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "w-full flex flex-col";

  const row = document.createElement("div");
  row.className = "w-full flex flex-row items-center justify-between";
  const d = document.createElement("div");
  d.className = "font-title uppercase text-2xs text-secondary";
  d.textContent = label;
  row.appendChild(d);
  if (total && typeof total.value === "number") row.appendChild(yieldPill(total));
  wrap.appendChild(row);

  const line = document.createElement("div");
  line.className = "img-shell-line-divider h-1 w-full self-center";
  line.style.cssText = `margin-top:${lineMarginYRem}rem; margin-bottom:${lineMarginYRem}rem;`;
  wrap.appendChild(line);
  return wrap;
}

// Append an icon (optional) + name label to a row's left container. When the
// spec carries a tooltip, the name gets a hover tooltip; cfg.nameLinkCue adds a
// dotted "link" cue (used by the inline list, not the tooltip).
export function appendNameItem(left, spec, cfg = {}) {
  const ic = iconEl(spec);
  if (ic) {
    left.appendChild(ic);
    left.appendChild(vDivider());
  }
  const nm = document.createElement("span");
  nm.style.cssText = "overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
  nm.textContent = spec.name ?? "";
  if (spec.tooltip) {
    nm.setAttribute("data-tooltip-content", spec.tooltip);
    nm.setAttribute("data-tooltip-style", "none"); // suppress the item's project tooltip here
    nm.classList.add("pointer-events-auto");
    if (cfg.nameLinkCue) {
      // Darker than the (secondary/gold) category title, so the two read distinctly.
      nm.style.color = "rgb(168, 133, 78)";
      nm.style.textDecoration = "underline dotted";
      nm.style.textUnderlineOffset = "0.2rem";
    }
  }
  left.appendChild(nm);
}

// One row. Left side: either inline yield VALUES (items with yieldType, divided
// by a vertical rule), name labels (items without yieldType, joined by "•"), or
// a single icon+name. Right side: an optional pill, yields (pills or values per
// cfg.yieldsAsPills), and/or a plain valueText. An optional subText renders on a
// line beneath.
export function detailRow(row, cfg = {}) {
  const line = document.createElement("div");
  line.className = "flex justify-between items-center w-full";
  line.style.marginTop = `${cfg.rowMarginTopRem ?? 0.0625}rem`;

  const left = document.createElement("div");
  left.className = "flex items-center min-w-0";
  left.style.cssText = "flex:1 1 auto; overflow:hidden;";

  if (Array.isArray(row.items) && row.items.length) {
    const yieldMode = !!(row.items[0] && row.items[0].yieldType != null);
    let n = 0;
    for (const it of row.items) {
      if (yieldMode) {
        if (!it || typeof it.value !== "number") continue;
        if (n > 0) left.appendChild(vDivider());
        left.appendChild(yieldValue(it));
      } else {
        if (n > 0) {
          const sep = document.createElement("span");
          sep.className = "opacity-50 mx-1 shrink-0";
          sep.textContent = "•";
          left.appendChild(sep);
        }
        appendNameItem(left, it, cfg);
      }
      n++;
    }
  } else {
    appendNameItem(left, row, cfg);
  }

  const countDisplay = row.countText != null ? row.countText : (typeof row.count === "number" ? String(row.count) : null);
  if (countDisplay != null) {
    const c = document.createElement("span");
    c.className = "opacity-70 ml-1 shrink-0";
    c.textContent = `x${countDisplay}`;
    left.appendChild(c);
  }

  const right = document.createElement("div");
  right.className = "flex items-center justify-end flex-wrap shrink-0";
  if (row.pill && typeof row.pill.value === "number") right.appendChild(yieldPill(row.pill));
  for (const y of row.yields || []) {
    if (!y || typeof y.value !== "number") continue;
    right.appendChild(cfg.yieldsAsPills ? yieldPill(y) : yieldValue(y));
  }
  if (row.valueText != null) {
    const span = document.createElement("span");
    span.className = "font-semibold text-xs ml-1";
    span.textContent = String(row.valueText);
    right.appendChild(span);
  }

  line.append(left, right);

  if (row.subText) {
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col w-full";
    wrap.appendChild(line);
    const sub = document.createElement("div");
    sub.className = "ml-6 opacity-70";
    sub.style.fontSize = "0.85em";
    sub.textContent = row.subText;
    wrap.appendChild(sub);
    return wrap;
  }
  return line;
}

// Append rows to a panel, with a horizontal divider between each.
export function appendRows(panel, rows, cfg = {}) {
  rows.forEach((row, i) => {
    if (i > 0) panel.appendChild(hDivider(cfg.hDividerMarginYRem));
    panel.appendChild(detailRow(row, cfg));
  });
}

// A "ticket" background panel. Padding/margins come from cfg so each consumer
// keeps its current spacing.
export function newPanel(cfg = {}) {
  const p = document.createElement("div");
  // text-2xs makes the panel contents (row names, counts, notes) compact.
  p.className = `img-base-ticket-bg-container w-full flex flex-col ${cfg.panelMarginTopClass ?? "mt-1"} text-2xs`;
  const pad = `${cfg.panelPadRem ?? 0.6666666667}rem`;
  p.style.paddingTop = pad;
  p.style.paddingBottom = pad;
  // The ticket background defaults to ~1rem horizontal padding; trim the right
  // side so the trailing yield pill sits a little closer to the panel edge.
  p.style.paddingRight = "0.5rem";
  return p;
}

// Render each section into its own ticket panel inside `container` (cleared
// first). Each panel gets an optional title (+ total pill), its rows, and any
// notes. Returns the last panel created (or null). Toggles `container` hidden
// when nothing was rendered.
export function renderSectionPanels(container, sections, cfg = {}) {
  while (container.firstChild) container.removeChild(container.firstChild);
  let last = null;
  for (const section of sections) {
    const srows = (section.rows || []).filter(Boolean);
    const snotes = (section.notes || []).filter(Boolean);
    if (!srows.length && !snotes.length && !section.title) continue;
    const p = newPanel(cfg);
    if (section.title) p.appendChild(sectionTitle(section.title, { total: section.total, lineMarginYRem: cfg.titleLineMarginYRem }));
    appendRows(p, srows, cfg);
    for (const n of snotes) p.appendChild(noteLine(n));
    container.appendChild(p);
    last = p;
  }
  container.classList.toggle("hidden", container.childElementCount === 0);
  return last;
}
