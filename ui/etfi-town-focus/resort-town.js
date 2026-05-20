// Resort details renderer.
// +1 Happiness and Gold on Appealing tiles. +50% tile yields from Natural Wonders. Can purchase Happiness Buildings. 
// In Modern, gives 4 Tourism per Breathtaking tile when at least 7 tiles are Breathtaking. 
import { ETFI_YIELDS, fmt1, renderHeader, getCompletedImprovements, renderIconName } from "../../etfi-utilities.js";

export default class ResortDetails {
  render(city) {
    if (!city || !GameplayMap || !GameInfo?.Features || !GameInfo?.Yields) return null;
    
    const improvements = getCompletedImprovements(city);
    if (!improvements.length) return null;

    const multiplier = 1;

    const improvementBuckets = Object.create(null);
    const wonderBuckets = Object.create(null);
    const globalDeltas = Object.create(null);

    for (const improvement of improvements) {
      if (!improvement.location) continue;

      const tileResult = this.getTileResortResult(improvement, multiplier);
      if (!tileResult) continue;

      this.addYieldDeltas(globalDeltas, tileResult.deltaYields);

      if (tileResult.isNaturalWonder) {
        this.addWonderBucket(wonderBuckets, improvement, tileResult);
      } else {
        this.addImprovementBucket(improvementBuckets, improvement, tileResult);
      }
    }

    if (!Object.keys(globalDeltas).length) return null;

    const improvementItems = Object.values(improvementBuckets);
    const wonderItems = Object.values(wonderBuckets);

    const headerOrder = [
      ETFI_YIELDS.HAPPINESS,
      ETFI_YIELDS.GOLD,
      ETFI_YIELDS.FOOD,
      ETFI_YIELDS.PRODUCTION,
      ETFI_YIELDS.SCIENCE,
      ETFI_YIELDS.CULTURE,
    ];

    const labelTotalImprovements = Locale.compose("LOC_MOD_ETFI_TOTAL_IMPROVEMENTS");
    const labelNaturalWonder =
      Locale.compose("LOC_MOD_ETFI_NATURAL_WONDER") || "Natural Wonder";

    const baseTotalImprovements = improvementItems.reduce(
      (sum, item) => sum + (item.count || 0),
      0
    );

    const totalWonderTiles = wonderItems.reduce(
      (sum, item) => sum + (item.count || 0),
      0
    );

    const totalApplicableTiles = baseTotalImprovements + totalWonderTiles;

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(headerOrder, globalDeltas)}
        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelTotalImprovements}</span>
            <span>${totalApplicableTiles}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    for (const item of improvementItems) {
      html += this.renderImprovementRow(item);
    }

    for (const item of wonderItems) {
      html += this.renderWonderRow(item, labelNaturalWonder);
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  getTileResortResult(improvement, multiplier) {
    const { x, y } = improvement.location;
  
    const isNaturalWonder = GameplayMap.isNaturalWonder(x, y);
    const baseYields = this.getBaseYieldsForTile(x, y);
    const happyBase = baseYields[ETFI_YIELDS.HAPPINESS] || 0;
  
    // In-game Appeal gives base Happiness:
    // Charming = +1 Happiness
    // Breathtaking = +2 Happiness
    const isAppealingTile = happyBase > 0;
  
    // If not Appealing and not a Natural Wonder, Resort adds nothing.
    if (!isAppealingTile && !isNaturalWonder) return null;
  
    const tileYields = { ...baseYields };
  
    // Resort adds +1 Happiness and +1 Gold on Appealing tiles.
    if (isAppealingTile) {
      tileYields[ETFI_YIELDS.HAPPINESS] = (tileYields[ETFI_YIELDS.HAPPINESS] || 0) + multiplier;
      tileYields[ETFI_YIELDS.GOLD] = (tileYields[ETFI_YIELDS.GOLD] || 0) + multiplier;
    }
  
    // Natural Wonders get +50% tile yields.
    if (isNaturalWonder) {
      for (const yieldType in tileYields) {
        tileYields[yieldType] *= 1.5;
      }
    }
  
    const deltaYields = this.getDeltaYields(baseYields, tileYields);
    if (!Object.keys(deltaYields).length) return null;
  
    return { isNaturalWonder, deltaYields, featureInfo: isNaturalWonder ? this.getFeatureInfo(x, y) : null, isBreathtakingTile: happyBase >= 2 };
  }

  getBaseYieldsForTile(x, y) {
    const baseYields = Object.create(null);

    for (const yieldInfo of GameInfo.Yields) {
      const amount = GameplayMap.getYield(x, y, yieldInfo.YieldType, GameContext.localPlayerID);

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
    const key = improvement.displayName || Locale.compose(improvement.nameKey) || improvement.type;

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
      bucket.yields[yieldType] = (bucket.yields[yieldType] || 0) + tileResult.deltaYields[yieldType];
    }
  }

  renderImprovementRow(item) {
    const leftHtml = renderIconName({
      iconId: item.iconId,
      name: item.displayName,
      count: item.count,
    });

    const rightHtml = `
      <span class="inline-flex items-center gap-2 ml-2">
        <fxs-icon data-icon-id="${ETFI_YIELDS.HAPPINESS}" class="size-4"></fxs-icon>
        <span class="font-semibold">+${fmt1(item.deltaH)}</span>
      </span>
      <span class="inline-flex items-center gap-2 ml-2">
        <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
        <span class="font-semibold">+${fmt1(item.deltaG)}</span>
      </span>
    `;

    return `
      <div class="flex justify-between items-center mt-1">
        <div class="flex items-center gap-2">
          ${leftHtml}
        </div>
        <div class="flex flex-wrap justify-end items-center gap-2">
          ${rightHtml}
        </div>
      </div>
    `;
  }

  renderWonderRow(item, labelNaturalWonder) {
    const rightHtml = this.renderWonderYieldBlock(item.yields);

    return `
      <div class="flex justify-between items-start mt-1">
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            ${renderIconName({
              iconId: item.iconId,
              name: item.key,
              count: item.count,
            })}
          </div>
          <div class="mt-0.5 ml-7 text-white/80" style="font-size: 0.75em;">
            ${labelNaturalWonder}
          </div>
        </div>
        ${rightHtml}
      </div>
    `;
  }

  renderWonderYieldBlock(yields) {
    const primaryOrder = [ETFI_YIELDS.HAPPINESS, ETFI_YIELDS.GOLD];
    const primaryHtmlParts = [];
    const secondaryHtmlParts = [];

    for (const yieldInfo of GameInfo.Yields) {
      const yieldType = yieldInfo.YieldType;
      const value = yields?.[yieldType];

      if (!value) continue;

      const part = `
        <span class="inline-flex items-center gap-1" style="margin-left: 0.5rem;">
          <fxs-icon data-icon-id="${yieldType}" class="size-4"></fxs-icon>
          <span>+${fmt1(value)}</span>
        </span>
      `;

      if (primaryOrder.includes(yieldType)) {
        primaryHtmlParts.push(part);
      } else {
        secondaryHtmlParts.push(part);
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
              <div class="flex flex-wrap justify-end items-center mt-0.5">
                ${primaryHtmlParts.join("")}
              </div>
            `
            : ""
        }
        ${
          secondaryHtmlParts.length
            ? `
              <div class="flex flex-wrap justify-end items-center mt-0.5">
                ${secondaryHtmlParts.join("")}
              </div>
            `
            : ""
        }
      </div>
    `;
  }
}