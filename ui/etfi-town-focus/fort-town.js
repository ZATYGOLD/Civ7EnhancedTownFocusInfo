// File Path: ui/etfi-town-focus/fort-town.js

// Fort Town:
// - +5 Healing to Units.
// - +25 Health to Fortifications.
// - +1 Gold on Fortified Districts.
// A District is a tile with at least one completed non-wall building.
// A Fortified District is a District tile with at least one Fortification.
//
// Display:
// - Fortified Districts: wall rows, because walls are attached to districts.
// - Fortifications: non-wall fortifications, such as fortification improvements,
//   wonders, or temporary fortifications if they appear as city constructibles.

import { ETFI_YIELDS, getConstructibleRecordsByClass, getCompletedBuildings, getCompletedImprovements, isWallRecord, groupBy, } from "../../etfi-utilities.js";
import { renderFocusDetails, renderFocusSectionHeader, renderFocusRow, renderFocusIconName, } from "./town-focus-html.js";

const UNIT_HEALING = 5;
const HEALTH_PER_FORTIFICATION = 25;
const GOLD_PER_FORTIFIED_DISTRICT = 1;

// Swap this if the icon is blank in-game.
const UNIT_HEALING_ICON_ID = "ACTION_HEAL";

export default class FortTownDetails {
  render(city) {
    if (!city) return null;

    const completedBuildings = getCompletedBuildings(city).filter(
      (record) => !isWallRecord(record)
    );

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

    const fortifiedDistrictTileKeys = new Set(
      allFortifications
        .filter((record) => this.isRecordOnDistrict(record, districtTileKeys))
        .map((record) => record.tileKey)
    );

    const totalGold =
      fortifiedDistrictTileKeys.size * GOLD_PER_FORTIFIED_DISTRICT;

    const assignedGoldTileKeys = new Set();

    let bodyHtml = this.renderFortifiedDistrictRows({
      records: wallFortifications,
      districtTileKeys,
      assignedGoldTileKeys,
    });

    if (nonWallFortifications.length > 0) {
      bodyHtml += renderFocusSectionHeader({
        label: "Fortifications",
        value: nonWallFortifications.length,
      });

      bodyHtml += this.renderFortificationRows({
        records: nonWallFortifications,
        districtTileKeys,
        assignedGoldTileKeys,
      });
    }

    return renderFocusDetails({
      headerYields: [
        UNIT_HEALING_ICON_ID,
        ETFI_YIELDS.FORTIFY,
        ETFI_YIELDS.GOLD,
      ],
      headerTotals: {
        [UNIT_HEALING_ICON_ID]: UNIT_HEALING,
        [ETFI_YIELDS.FORTIFY]: totalHealth,
        [ETFI_YIELDS.GOLD]: totalGold,
      },
      summaryLabel: "Fortified Districts",
      summaryValue: fortifiedDistrictTileKeys.size,
      bodyHtml,
    });
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

  isWallFortificationRecord(record) {
    if (isWallRecord(record)) return true;

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

  getRecordDisplayName(record) {
    return (
      record?.displayName ||
      Locale.compose(record?.nameKey) ||
      record?.type ||
      ""
    );
  }

  renderFortifiedDistrictRows({
    records,
    districtTileKeys,
    assignedGoldTileKeys,
  }) {
    const recordsOnDistricts = records.filter((record) =>
      this.isRecordOnDistrict(record, districtTileKeys)
    );

    return this.renderFortificationRows({
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
    const groupedRecords = groupBy(
      records,
      (record) => record.nameKey || record.type
    );

    let html = "";

    for (const group of groupedRecords.values()) {
      const first = group[0];
      const count = group.length;

      const healthValue = count * HEALTH_PER_FORTIFICATION;

      const goldValue = this.getAssignableGoldForGroup({
        records: group,
        districtTileKeys,
        assignedGoldTileKeys,
      });

      const yields = [
        {
          iconId: ETFI_YIELDS.FORTIFY,
          value: healthValue,
        },
      ];

      if (goldValue > 0) {
        yields.push({
          iconId: ETFI_YIELDS.GOLD,
          value: goldValue,
        });
      }

      html += renderFocusRow({
        leftHtml: renderFocusIconName({
          iconId: first.iconId,
          name: this.getRecordDisplayName(first),
          count,
        }),
        yields,
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
}