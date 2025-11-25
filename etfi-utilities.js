// #region Constants
export const ETFI_YIELDS = Object.freeze({
    FOOD: "YIELD_FOOD",
    PRODUCTION: "YIELD_PRODUCTION",
    GOLD: "YIELD_GOLD",
    HAPPINESS: "YIELD_HAPPINESS",
    SCIENCE: "YIELD_SCIENCE",
    CULTURE: "YIELD_CULTURE",
    INFLUENCE: "YIELD_DIPLOMACY",
});

const HEADER_YIELD_COLORS = {
    [ETFI_YIELDS.FOOD]:       "rgba(128, 179,  77, 0.50)", // base #80b34d
    [ETFI_YIELDS.PRODUCTION]: "rgba(163,  61,  41, 0.50)", // base #a33d29
    [ETFI_YIELDS.GOLD]:       "rgba(246, 206, 85, 0.50)", // base #f6ce55
    [ETFI_YIELDS.SCIENCE]:    "rgba(108, 166, 224, 0.50)", // base #6ca6e0
    [ETFI_YIELDS.CULTURE]:    "rgba( 92,  92, 214, 0.50)", // base #5c5cd6
    [ETFI_YIELDS.HAPPINESS]:  "rgba(245, 153,  61, 0.50)", // base #f5993d
    [ETFI_YIELDS.INFLUENCE]:  "rgba(175, 183, 207, 0.50)", // base #afb7cf
  };
// #region Logic Helpers
export function fmt1(x) {
    const v = Math.round(x * 10) / 10;
    return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
}

export function getEraMultiplier(base = 1) {
    let multiplier = base;
    const ageData = GameInfo.Ages.lookup(Game.age);
    if (!ageData) return multiplier;
    const ageType = (ageData.AgeType || "").trim();
    if (ageType === "AGE_EXPLORATION") multiplier += 1;
    else if (ageType === "AGE_MODERN") multiplier += 2;
    return multiplier;
}

export function getImprovementSummaryForSet({ city, targetSet, displayNameMap, baseMultiplier = 1 }) {
    if (!city || !city.Constructibles) return null;
    if (!(targetSet instanceof Set) || targetSet.size === 0) return null;
    if (!GameInfo?.Constructibles || !Districts || !Constructibles) return null;
  
    const resultByDisplayKey = Object.create(null);
    const improvements = city.Constructibles.getIdsOfClass("IMPROVEMENT") || [];
  
    for (const instanceId of improvements) {
      const instance = Constructibles.get(instanceId);
      if (!instance) continue;
  
      const location = instance.location;
      if (!location || location.x == null || location.y == null) continue;
  
      // Respect warehouse / free constructible logic
      const fcID = Districts.getFreeConstructible(location, GameContext.localPlayerID);
      const fcInfo = GameInfo.Constructibles.lookup(fcID);
      if (!fcInfo) continue;
  
      const logicalType = fcInfo.ConstructibleType;
      if (!targetSet.has(logicalType)) continue;
  
      const info = GameInfo.Constructibles.lookup(instance.type);
      const ctype = info?.ConstructibleType || logicalType;
      const displayKey = (displayNameMap && displayNameMap[ctype]) || info?.Name || ctype;
  
      if (!resultByDisplayKey[displayKey]) {
        resultByDisplayKey[displayKey] = {
          key: displayKey,
          ctype,
          iconId: ctype,
          displayName: Locale.compose(displayKey),
          count: 0,
        };
      }
      resultByDisplayKey[displayKey].count += 1;
    }
  
    const items = Object.values(resultByDisplayKey);
    if (!items.length) return null;
  
    const baseTotal = items.reduce((sum, it) => sum + it.count, 0);
    const multiplier = getEraMultiplier(baseMultiplier);
    const total = baseTotal * multiplier;
  
    return { items, total, multiplier, baseCount: baseTotal };
}


// #region Render Helpers
export function renderHeaderBadge(iconId, value) {
    const order = [iconId];
    const totals = { [iconId]: value };
  
    return `
      <div 
        class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2 flex-wrap"
        style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
      >
        ${renderHeaderChips(order, totals)}
      </div>
    `;
}

export function renderHeaderChips(yieldOrder, totals) {
    let html = "";
    if (!yieldOrder || !totals) return html;
  
    for (const yType of yieldOrder) {
      const val = totals[yType];
  
      // Only skip if it's *not* a number at all.
      // 0, 1, -1, etc. are all allowed and will render.
      if (typeof val !== "number") continue;
  
      const color = HEADER_YIELD_COLORS[yType] || "rgba(255, 255, 255, 0.25)";
  
      html += `
        <div class="flex items-center mr-1">
          <div
            class="flex items-center justify-center gap-1"
            style="
              /* top | right | bottom | left */
              padding: 0.5px 4px 0.5px 8px;
              min-height: 0.5rem;
              border-radius: 9999px;
              background-color: ${color};
              border: 1px solid ${color};
              color: #f2f2f2;
              font-size: 0.9em;
            "
          >
            <span class="font-semibold">+${fmt1(val)}</span>
            <fxs-icon data-icon-id="${yType}" class="size-7"></fxs-icon>
          </div>
        </div>
      `;
    }
  
    return html;
}

export function renderImprovementDetailsHTML(summary, yieldIconId) {
    if (!summary) return null;
  
    const { items, total, multiplier, baseCount } = summary;
    const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");

    // Use the same pill header style as other town focuses
    const headerYieldsHtml = renderHeaderChips(
        [yieldIconId],
        { [yieldIconId]: total }
    );
  
    let html = `
      <div class="flex flex-col w-full">
        <div
          class="flex items-center justify-center gap-2 mb-2 rounded-md px-3 py-2 flex-wrap"
          style="background-color: rgba(10, 10, 20, 0.25); color:#f5f5f5; text-align:center;"
        >
          ${headerYieldsHtml}
        </div>
    `;
  
    html += `
      <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4%;">
        <div class="flex justify-between mb-1">
          <span>${labelTotalImprovements}</span>
          <span>${typeof baseCount === "number" ? baseCount : Math.round(total / (multiplier || 1))}</span>
        </div>
        <div class="mt-1 border-t border-white/10"></div>
    `;
  
    for (const item of items) {
      const perImprovementYield = item.count * multiplier;
      html += `
        <div class="flex justify-between items-center mt-1">
          <div class="flex items-center gap-2">
            <fxs-icon data-icon-id="${item.iconId}" class="size-5"></fxs-icon>
            <span class="opacity-60">| </span>
            <span>${item.displayName}</span>
            <span class="opacity-70 ml-1">x${item.count}</span>
          </div>
          <div class="flex items-center gap-1">
            <fxs-icon data-icon-id="${yieldIconId}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${perImprovementYield}</span>
          </div>
        </div>
      `;
    }
  
    html += `</div></div>`;
    return html;
}