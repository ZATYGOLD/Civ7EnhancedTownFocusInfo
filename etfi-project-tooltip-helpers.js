import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { BuildingPlacementManager as BPM } from '/base-standard/ui/building-placement/building-placement-manager.js';

const ETFI_CLASS_IDS = {
    IMPROVEMENT: "IMPROVEMENT"
};

function validateCity(city, type = null)
{
    if (!city) return false;
    if(type != null && (!GameInfo?.Constructibles || !city?.Constructibles)) return false;
    return true;
}

export function getCityImprovements(city) {
    if (!city || !city.Constructibles) return null;
    const result = Object.create(null);
    const localPlayer = GameContext.localPlayerID;

    const improvements = city.Constructibles.getIdsOfClass(ETFI_CLASS_IDS.IMPROVEMENT) || [];
    for (const index of improvements) {
        const info = GameInfo.Constructibles?.lookup(index) || null;
        const wInfo = Districts.getFreeConstructible(index.location, localPlayer);
        const yieldList = Object.create(null);

        for (const yieldInfo of GameInfo.Yields) {
            const yieldCount = GameplayMap.getYield(index.location.x, index.location.y, yieldInfo.YieldType, localPlayer);
            if (yieldCount >= 1) {
                yieldList[yieldInfo.YieldType] = yieldCount;
            }
        }

        result[info?.Name] = {
            name: localStorage.compose(info?.Name) || null,
            ctype: info?.ConstructibleType || null,
            wtype: wInfo?.ConstructibleType || null,
            hash: info?.$hash || null,
            icon: type, 
            yields: yieldList,
            count: 0
       };
       result[info?.Name].count += 1;
    }

    return result;
}