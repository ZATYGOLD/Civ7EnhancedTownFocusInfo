// ui/production-chooser/details/fort-town.js

// Fort Town:
// - +5 Healing to Units.
// - +25 Health to Fortifications.
// - +1 Gold on Fortified Districts.
// A District is a tile with at least one completed building.
// A Fortified District is a District tile with at least one Fortification.
//
// Display:
// - Fortified Districts: wall rows, because walls are attached to districts.
// - Fortifications: non-wall fortifications, such as fortification improvements,
//   wonders, or temporary fortifications if they appear as city constructibles.

import {
  ETFI_YIELDS,
  renderHeader,
  getConstructibleRecordsByClass,
  getCompletedBuildings,
  getCompletedImprovements,
  groupBy,
  renderIconName,
} from "../../etfi-utilities.js";

const UNIT_HEALING = 5;
const HEALTH_PER_FORTIFICATION = 25;
const GOLD_PER_FORTIFIED_DISTRICT = 1;

// Swap this if the icon is blank in-game.
const UNIT_HEALING_ICON_ID = "ACTION_HEAL";

export default class FortTownDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city);
    const allCompletedRecords = this.getCompletedFortTownRecords(city);

    const districtTileKeys = new Set(
      completedBuildings
        .map((record) => record.tileKey)
        .filter(Boolean)
    );

    const wallFortifications = allCompletedRecords.filter((record) =>
      this.isWallFortificationRecord(record)
    );

    const nonWallFortifications = allCompletedRecords.filter(
      (record) =>
        !this.isWallFortificationRecord(record) &&
        this.isFortificationRecord(record)
    );

    const allFortifications = [
      ...wallFortifications,
      ...nonWallFortifications,
    ];

    const totalHealth =
      allFortifications.length * HEALTH_PER_FORTIFICATION;

    const allFortifiedDistrictTileKeys = new Set(
      allFortifications
        .filter((record) => this.isRecordOnDistrict(record, districtTileKeys))
        .map((record) => record.tileKey)
    );

    const totalGold =
      allFortifiedDistrictTileKeys.size * GOLD_PER_FORTIFIED_DISTRICT;

    const headerOrder = [
      UNIT_HEALING_ICON_ID,
      ETFI_YIELDS.FORTIFY,
      ETFI_YIELDS.GOLD,
    ];

    const headerTotals = {
      [UNIT_HEALING_ICON_ID]: UNIT_HEALING,
      [ETFI_YIELDS.FORTIFY]: totalHealth,
      [ETFI_YIELDS.GOLD]: totalGold,
    };

    const labelFortifiedDistricts = "Fortified Districts";
    const labelFortifications = "Fortifications";

    const assignedGoldTileKeys = new Set();

    let html = `
      <div class="flex flex-col w-full">
        ${renderHeader(headerOrder, headerTotals)}

        <div class="mt-1 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
          <div class="flex justify-between mb-1">
            <span>${labelFortifiedDistricts}</span>
            <span>${this.getUniqueDistrictTileCount(wallFortifications, districtTileKeys)}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
    `;

    html += this.renderFortifiedDistrictRows({
      records: wallFortifications,
      districtTileKeys,
      assignedGoldTileKeys,
    });

    if (nonWallFortifications.length > 0) {
      html += `
          <div style="height: 0.7rem;"></div>

          <div class="flex justify-between mb-1">
            <span>${labelFortifications}</span>
            <span>${nonWallFortifications.length}</span>
          </div>
          <div class="mt-1 border-t border-white/10"></div>
      `;

      html += this.renderFortificationRows({
        records: nonWallFortifications,
        districtTileKeys,
        assignedGoldTileKeys,
      });
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  getCompletedFortTownRecords(city) {
    const records = [
      ...getCompletedBuildings(city),
      ...getCompletedImprovements(city),

      // Some Wonders may be treated as Fortifications.
      // If the game uses a different class name for Wonders, this will safely return [].
      ...getConstructibleRecordsByClass(city, "WONDER", {
        completedOnly: true,
      }),
    ];

    const uniqueById = new Map();

    for (const record of records) {
      if (!record) continue;

      const key = record.id ?? `${record.type}:${record.tileKey}`;
      if (!uniqueById.has(key)) {
        uniqueById.set(key, record);
      }
    }

    return [...uniqueById.values()];
  }

  isRecordOnDistrict(record, districtTileKeys) {
    return !!record?.tileKey && districtTileKeys.has(record.tileKey);
  }

  getUniqueDistrictTileCount(records, districtTileKeys) {
    const tileKeys = new Set();

    for (const record of records || []) {
      if (this.isRecordOnDistrict(record, districtTileKeys)) {
        tileKeys.add(record.tileKey);
      }
    }

    return tileKeys.size;
  }

  isWallFortificationRecord(record) {
    const typeName = this.getRecordTypeName(record);
    const nameKey = this.getRecordNameKey(record);

    return typeName.includes("WALL") || nameKey.includes("WALL");
  }

  isFortificationRecord(record) {
    const typeName = this.getRecordTypeName(record);
    const nameKey = this.getRecordNameKey(record);

    return (
      typeName.includes("FORTIFICATION") ||
      typeName.includes("FORTIFIED") ||
      nameKey.includes("FORTIFICATION") ||
      nameKey.includes("FORTIFIED")
    );
  }

  getRecordTypeName(record) {
    return (
      record?.type ||
      record?.info?.ConstructibleType ||
      ""
    )
      .toString()
      .toUpperCase();
  }

  getRecordNameKey(record) {
    return (
      record?.nameKey ||
      record?.info?.Name ||
      ""
    )
      .toString()
      .toUpperCase();
  }

  renderFortifiedDistrictRows({
    records,
    districtTileKeys,
    assignedGoldTileKeys,
  }) {
    const recordsOnDistricts = records.filter((record) =>
      this.isRecordOnDistrict(record, districtTileKeys)
    );

    return this.renderHealthAndGoldRows({
      records: recordsOnDistricts,
      districtTileKeys,
      assignedGoldTileKeys,
    });
  }

  renderFortificationRows({
    records,
    districtTileKeys,
    assignedGoldTileKeys,
  }) {
    return this.renderHealthAndGoldRows({
      records,
      districtTileKeys,
      assignedGoldTileKeys,
    });
  }

  renderHealthAndGoldRows({
    records,
    districtTileKeys,
    assignedGoldTileKeys,
  }) {
    const groupedRecords = groupBy(records, (record) => record.nameKey);
    let html = "";

    for (const group of groupedRecords.values()) {
      const first = group[0];
      const count = group.length;

      const leftHtml = renderIconName({
        iconId: first.iconId,
        name: first.displayName || Locale.compose(first.nameKey),
        count,
      });

      const healthValue = count * HEALTH_PER_FORTIFICATION;
      const goldValue = this.getAssignableGoldForGroup({
        records: group,
        districtTileKeys,
        assignedGoldTileKeys,
      });

      html += this.renderHealthAndGoldRow({
        leftHtml,
        healthValue,
        goldValue,
      });
    }

    return html;
  }

  getAssignableGoldForGroup({
    records,
    districtTileKeys,
    assignedGoldTileKeys,
  }) {
    let gold = 0;

    for (const record of records || []) {
      if (!this.isRecordOnDistrict(record, districtTileKeys)) continue;
      if (assignedGoldTileKeys.has(record.tileKey)) continue;

      assignedGoldTileKeys.add(record.tileKey);
      gold += GOLD_PER_FORTIFIED_DISTRICT;
    }

    return gold;
  }

  renderHealthAndGoldRow({ leftHtml, healthValue, goldValue }) {
    const goldHtml =
      goldValue > 0
        ? `
          <span class="inline-flex items-center gap-1 ml-2">
            <fxs-icon data-icon-id="${ETFI_YIELDS.GOLD}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${goldValue}</span>
          </span>
        `
        : "";

    return `
      <div class="flex justify-between items-center mt-1">
        <div class="flex items-center gap-2 min-w-0">
          ${leftHtml}
        </div>

        <div class="flex flex-wrap justify-end items-center gap-2">
          <span class="inline-flex items-center gap-1">
            <fxs-icon data-icon-id="${ETFI_YIELDS.FORTIFY}" class="size-4"></fxs-icon>
            <span class="font-semibold">+${healthValue}</span>
          </span>

          ${goldHtml}
        </div>
      </div>
    `;
  }
}