// File Path: ui/etfi-town-focus/town-focus-html.js

import { fmt1, renderHeader, renderIconName } from "../../etfi-utilities.js";

const DETAILS_BODY_CLASS = "mt-1 text-accent-2";
const DETAILS_BODY_STYLE = "font-size: 0.8em; line-height: 1.4;";

export function renderFocusDetails({ headerYields, headerTotals, summaryLabel, summaryValue, bodyHtml = "" }) {
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
    ${includeSpacer ? `<div style="height: 0.7rem;"></div>` : ""}
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
  leftClass = "flex items-center gap-2 min-w-0",
  rightClass = "flex flex-wrap justify-end items-center gap-2 shrink-0 text-right",
  align = "center",
}) {
  const alignClass = align === "start" ? "items-start" : "items-center";
  const styleAttr = rowTextStyle ? ` style="${rowTextStyle}"` : "";

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
    <div class="flex justify-between ${alignClass} mt-1 w-full">
      <div class="${leftClass}"${styleAttr}>
        ${leftHtml}
      </div>

      <div class="${rightClass}">
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

  return `
    <span class="inline-flex items-center gap-1">
      <fxs-icon data-icon-id="${iconId}" class="size-4"></fxs-icon>
      <span class="${fontWeightClass}">+${formatFocusValue(value)}</span>
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
  iconSizeClass = "size-5",
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
          ? `<span class="mx-0\\.5 opacity-70 shrink-0">•</span>`
          : "";

      const name = getRecordDisplayName(record);

      return `
        ${separator}
        <span
          class="inline-flex items-center min-w-0"
          style="flex: 0 1 auto; overflow: hidden; column-gap: 0.125rem;"
        >
          <fxs-icon data-icon-id="${record.iconId}" class="size-4 shrink-0"></fxs-icon>
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