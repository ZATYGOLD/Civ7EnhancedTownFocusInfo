// ui/helpers/resolve-active-policies.js
//
// Utility helpers for working with *active* policies (Traditions)
// and their associated Modifiers.
//
// Depends on the base game policies model and GameInfo tables.

import { a as PoliciesData } from "/base-standard/ui/policies/model-policies.chunk.js";

/* ------------------------------------------------------------------------- */
/*  Active policies                                                         */
/* ------------------------------------------------------------------------- */

/**
 * Ensure the PoliciesData model is up to date and return active policies.
 *
 * @returns {any[]} array of active policy rows (GameInfo.Traditions lookup)
 */
export function getActivePolicies() {
  if (typeof PoliciesData.update === "function") {
    PoliciesData.update();
  }
  return PoliciesData.activePolicies ?? [];
}

/* ------------------------------------------------------------------------- */
/*  Modifier links from Traditions                                          */
/* ------------------------------------------------------------------------- */

/**
 * Safely extract a ModifierId (some tables use ModifierId, some use ModifierID).
 * @param {any} row
 * @returns {string | null}
 */
export function extractModifierIdFromLinkRow(row) {
  if (!row) return null;
  return row.ModifierId ?? row.ModifierID ?? null;
}

/**
 * Returns all modifier IDs attached to a given TraditionType,
 * using GameInfo.TraditionModifiers.
 *
 * @param {string} traditionType
 * @returns {string[]} unique modifier ids
 */
export function getModifierIdsForTraditionType(traditionType) {
  if (!traditionType || !GameInfo?.TraditionModifiers) return [];

  const ids = new Set();

  for (const tm of GameInfo.TraditionModifiers) {
    if (tm.TraditionType !== traditionType) continue;

    const id = extractModifierIdFromLinkRow(tm);
    if (id) {
      ids.add(id);
    }
  }

  return Array.from(ids);
}

/* ------------------------------------------------------------------------- */
/*  RequirementSet resolver                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Expand a RequirementSetId into a structured object:
 * {
 *   RequirementSetId,
 *   RequirementSetType,
 *   Requirements: [
 *     {
 *       RequirementId,
 *       RequirementType,
 *       Arguments: [ { Name, Value }... ]
 *     }, ...
 *   ]
 * }
 *
 * Returns null if the set (or tables) can't be found.
 *
 * @param {string | null | undefined} requirementSetId
 * @returns {any | null}
 */
export function resolveRequirementSet(requirementSetId) {
  if (
    !requirementSetId ||
    !GameInfo?.RequirementSets ||
    !GameInfo?.RequirementSetRequirements ||
    !GameInfo?.Requirements
  ) {
    return null;
  }

  const RequirementSet = GameInfo.RequirementSets.find(
    (rs) => rs.RequirementSetId === requirementSetId
  );
  if (!RequirementSet) {
    console.error("[ETFI] RequirementSet not found:", requirementSetId);
    return null;
  }

  const links = GameInfo.RequirementSetRequirements.filter(
    (rsr) => rsr.RequirementSetId === requirementSetId
  );

  const reqs = links.map((link) => {
    const req = GameInfo.Requirements.find(
      (r) =>
        r.RequirementId === link.RequirementId ||
        r.RequirementId === link.requirementId
    );

    if (!req) {
      console.error(
        "[ETFI] Requirement row not found for RequirementSet link:",
        link
      );
      return null;
    }

    const rawArgs =
      GameInfo.RequirementArguments?.filter(
        (ra) =>
          ra.RequirementId === req.RequirementId ||
          ra.RequirementId === req.requirementId
      ) ?? [];

    const args = rawArgs.map((a) => ({
      Name: a.Name,
      Value: a.Value
    }));

    return {
      RequirementId: req.RequirementId,
      RequirementType: req.RequirementType,
      Arguments: args
    };
  });

  return {
    RequirementSetId: RequirementSet.RequirementSetId,
    RequirementSetType: RequirementSet.RequirementSetType,
    Requirements: reqs
  };
}

/* ------------------------------------------------------------------------- */
/*  Modifier resolver                                                       */
/* ------------------------------------------------------------------------- */

/**
 * Standalone resolver for a ModifierId.
 *
 * Returns:
 * {
 *   Modifier,              // raw row from GameInfo.Modifiers
 *   DynamicModifier,       // row from GameInfo.DynamicModifiers (collection/effect)
 *   SubjectRequirementSet, // expanded RequirementSet object (or null)
 *   OwnerRequirementSet,   // expanded RequirementSet object (or null)
 *   Arguments: [ { Name, Value }... ],
 *   DescriptionTag,        // description LOC tag (if found)
 *   DescriptionText        // localized text (if Locale.compose works)
 * }
 *
 * Returns null if the modifier can't be found.
 *
 * @param {string} modifierId
 * @returns {any | null}
 */
export function resolveModifierById(modifierId) {
  if (!modifierId || !GameInfo?.Modifiers) return null;

  const m = GameInfo.Modifiers.find(
    (mod) =>
      mod.ModifierId === modifierId ||
      mod.ModifierID === modifierId
  );

  if (!m) {
    console.error("[ETFI] Modifier not found in GameInfo.Modifiers:", modifierId);
    return null;
  }

  const DynamicModifier =
    GameInfo.DynamicModifiers?.find(
      (dm) => dm.ModifierType === m.ModifierType
    ) ?? null;

  if (!DynamicModifier) {
    console.error(
      "[ETFI] DynamicModifier not found for ModifierType:",
      m.ModifierType,
      " (ModifierId=",
      modifierId,
      ")"
    );
  }

  const SubjectRequirementSet = resolveRequirementSet(
    m.SubjectRequirementSetId ||
      m.SubjectRequirementSetID ||
      m.SubjectRequirementSet
  );

  const OwnerRequirementSet = resolveRequirementSet(
    m.OwnerRequirementSetId ||
      m.OwnerRequirementSetID ||
      m.OwnerRequirementSet
  );

  const rawArgs =
    GameInfo.ModifierArguments?.filter(
      (ma) =>
        ma.ModifierId === modifierId ||
        ma.ModifierID === modifierId
    ) ?? [];

  const Arguments = rawArgs.map((a) => ({
    Name: a.Name,
    Value: a.Value
  }));

  // Optional: Description from GameInfo.ModifierStrings
  let DescriptionTag = null;
  let DescriptionText = null;

  if (GameInfo?.ModifierStrings) {
    const rows = GameInfo.ModifierStrings.filter(
      (ms) => ms.ModifierId === modifierId
    );

    const descRow =
      rows.find(
        (ms) =>
          ms.Context === "Description" ||
          ms.context === "Description"
      ) ?? null;

    if (descRow) {
      const tag = descRow.Text ?? descRow.String ?? null;
      DescriptionTag = tag;

      if (tag && typeof Locale !== "undefined") {
        const composed = Locale.compose(tag);
        if (composed && composed !== tag) {
          DescriptionText = composed;
        }
      }
    }
  }

  return {
    Modifier: m,
    DynamicModifier,
    SubjectRequirementSet,
    OwnerRequirementSet,
    Arguments,
    DescriptionTag,
    DescriptionText
  };
}

/* ------------------------------------------------------------------------- */
/*  High-level: resolved modifiers for active policies                      */
/* ------------------------------------------------------------------------- */

/**
 * For each *active* policy / Tradition, return:
 *
 * {
 *   activePolicyCount,
 *   entries: [
 *     {
 *       traditionType,
 *       nameTag,
 *       localizedName,
 *       modifierIds: string[],
 *       modifiers: [ resolveModifierById(...) | { error, id } ... ]
 *     },
 *     ...
 *   ]
 * }
 */
export function getResolvedModifiersForActivePolicies() {
  const activePolicies = getActivePolicies();
  const entries = [];

  for (const policy of activePolicies) {
    const traditionType = policy.TraditionType || policy.Tradition;
    if (!traditionType) continue;

    const modifierIds = getModifierIdsForTraditionType(traditionType);

    const nameTag =
      policy.Name ||
      policy.NameTag ||
      policy.TraditionNameTag ||
      policy.TraditionType ||
      null;

    const localizedName =
      nameTag && typeof Locale !== "undefined"
        ? (Locale.compose(nameTag) || nameTag)
        : nameTag;

    const modifiers = modifierIds.map((id) => {
      const resolved = resolveModifierById(id);
      return resolved ?? { error: "Modifier not found or failed to resolve", id };
    });

    entries.push({
      traditionType,
      nameTag,
      localizedName,
      modifierIds,
      modifiers
    });
  }

  return {
    activePolicyCount: activePolicies.length,
    entries
  };
}
