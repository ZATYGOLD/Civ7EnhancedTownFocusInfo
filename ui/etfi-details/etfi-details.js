// File Path: /ui/etfi-details/etfi-details.js
//
// Author: Zatygold
//
// ETFI custom details panel — the renderer injected into the town-focus tooltip
// by etfi.js (which creates <etfi-details> and feeds it a model).
//
// Rendering uses ONLY safe, proven pieces:
//   * the real game `Pill` component (imported from pills.js, called directly
//     to get its DOM element — exactly how the game produces pills),
//   * the legacy `fxs-icon` custom element for all icons,
//   * the game's divider CSS (img-shell-line-divider) and Locale.stylize.
// It deliberately does NOT import the Solid runtime (/core/vendor/solid-js) or
// defineLegacyComponent — those are what broke module loading before.
//
// DATA FLOW (chosen design): etfi.js sets a plain object on `element.etfiModel`
// and bumps the observed `data-rev` attribute to trigger a re-render.
//
// MODEL SHAPE:
//   {
//     header:  [ { yieldType, value } ],                 // pill row of totals
//     summary: { label, value } | null,                  // one summary line
//     sections: [
//       { title: { label, value } | null,
//         rows: [ { iconId?, name, count?, yields: [ {yieldType, value} ], subText? } ] }
//     ],
//     notes: [ "stylized string" ]
//   }

import styles from "/base-standard/ui/constructible-details/constructible-details.scss.js";
import { Pill } from "/base-standard/ui-next/components/pills.js";
import { ETFI_Settings } from "../../core/settings.js";

const YIELD_COLORS = {
  YIELD_FOOD: "rgba(128,179,77,0.35)",
  YIELD_PRODUCTION: "rgba(163,61,41,0.35)",
  YIELD_GOLD: "rgba(246,206,85,0.35)",
  YIELD_SCIENCE: "rgba(108,166,224,0.35)",
  YIELD_CULTURE: "rgba(92,92,214,0.35)",
  YIELD_HAPPINESS: "rgba(245,153,61,0.35)",
  YIELD_DIPLOMACY: "rgba(175,183,207,0.35)",
};

function fmt(v) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}

function isColorful() {
  try { return !!(ETFI_Settings && ETFI_Settings.IsColorful); } catch { return false; }
}

function fxsIcon(iconId, sizeClass) {
  const icon = document.createElement("fxs-icon");
  icon.setAttribute("data-icon-id", iconId);
  icon.className = `${sizeClass} shrink-0`;
  return icon;
}

// Real game Pill (horizontal: icon + value).
function yieldPill(entry) {
  const body = document.createElement("div");
  body.className = "flex items-center gap-1";
  body.appendChild(fxsIcon(entry.yieldType, "size-6"));
  const span = document.createElement("span");
  span.className = "font-semibold text-sm";
  span.textContent = `+${fmt(entry.value)}`;
  body.appendChild(span);

  const backgroundStyle =
    isColorful() && YIELD_COLORS[entry.yieldType]
      ? { "background-color": YIELD_COLORS[entry.yieldType] }
      : undefined;

  // Pill(...) returns a DOM element.
  return Pill({ class: "mx-1 mb-1", small: true, backgroundStyle, children: body });
}

function divider() {
  const d = document.createElement("div");
  d.className = "img-shell-line-divider h-1 w-full self-center my-1";
  return d;
}

function summaryRow(label, value) {
  const row = document.createElement("div");
  row.className = "flex justify-between mb-1";
  const l = document.createElement("span");
  l.textContent = label ?? "";
  const r = document.createElement("span");
  r.textContent = value == null ? "" : String(value);
  row.append(l, r);
  return row;
}

function detailRow(row) {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col mt-1 w-full";

  const line = document.createElement("div");
  line.className = "flex justify-between items-center w-full";

  const left = document.createElement("div");
  left.className = "flex items-center min-w-0";
  left.style.cssText = "flex:1 1 auto; max-width:70%; overflow:hidden;";
  if (row.iconId) left.appendChild(fxsIcon(row.iconId, "size-5"));
  const name = document.createElement("span");
  name.className = "ml-1";
  name.style.cssText = "overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
  name.textContent = row.name ?? "";
  left.appendChild(name);
  if (typeof row.count === "number") {
    const c = document.createElement("span");
    c.className = "opacity-70 ml-1 shrink-0";
    c.textContent = `x${row.count}`;
    left.appendChild(c);
  }

  const right = document.createElement("div");
  right.className = "flex items-center shrink-0";
  right.style.cssText = "margin-left:0.35rem; column-gap:0.35rem;";
  const yields = Array.isArray(row.yields) ? row.yields : [];
  for (const y of yields) {
    if (!y || typeof y.value !== "number") continue;
    const grp = document.createElement("span");
    grp.className = "inline-flex items-center shrink-0";
    grp.appendChild(fxsIcon(y.yieldType, "size-5"));
    const v = document.createElement("span");
    v.className = "font-semibold";
    v.style.marginLeft = "0.125rem";
    v.textContent = `+${fmt(y.value)}`;
    grp.appendChild(v);
    right.appendChild(grp);
  }

  line.append(left, right);
  wrap.appendChild(line);

  if (row.subText) {
    const sub = document.createElement("div");
    sub.className = "ml-6 opacity-70";
    sub.style.fontSize = "0.85em";
    sub.textContent = row.subText;
    wrap.appendChild(sub);
  }
  return wrap;
}

function noteLine(text) {
  const p = document.createElement("p");
  p.className = "mt-1 opacity-80";
  p.innerHTML = Locale.stylize(text);
  return p;
}

function buildModelDOM(model) {
  const root = document.createElement("div");
  root.className = "flex flex-col w-full";

  const header = document.createElement("div");
  header.className = "flex flex-wrap items-center justify-center mb-1";
  for (const y of model.header || []) {
    if (y && typeof y.value === "number") header.appendChild(yieldPill(y));
  }
  root.appendChild(header);

  const body = document.createElement("div");
  body.className = "flex flex-col";
  body.style.cssText = "font-size:0.85em; line-height:1.4;";
  root.appendChild(body);

  if (model.summary && model.summary.label != null) {
    body.appendChild(summaryRow(model.summary.label, model.summary.value));
    body.appendChild(divider());
  }

  for (const section of model.sections || []) {
    if (!section) continue;
    if (section.title && section.title.label != null) {
      const spacer = document.createElement("div");
      spacer.className = "mt-2";
      body.appendChild(spacer);
      body.appendChild(summaryRow(section.title.label, section.title.value));
      body.appendChild(divider());
    }
    for (const row of section.rows || []) {
      if (row) body.appendChild(detailRow(row));
    }
  }

  for (const note of model.notes || []) {
    if (note) body.appendChild(noteLine(note));
  }

  return root;
}

class EtfiDetails extends Component {
  contentDiv = document.createElement("div");

  onInitialize() {
    super.onInitialize();
    this.render();
  }

  onAttach() {
    super.onAttach();
    this.renderModel(this.Root.etfiModel ?? null);
  }

  render() {
    this.Root.classList.add("mt-10", "img-base-ticket-bg-container");
    this.contentDiv.className = "w-full flex flex-col text-accent-2";
    this.Root.appendChild(this.contentDiv);
  }

  clearContent() {
    while (this.contentDiv.firstChild) this.contentDiv.removeChild(this.contentDiv.firstChild);
  }

  renderModel(model) {
    this.clearContent();
    const hasContent =
      !!model && (Array.isArray(model.sections) || Array.isArray(model.header) || !!model.summary);
    if (hasContent) this.contentDiv.appendChild(buildModelDOM(model));
    this.Root.classList.toggle("hidden", !hasContent);
  }

  clear() {
    this.Root.etfiModel = null;
    this.renderModel(null);
  }

  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "data-rev":
        this.renderModel(this.Root.etfiModel ?? null);
        break;
      default:
        super.onAttributeChanged(name, oldValue, newValue);
        break;
    }
  }
}

Controls.define("etfi-details", {
  createInstance: EtfiDetails,
  description: "Enhanced Town Focus Info details panel",
  classNames: ["etfi-details", "hidden"],
  styles: [styles],
  attributes: [
    { name: "data-rev", description: "Bumped by etfi.js to trigger a model re-render" },
  ],
});

export { EtfiDetails };
