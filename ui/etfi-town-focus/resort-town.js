// File Path: ui/etfi-town-focus/resort-town.js

// Resort details renderer.
// +1 Happiness and Gold on Appealing tiles.
// +50% tile yields from Natural Wonders.
// Can purchase Happiness Buildings.
// In Modern, gives 4 Tourism per Breathtaking tile when at least 7 tiles are Breathtaking after Researching Globalism's Mastery.

import { ETFI_YIELDS, getCompletedImprovements, } from "../../etfi-utilities.js";

import {
  renderFocusDetails,
  renderFocusRow,
  renderFocusIconName,
  renderFocusYieldValue,
  renderFocusDivider,
  composeFocusLabel,
} from "./town-focus-html.js";

const CHARMING_APPEAL_THRESHOLD = 3;
const BREATHTAKING_APPEAL_THRESHOLD = 5;

const BREATHTAKING_HEX_CLASS = "general-appeal-legend-hex";
const BREATHTAKING_THRESHOLD_COLOR = "rgb(26, 90, 0)";

const TOURISM_ICON_ID = "CULTURE_VP";
const MIN_BREATHTAKING_TILES_FOR_TOURISM = 7;
const TOURISM_PER_BREATHTAKING_TILE = 4;

const GLOBALISM_MASTERY_NODE_TYPES = new Set([
  "NODE_GLOBALISM_MASTERY",
  "NODE_CIVIC_GLOBALISM_MASTERY",
  "CIVIC_GLOBALISM_MASTERY",
]);

const GLOBALISM_MASTERY_NAME_KEYS = new Set([
  "LOC_NODE_GLOBALISM_MASTERY_NAME",
  "LOC_CIVIC_GLOBALISM_MASTERY_NAME",
]);

export default class ResortDetails {
  render(city) {
    if (!city || !GameplayMap || !GameInfo?.Features || !GameInfo?.Yields) {
      return null;
    }

    const improvements = getCompletedImprovements(city);
    if (!improvements.length) return null;

    const improvementBuckets = Object.create(null);
    const wonderBuckets = Object.create(null);
    const globalDeltas = Object.create(null);

    for (const improvement of improvements) {
      if (!improvement.location) continue;

      const tileResult = this.getTileResortResult(improvement);
      if (!tileResult) continue;

      this.addYieldDeltas(globalDeltas, tileResult.deltaYields);

      if (tileResult.isNaturalWonder) {
        this.addWonderBucket(wonderBuckets, improvement, tileResult);
      } else {
        this.addImprovementBucket(improvementBuckets, improvement, tileResult);
      }
    }

    const breathtakingTileCount =
      this.getBreathtakingImprovedRuralTileCount(improvements);

    const tourismInfo = this.getModernTourismInfo(breathtakingTileCount);

    if (tourismInfo.totalTourism > 0) {
      globalDeltas[TOURISM_ICON_ID] = tourismInfo.totalTourism;
    }

    if (!Object.keys(globalDeltas).length && !tourismInfo.shouldShowProgress) {
      return null;
    }

    const improvementItems = Object.values(improvementBuckets);
    const wonderItems = Object.values(wonderBuckets);

    const totalImprovementTiles = improvementItems.reduce(
      (sum, item) => sum + (item.count || 0),
      0
    );

    const totalWonderTiles = wonderItems.reduce(
      (sum, item) => sum + (item.count || 0),
      0
    );

    const totalApplicableTiles = totalImprovementTiles + totalWonderTiles;

    const improvementRowsHtml = improvementItems
    .map((item) => this.renderImprovementRow(item))
    .join("");
  
  const wonderRowsHtml = wonderItems
    .map((item) => this.renderWonderRow(item))
    .join("");
  
  const tourismRowHtml = this.renderTourismRow(tourismInfo);
  
  const bodyHtml = `
    ${improvementRowsHtml}
  
    ${wonderRowsHtml}
  
    ${tourismRowHtml}
  `;

    return renderFocusDetails({
      headerYields: [
        ETFI_YIELDS.HAPPINESS,
        ETFI_YIELDS.GOLD,
        TOURISM_ICON_ID,
        ETFI_YIELDS.FOOD,
        ETFI_YIELDS.PRODUCTION,
        ETFI_YIELDS.SCIENCE,
        ETFI_YIELDS.CULTURE,
      ],
      headerTotals: globalDeltas,
      summaryLabel: composeFocusLabel(
        "LOC_MOD_ETFI_TOTAL_IMPROVEMENTS",
        "Total Improvements"
      ),
      summaryValue: totalApplicableTiles,
      bodyHtml,
    });
  }

  getTileResortResult(improvement) {
    const { x, y } = improvement.location;

    const isNaturalWonder = GameplayMap.isNaturalWonder(x, y);
    const appeal = this.getTileAppeal(x, y);
    const isAppealingTile = appeal >= CHARMING_APPEAL_THRESHOLD;

    const baseYields = this.getBaseYieldsForTile(x, y);

    if (!isAppealingTile && !isNaturalWonder) return null;

    const tileYields = { ...baseYields };

    // Resort adds +1 Happiness and +1 Gold on Appealing tiles.
    if (isAppealingTile) {
      tileYields[ETFI_YIELDS.HAPPINESS] =
        (tileYields[ETFI_YIELDS.HAPPINESS] || 0) + 1;

      tileYields[ETFI_YIELDS.GOLD] =
        (tileYields[ETFI_YIELDS.GOLD] || 0) + 1;
    }

    // Natural Wonders get +50% tile yields.
    if (isNaturalWonder) {
      for (const yieldType in tileYields) {
        tileYields[yieldType] *= 1.5;
      }
    }

    const deltaYields = this.getDeltaYields(baseYields, tileYields);
    if (!Object.keys(deltaYields).length) return null;

    return {
      isNaturalWonder,
      deltaYields,
      featureInfo: isNaturalWonder ? this.getFeatureInfo(x, y) : null,
    };
  }

  getBaseYieldsForTile(x, y) {
    const baseYields = Object.create(null);

    for (const yieldInfo of GameInfo.Yields) {
      const amount = GameplayMap.getYield(
        x,
        y,
        yieldInfo.YieldType,
        GameContext.localPlayerID
      );

      if (amount !== 0) {
        baseYields[yieldInfo.YieldType] = amount;
      }
    }

    return baseYields;
  }

  getDeltaYields(baseYields, finalYields) {
    const deltaYields = Object.create(null);

    for (const yieldInfo of GameInfo.Yields) {
      const yieldType = yieldInfo.YieldType;
      const base = baseYields[yieldType] || 0;
      const final = finalYields[yieldType] || 0;
      const delta = final - base;

      if (Math.abs(delta) > 1e-6) {
        deltaYields[yieldType] = delta;
      }
    }

    return deltaYields;
  }

  getFeatureInfo(x, y) {
    const featureType = GameplayMap.getFeatureType(x, y);
    return GameInfo.Features.lookup(featureType) ?? null;
  }

  addYieldDeltas(target, deltas) {
    for (const yieldType in deltas) {
      const amount = deltas[yieldType];
      if (!amount) continue;

      target[yieldType] = (target[yieldType] || 0) + amount;
    }
  }

  addImprovementBucket(buckets, improvement, tileResult) {
    const key =
      improvement.displayName ||
      Locale.compose(improvement.nameKey) ||
      improvement.type;

    if (!buckets[key]) {
      buckets[key] = {
        key,
        iconId: improvement.iconId,
        displayName: key,
        count: 0,
        deltaH: 0,
        deltaG: 0,
      };
    }

    buckets[key].count += 1;
    buckets[key].deltaH += tileResult.deltaYields[ETFI_YIELDS.HAPPINESS] || 0;
    buckets[key].deltaG += tileResult.deltaYields[ETFI_YIELDS.GOLD] || 0;
  }

  addWonderBucket(buckets, improvement, tileResult) {
    const featureInfo = tileResult.featureInfo;
    const wonderName = Locale.compose(featureInfo?.Name) || "Natural Wonder";
    const iconId = improvement.iconId || featureInfo?.FeatureType;

    if (!buckets[wonderName]) {
      buckets[wonderName] = {
        key: wonderName,
        iconId,
        count: 0,
        yields: Object.create(null),
      };
    }

    const bucket = buckets[wonderName];
    bucket.count += 1;

    for (const yieldType in tileResult.deltaYields) {
      bucket.yields[yieldType] =
        (bucket.yields[yieldType] || 0) + tileResult.deltaYields[yieldType];
    }
  }

  getTileAppeal(x, y) {
    if (typeof GameplayMap?.getAppeal !== "function") {
      return Number.NEGATIVE_INFINITY;
    }

    const appeal = Number(GameplayMap.getAppeal(x, y));
    return Number.isNaN(appeal) ? Number.NEGATIVE_INFINITY : appeal;
  }

  getBreathtakingImprovedRuralTileCount(improvements) {
    const breathtakingTileKeys = new Set();

    for (const improvement of improvements || []) {
      const location = improvement.location;
      if (!location || location.x == null || location.y == null) continue;

      const { x, y } = location;

      // Natural Wonders are separate from Breathtaking appeal tiles.
      if (GameplayMap.isNaturalWonder(x, y)) continue;

      // Tourism rule should count improved rural tiles, not water plots.
      if (GameplayMap.isWater(x, y)) continue;

      const appeal = this.getTileAppeal(x, y);
      if (appeal < BREATHTAKING_APPEAL_THRESHOLD) continue;

      breathtakingTileKeys.add(`${x},${y}`);
    }

    return breathtakingTileKeys.size;
  }

  isModernAge() {
    const ageData = GameInfo?.Ages?.lookup?.(Game.age);
    const ageType = (ageData?.AgeType || "").trim();

    return ageType === "AGE_MODERN";
  }

  hasGlobalismMastery() {
    const playerId = GameContext.localPlayerID;
  
    if (
      typeof Game === "undefined" ||
      !Game?.ProgressionTrees ||
      !GameInfo?.ProgressionTreeNodes
    ) {
      return false;
    }
  
    for (const nodeInfo of GameInfo.ProgressionTreeNodes) {
      if (!this.isGlobalismMasteryNode(nodeInfo)) continue;
  
      const nodeState = Game.ProgressionTrees.getNodeState(
        playerId,
        nodeInfo.$hash ?? nodeInfo.NodeType
      );
  
      if (
        typeof ProgressionTreeNodeState !== "undefined" &&
        nodeState >= ProgressionTreeNodeState.NODE_STATE_COMPLETE
      ) {
        return true;
      }
  
      if (
        typeof ProgressionTreeNodeState === "undefined" &&
        nodeState > 0
      ) {
        return true;
      }
    }
  
    return false;
  }
  
  isGlobalismMasteryNode(nodeInfo) {
    const nodeType = (
      nodeInfo?.NodeType ||
      nodeInfo?.ProgressionTreeNodeType ||
      ""
    )
      .toString()
      .toUpperCase();
  
    const nameKey = (nodeInfo?.Name || "")
      .toString()
      .toUpperCase();
  
    return (
      GLOBALISM_MASTERY_NODE_TYPES.has(nodeType) ||
      GLOBALISM_MASTERY_NAME_KEYS.has(nameKey)
    );
  }

  getModernTourismInfo(breathtakingTileCount) {
    const isModernAge = this.isModernAge();
    const hasGlobalismMastery = this.hasGlobalismMastery();
    const hasEnoughBreathtakingTiles =
      breathtakingTileCount >= MIN_BREATHTAKING_TILES_FOR_TOURISM;
  
    const isActive =
      isModernAge &&
      hasGlobalismMastery &&
      hasEnoughBreathtakingTiles;
  
    return {
      isModernAge,
      hasGlobalismMastery,
      hasEnoughBreathtakingTiles,
      isActive,
      shouldShowProgress: isModernAge,
      breathtakingTileCount,
      requiredTileCount: MIN_BREATHTAKING_TILES_FOR_TOURISM,
      totalTourism: isActive
        ? breathtakingTileCount * TOURISM_PER_BREATHTAKING_TILE
        : 0,
    };
  }

  renderTourismRow(tourismInfo) {
    if (!tourismInfo?.isModernAge || !tourismInfo.shouldShowProgress) {
      return "";
    }
  
    const tourismValue = tourismInfo.totalTourism || 0;
  
    const leftHtml = `
      <div
        class="${BREATHTAKING_HEX_CLASS} size-5 bg-contain bg-no-repeat shrink-0"
        style="fxs-background-image-tint: ${BREATHTAKING_THRESHOLD_COLOR};"
      ></div>
  
      <span class="opacity-60">| </span>
      <span>Breathtaking</span>
      <span class="opacity-70 ml-1">
        x${tourismInfo.breathtakingTileCount}/${tourismInfo.requiredTileCount}
      </span>
    `;
  
    const requirementHtml =
      tourismInfo.hasGlobalismMastery
        ? ""
        : `
          <div class="ml-6 opacity-70" style="font-size: 0.75em;">
            Requires Globalism's Mastery
          </div>
        `;
  
    return `
      ${renderFocusDivider()}
  
      ${renderFocusRow({
        leftHtml,
        yieldIconId: TOURISM_ICON_ID,
        yieldValue: tourismValue,
      })}
  
      ${requirementHtml}
    `;
  }

  renderImprovementRow(item) {
    return renderFocusRow({
      leftHtml: renderFocusIconName({
        iconId: item.iconId,
        name: item.displayName,
        count: item.count,
      }),
      yields: [
        {
          iconId: ETFI_YIELDS.HAPPINESS,
          value: item.deltaH,
        },
        {
          iconId: ETFI_YIELDS.GOLD,
          value: item.deltaG,
        },
      ],
    });
  }

  renderWonderRow(item) {
    const labelNaturalWonder = composeFocusLabel(
      "LOC_MOD_ETFI_NATURAL_WONDER",
      "Natural Wonder"
    );

    return `
      <div class="flex justify-between items-start mt-1 w-full">
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            ${renderFocusIconName({
              iconId: item.iconId,
              name: item.key,
              count: item.count,
            })}
          </div>

          <div class="mt-0.5 ml-7 text-white/80" style="font-size: 0.75em;">
            ${labelNaturalWonder}
          </div>
        </div>

        ${this.renderWonderYieldBlock(item.yields)}
      </div>
    `;
  }

  renderWonderYieldBlock(yields) {
    const primaryOrder = [
      ETFI_YIELDS.HAPPINESS,
      ETFI_YIELDS.GOLD,
    ];

    const primaryHtmlParts = [];
    const secondaryHtmlParts = [];

    for (const yieldInfo of GameInfo.Yields) {
      const yieldType = yieldInfo.YieldType;
      const value = yields?.[yieldType];

      if (!value) continue;

      const yieldHtml = renderFocusYieldValue({
        iconId: yieldType,
        value,
        fontWeightClass: "",
      });

      if (primaryOrder.includes(yieldType)) {
        primaryHtmlParts.push(yieldHtml);
      } else {
        secondaryHtmlParts.push(yieldHtml);
      }
    }

    if (!primaryHtmlParts.length && !secondaryHtmlParts.length) {
      return "";
    }

    return `
      <div class="flex flex-col items-end text-right shrink-0">
        ${
          primaryHtmlParts.length
            ? `
              <div class="flex flex-wrap justify-end items-center gap-2 mt-0.5">
                ${primaryHtmlParts.join("")}
              </div>
            `
            : ""
        }

        ${
          secondaryHtmlParts.length
            ? `
              <div class="flex flex-wrap justify-end items-center gap-2 mt-0.5">
                ${secondaryHtmlParts.join("")}
              </div>
            `
            : ""
        }
      </div>
    `;
  }
}