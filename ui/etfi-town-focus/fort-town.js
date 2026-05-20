// ui/production-chooser/details/fort-town.js
//
// Fort Town: shows a Fortify header and wall breakdown.
// Header value: +25 per "age-qualified" wall.
// Details: all walls listed with xcount, but only age-qualified walls add Fortify value.

import { ETFI_YIELDS, renderHeader, renderDetailsRow, getCompletedBuildings, isWallRecord, groupBy, renderIconName, } from "../../etfi-utilities.js";

export default class FortTownDetails {
  render(city) { 
    if (!city) return null;

    const currentAge = GameInfo?.Ages?.lookup?.(Game.age);
    const ageType = (currentAge?.AgeType || "").trim();
    const VALUE = 25;
    const labelTotalWalls = Locale.compose("LOC_MOD_ETFI_TOTAL_WALLS");
  
    const walls = getCompletedBuildings(city).filter(isWallRecord);
    let totalQualifiedCount = 0;
  
    for (const wall of walls) {
      const typeName = wall.type || "";
  
      const isAntiquityWall = typeName.includes("ANCIENT");
      const isExplorationWall = typeName.includes("MEDIEVAL");
      const isModernWall = typeName.includes("DEFENSIVE");
  
      wall.qualifiesForAge =
        (ageType === "AGE_ANTIQUITY" && isAntiquityWall) ||
        (ageType === "AGE_EXPLORATION" && isExplorationWall) ||
        (ageType === "AGE_MODERN" && isModernWall);
  
      if (wall.qualifiesForAge) {
        totalQualifiedCount += 1;
      }
    }
  
    if (!walls.length) {
      return `
        <div class="flex flex-col w-full">
          ${renderHeader([ETFI_YIELDS.FORTIFY], 0)}
        </div>
      `;
    }
  
    const groupedWalls = groupBy(walls, (wall) => wall.nameKey);
    const wallItems = [...groupedWalls.values()].map((items) => {
      const first = items[0];
      return {
        iconId: first.iconId,
        nameKey: first.nameKey,
        totalCount: items.length,
        qualifyingCount: items.filter((wall) => wall.qualifiesForAge).length,
      };
    });
  
    const totalFortify = totalQualifiedCount * VALUE;
    const headerHtml = renderHeader([ETFI_YIELDS.FORTIFY], totalFortify);
  
    let html = `
      <div class="flex flex-col w-full">
        ${headerHtml}
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalWalls}</span>
            <span>${walls.length}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;
  
    for (const wall of wallItems) {
      const displayName = Locale.compose(wall.nameKey);
      const yieldValue = wall.qualifyingCount * VALUE;
  
      const leftHtml = renderIconName({
        iconId: wall.iconId,
        name: displayName,
        count: wall.totalCount,
      });
  
      html += renderDetailsRow({
        leftHtml,
        yieldIconId: ETFI_YIELDS.FORTIFY,
        yieldValue,
      });
    }
  
    html += `
        </div>
      </div>
    `;
  
    return html;
  }
}
