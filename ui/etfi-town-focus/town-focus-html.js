// File Path: ui/etfi-town-focus/town-focus-html.js

import { Pill } from '/base-standard/ui-next/components/pills.js';
import { ETFI_Settings } from '../../core/settings.js';
import { ETFI_YIELDS, fmt1 } from '../../etfi-utilities.js';

// -----------------------------------------------------------------------------
// Shared visual constants
// -----------------------------------------------------------------------------

const DETAILS_BODY_CLASS = "mt-1 text-accent-2";
const DETAILS_BODY_STYLE = "font-size: 0.8em; line-height: 1.4;";

const FOCUS_ROW_MARGIN_CLASS = "mt-1";
const FOCUS_ICON_SIZE_CLASS = "size-4";

const FOCUS_ROW_LEFT_CLASS = "flex items-center min-w-0";
const FOCUS_ROW_LEFT_STYLE = `
  flex: 1 1 auto;
  max-width: 72%;
  overflow: hidden;
`;

const FOCUS_ROW_RIGHT_CLASS =
  "flex flex-wrap justify-end items-center shrink-0 text-right";

const FOCUS_ROW_RIGHT_STYLE = `
  flex: 0 0 auto;
  margin-left: 0.35rem;
  column-gap: 0.35rem;
  row-gap: 0.125rem;
`;

const HEADER_BAR_STYLE = "background-color: rgba(0, 0, 0, 0); color:#f5f5f5; text-align:center;";
const DEFAULT_HEADER_BG = "rgba(255, 255, 255, 0.25)";

const HEADER_YIELD_COLORS = Object.freeze({
  [ETFI_YIELDS.FOOD]: "rgba(128, 179, 77, 0.35)",
  [ETFI_YIELDS.PRODUCTION]: "rgba(163, 61, 41, 0.35)",
  [ETFI_YIELDS.GOLD]: "rgba(246, 206, 85, 0.35)",
  [ETFI_YIELDS.SCIENCE]: "rgba(108, 166, 224, 0.35)",
  [ETFI_YIELDS.CULTURE]: "rgba(92, 92, 214, 0.35)",
  [ETFI_YIELDS.HAPPINESS]: "rgba(245, 153, 61, 0.35)",
  [ETFI_YIELDS.INFLUENCE]: "rgba(175, 183, 207, 0.35)",
  [ETFI_YIELDS.FORTIFY]: "rgba(204, 208, 219, 0.35)",
});

// -----------------------------------------------------------------------------
// Header rendering
// -----------------------------------------------------------------------------

export function renderHeader(yieldOrder, totals) {
  const order = Array.isArray(yieldOrder)
    ? yieldOrder.filter(Boolean) : yieldOrder ? [yieldOrder] : [];

  if (!order.length) {
    return renderHeaderBar("");
  }

  const values = normalizeHeaderTotals(order, totals);
  const isColorful = !!ETFI_Settings?.IsColorful;

  const chips = [];

  for (const yieldType of order) {
    const value = values[yieldType];

    if (typeof value !== "number") continue;

    const chipHtml = renderHeaderYieldChip({
      yieldType,
      value,
      isColorful,
    });

    if (chipHtml) {
      chips.push(chipHtml);
    }
  }

  if (!chips.length) {
    return renderHeaderBar("");
  }

  const firstRowHtml =
    chips.length <= 3 ? chips.join("") : chips.slice(0, 2).join("");

  const secondRowHtml =
    chips.length <= 3 ? "" : chips.slice(2).join("");

  return renderHeaderBar(`
    <div class="flex items-center justify-center gap-2 flex-wrap">
      ${firstRowHtml}
    </div>

    ${
      secondRowHtml
        ? `
          <div class="flex items-center justify-center gap-2 flex-wrap mt-1">
            ${secondRowHtml}
          </div>
        `
        : ""
    }
  `);
}

function normalizeHeaderTotals(order, totals) {
  if (typeof totals === "number") {
    const values = {};

    for (const item of order) {
      const key = getHeaderItemKey(item);
      if (key) {
        values[key] = totals;
      }
    }

    return values;
  }

  if (totals && typeof totals === "object") {
    return totals;
  }

  return {};
}

function getHeaderItemKey(item) {
  if (typeof item === "string") {
    return item;
  }

  return item?.key || item?.yieldType || item?.iconId || "";
}

function normalizeHeaderItem(item, values) {
  if (typeof item === "string") {
    return {
      iconId: item,
      value: values[item],
      label: "",
      colorKey: item,
    };
  }

  const iconId = item?.iconId || item?.yieldType || item?.key;
  if (!iconId) return null;

  const key = getHeaderItemKey(item);
  const value =
    typeof item.value === "number"
      ? item.value
      : values[key] ?? values[iconId];

  return {
    iconId,
    value,
    label: item.label || "",
    colorKey: item.colorKey || key || iconId,
  };
}

function renderHeaderBar(contentHtml) {
  return `
    <div
      class="flex flex-col items-center justify-center mb-2 rounded-md px-3 py-2"
      style="${HEADER_BAR_STYLE}"
    >
      ${contentHtml}
    </div>
  `;
}

function renderHeaderExtraPills(headerExtraHtml = "") {
    const html = Array.isArray(headerExtraHtml)
      ? headerExtraHtml.filter(Boolean).join("")
      : headerExtraHtml;
  
    if (!html || !html.trim()) {
      return "";
    }
  
    return `
      <div class="flex items-center justify-center gap-2 flex-wrap mb-2">
        ${html}
      </div>
    `;
  }

function renderHeaderYieldChip({ yieldType, value, isColorful }) {
    const baseColor = HEADER_YIELD_COLORS[yieldType] || DEFAULT_HEADER_BG;
  
    const formatted = formatFocusValue(value);
    const valueStyle = getHeaderValueStyle(formatted);
  
    const iconElement = document.createElement("fxs-icon");
    iconElement.setAttribute("data-icon-id", yieldType);
    iconElement.className = "size-7 shrink-0";
  
    const valueElement = document.createElement("span");
    valueElement.className = "font-semibold";
    valueElement.setAttribute("style", valueStyle);
    valueElement.textContent = `+${formatted}`;
  
    const pillElement = Pill({
      class: "mx-1 gap-1 text-sm text-accent-2",
      backgroundStyle: getHeaderPillBackgroundStyle({
        baseColor,
        isColorful,
      }),
      children: [
        iconElement,
        valueElement,
      ],
    });
  
    return pillElement?.outerHTML ?? "";
}

export function renderHeaderTextPill({
    iconId,
    label = "",
    value = 0,
    colorKey = iconId,
    className = "",
  } = {}) {
    if (!iconId || typeof value !== "number") {
      return "";
    }
  
    const isColorful = !!ETFI_Settings?.IsColorful;
  
    const baseColor =
      HEADER_YIELD_COLORS[colorKey] ||
      HEADER_YIELD_COLORS[iconId] ||
      DEFAULT_HEADER_BG;
  
    const formatted = formatFocusValue(value);
    const valueStyle = getHeaderValueStyle(formatted);
  
    const iconElement = document.createElement("fxs-icon");
    iconElement.setAttribute("data-icon-id", iconId);
    iconElement.className = "size-7 shrink-0";
  
    const labelElement = document.createElement("span");
    labelElement.className = "font-semibold whitespace-nowrap";
    labelElement.textContent = label;
  
    const valueElement = document.createElement("span");
    valueElement.className = "font-semibold";
    valueElement.setAttribute("style", valueStyle);
    valueElement.textContent = `+${formatted}`;
  
    const pillElement = Pill({
      class: `mx-1 gap-1 text-sm text-accent-2 ${className}`.trim(),
      backgroundStyle: getHeaderPillBackgroundStyle({
        baseColor,
        isColorful,
      }),
      children: label
        ? [iconElement, labelElement, valueElement]
        : [iconElement, valueElement],
    });
  
    return pillElement?.outerHTML ?? "";
  }

function getHeaderPillBackgroundStyle({ baseColor, isColorful }) {
    if (isColorful) {
      return {
        "background-color": baseColor,
      };
    }
  
    // Match the game's default Pill background.
    return {
      "background-color": "#23252b",
    };
  }

function getHeaderValueStyle(formattedValue) {
  const length = formattedValue.length;

  if (length <= 1) {
    return "display:inline-block; min-width: 1.9em; text-align:right;";
  }

  if (length === 2) {
    return "display:inline-block; min-width: 2.1em; text-align:right;";
  }

  return "text-align:right;";
}

// -----------------------------------------------------------------------------
// Shell / section rendering
// -----------------------------------------------------------------------------

export function renderFocusDetails({
    headerYields,
    headerTotals,
    summaryLabel,
    summaryValue,
    bodyHtml = "",
    headerExtraHtml = "",
  }) {
    const hasSummary =
      summaryLabel !== null &&
      summaryLabel !== undefined &&
      String(summaryLabel).trim().length > 0;
  
    return `
      <div class="flex flex-col w-full">
        ${renderHeader(headerYields, headerTotals)}
        ${renderHeaderExtraPills(headerExtraHtml)}
  
        <div class="${DETAILS_BODY_CLASS}" style="${DETAILS_BODY_STYLE}">
          ${
            hasSummary
              ? `
                ${renderFocusSummaryRow(summaryLabel, summaryValue)}
                ${renderFocusDivider()}
              `
              : ""
          }
  
          ${bodyHtml}
        </div>
      </div>
    `;
  }

export function renderFocusSummaryRow(label, value) {
  return `
    <div class="flex justify-between mb-1">
      <span>${label}</span>
      <span>${value}</span>
    </div>
  `;
}

export function renderFocusDivider() {
  return `<div class="mt-1 border-t border-white/10"></div>`;
}

export function renderFocusSectionHeader({
  label,
  value,
  includeSpacer = true,
}) {
  return `
    ${includeSpacer ? `<div class="mt-2"></div>` : ""}
    ${renderFocusSummaryRow(label, value)}
    ${renderFocusDivider()}
  `;
}

// -----------------------------------------------------------------------------
// Row rendering
// -----------------------------------------------------------------------------

export function renderFocusRow({
  leftHtml,
  yieldIconId = null,
  yieldValue = null,
  yields = null,
  rightHtml = "",
  rowTextStyle = "",
  leftClass = FOCUS_ROW_LEFT_CLASS,
  rightClass = FOCUS_ROW_RIGHT_CLASS,
  leftStyle = "",
  rightStyle = "",
  align = "center",
}) {
  const alignClass = align === "start" ? "items-start" : "items-center";

  const finalLeftStyle = [
    FOCUS_ROW_LEFT_STYLE,
    leftStyle,
    rowTextStyle,
  ]
    .filter(Boolean)
    .join(";");

  const finalRightStyle = [
    FOCUS_ROW_RIGHT_STYLE,
    rightStyle,
  ]
    .filter(Boolean)
    .join(";");

  const resolvedRightHtml =
    rightHtml ||
    renderFocusYieldGroup(
      yields || [
        {
          iconId: yieldIconId,
          value: yieldValue,
        },
      ]
    );

  return `
    <div class="flex justify-between ${alignClass} ${FOCUS_ROW_MARGIN_CLASS} w-full">
      <div class="${leftClass}" style="${finalLeftStyle}">
        ${leftHtml}
      </div>

      <div class="${rightClass}" style="${finalRightStyle}">
        ${resolvedRightHtml}
      </div>
    </div>
  `;
}

export function renderFocusYieldGroup(yields, { showZero = true } = {}) {
  return (yields || [])
    .filter((item) => item && item.iconId && (showZero || item.value))
    .map((item) =>
      renderFocusYieldValue({
        iconId: item.iconId,
        value: item.value,
        showZero,
        fontWeightClass: item.fontWeightClass ?? "font-semibold",
      })
    )
    .join("");
}

export function renderFocusYieldValue({ iconId, value, showZero = true, fontWeightClass = "font-semibold", }) {
  if (!showZero && !value) return "";

  const classAttribute = fontWeightClass ? ` class="${fontWeightClass}"` : "";

  return `
    <span class="inline-flex items-center shrink-0">
      <fxs-icon data-icon-id="${iconId}" class="${FOCUS_ICON_SIZE_CLASS} shrink-0"></fxs-icon>
      <span${classAttribute}>+${formatFocusValue(value)}</span>
    </span>
  `;
}

// Compatibility helper.
// This lets older files migrate away from renderDetailsRow safely.
export function renderDetailsRow({
  leftHtml,
  yieldIconId,
  yieldValue,
  rowTextStyle = "",
} = {}) {
  return renderFocusRow({
    leftHtml,
    yieldIconId,
    yieldValue,
    rowTextStyle,
  });
}

// -----------------------------------------------------------------------------
// Icon / name rendering
// -----------------------------------------------------------------------------

export function renderFocusIconName({ iconId, name, count = null, iconSizeClass = FOCUS_ICON_SIZE_CLASS, } = {}) {
  const countHtml = typeof count === "number" ? `<span class="opacity-70 shrink-0">x${count}</span>` : "";

  return `
    <span class="inline-flex items-center gap-1 whitespace-nowrap min-w-0">
      <fxs-icon data-icon-id="${iconId}" class="${iconSizeClass} shrink-0"></fxs-icon>
      <span class="opacity-60 shrink-0">|</span>
      <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${name}
      </span>
      ${countHtml}
    </span>
  `;
}

export function renderIconName(options = {}) { return renderFocusIconName(options); }

export function renderFocusRecordList(records) {
  return (records || [])
    .map((record, index) => {
      const separator =
        index > 0
          ? `<span class="opacity-70 shrink-0" style="margin: 0 0.125rem;">•</span>`
          : "";

      return `
        ${separator}
        ${renderFocusIconName({
          iconId: record.iconId,
          name: getRecordDisplayName(record),
          iconSizeClass: FOCUS_ICON_SIZE_CLASS,
        })}
      `;
    })
    .join("");
}

// -----------------------------------------------------------------------------
// Improvement details rendering
// -----------------------------------------------------------------------------

export function renderImprovementDetailsHTML(summary, yieldIconId) {
  if (!summary) return null;

  const { items, total, multiplier, baseCount } = summary;

  const totalImprovementCount =
    typeof baseCount === "number"
      ? baseCount
      : Math.round(total / (multiplier || 1));

  const bodyHtml = (items || [])
    .map((item) => {
      const yieldValue = item.count * multiplier;

      return renderFocusRow({
        leftHtml: renderFocusIconName({
          iconId: item.iconId,
          name: item.displayName,
          count: item.count,
        }),
        yieldIconId,
        yieldValue,
      });
    })
    .join("");

  return renderFocusDetails({
    headerYields: [yieldIconId],
    headerTotals: {
      [yieldIconId]: total,
    },
    summaryLabel: composeFocusLabel(
      "LOC_MOD_ETFI_TOTAL_IMPROVEMENTS",
      "Total Improvements"
    ),
    summaryValue: totalImprovementCount,
    bodyHtml,
  });
}

// -----------------------------------------------------------------------------
// Formatting / labels
// -----------------------------------------------------------------------------

export function formatFocusValue(value) {
  const numberValue = Number(value || 0);

  if (Number.isInteger(numberValue)) {
    return String(numberValue);
  }

  return fmt1(numberValue);
}

export function getFocusCompactTextStyle(records) {
  const totalNameLength = (records || []).reduce((sum, record) => {
    return sum + getRecordDisplayName(record).length;
  }, 0);

  return records.length >= 3 || totalNameLength > 40
    ? "font-size: 0.8em;"
    : "";
}

export function getRecordDisplayName(record) {
  return (
    record?.displayName ||
    Locale.compose(record?.nameKey) ||
    record?.type ||
    ""
  );
}

export function composeFocusLabel(key, fallback = "") {
  const value = key ? Locale.compose(key) : "";

  if (value && value !== key) {
    return value;
  }

  return fallback || value || key || "";
}