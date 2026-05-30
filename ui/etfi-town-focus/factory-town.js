// File Path: ui/etfi-town-focus/factory-town.js
//
// Author: Zatygold
//
// Factory Town (PROJECT_TOWN_FACTORY, Modern): +1 Resource Slot and +5 Trade
// Route range (pills by the name). Lists the town's Factory Resources, split by
// the shared Improved / Unimproved categories. (The +100% purchase discount is
// already in the project description, so it's not repeated here.)

import { RESOURCE_ICON, getFactoryResources, improvedUnimprovedSections, tradeRangePill } from "../../etfi-utilities.js";

const RESOURCE_SLOT = 1;

export function buildFactoryModel(city) {
  const { improved, unimproved } = getFactoryResources(city);

  return {
    header: [
      { yieldType: RESOURCE_ICON, value: RESOURCE_SLOT },
      tradeRangePill(),
    ],
    rows: [],
    sections: improvedUnimprovedSections({ improved, unimproved }),
    notes: [],
  };
}
