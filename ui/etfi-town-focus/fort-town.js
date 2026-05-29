// File Path: ui/etfi-town-focus/fort-town.js
//
// Author: Zatygold
//
// Fort Town (PROJECT_TOWN_FORT): +5 Healing to Units (pill by the name), and on
// each fortification +1 Gold (on its fortified district) and +25 Health.

import { ETFI_YIELDS, HEAL_ICON, FORTIFY_ICON, getFortifications } from "../../etfi-utilities.js";

const GOLD_PER = 1;
const HEALTH_PER = 25;
const UNIT_HEALING = 5;

export function buildFortModel(city) {
  const walls = getFortifications(city);
  const rows = walls.map((w) => ({
    iconId: w.iconId,
    name: w.name,
    yields: [
      { yieldType: ETFI_YIELDS.GOLD, value: GOLD_PER },
      { yieldType: FORTIFY_ICON, value: HEALTH_PER },
    ],
  }));
  return {
    header: [{ yieldType: HEAL_ICON, value: UNIT_HEALING }],
    rows,
    notes: [],
  };
}
