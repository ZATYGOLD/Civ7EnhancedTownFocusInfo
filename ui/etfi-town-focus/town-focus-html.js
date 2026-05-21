// File Path: ui/etfi-town-focus/town-focus-html.js

import { fmt1, renderHeader, renderIconName } from "../../etfi-utilities.js";

const DETAILS_BODY_CLASS = "mt-1 text-accent-2";
const DETAILS_BODY_STYLE = "font-size: 0.8em; line-height: 1.4;";

const FOCUS_ROW_MARGIN_CLASS = "mt-1";
const FOCUS_ICON_SIZE_CLASS = "size-4";

const FOCUS_ROW_LEFT_CLASS = "flex items-center gap-1 min-w-0";
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
  column-gap: 0.25rem;
  row-gap: 0.125rem;
`;

export function renderFocusDetails({
  headerYields,
  headerTotals,
  summaryLabel,
  summaryValue,
  bodyHtml = "",
}) {
  return `
    <div class="flex flex-col w-full">
      ${renderHeader(headerYields, headerTotals)}

      <div class="${DETAILS_BODY_CLASS}" style="${DETAILS_BODY_STYLE}">
        ${renderFocusSummaryRow(summaryLabel, summaryValue)}
        ${renderFocusDivider()}
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

export function renderFocusYieldValue({
  iconId,
  value,
  showZero = true,
  fontWeightClass = "font-semibold",
}) {
  if (!showZero && !value) return "";

  const classAttribute = fontWeightClass ? ` class="${fontWeightClass}"` : "";

  return `
    <span class="inline-flex items-center gap-1 shrink-0">
      <fxs-icon data-icon-id="${iconId}" class="${FOCUS_ICON_SIZE_CLASS} shrink-0"></fxs-icon>
      <span${classAttribute}>+${formatFocusValue(value)}</span>
    </span>
  `;
}

export function formatFocusValue(value) {
  const numberValue = Number(value || 0);

  if (Number.isInteger(numberValue)) {
    return String(numberValue);
  }

  return fmt1(numberValue);
}

export function renderFocusIconName({
  iconId,
  name,
  count,
  iconSizeClass = FOCUS_ICON_SIZE_CLASS,
}) {
  return renderIconName({
    iconId,
    name,
    count,
    iconSizeClass,
  });
}

export function renderFocusRecordList(records) {
  return (records || [])
    .map((record, index) => {
      const separator =
        index > 0
          ? `<span class="opacity-70 shrink-0" style="margin: 0 0.125rem;">•</span>`
          : "";

      const name = getRecordDisplayName(record);

      return `
        ${separator}
        <span
          class="inline-flex items-center min-w-0"
          style="flex: 0 1 auto; overflow: hidden; column-gap: 0.125rem;"
        >
          <fxs-icon data-icon-id="${record.iconId}" class="${FOCUS_ICON_SIZE_CLASS} shrink-0"></fxs-icon>
          <span class="opacity-60 shrink-0">|</span>
          <span
            style="
              min-width: 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            "
          >
            ${name}
          </span>
        </span>
      `;
    })
    .join("");
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