// modifiers/etfi-policy-bonus-yields.js
//
// Shared helper to render ETFI "Bonus Yields" policy modifier labels.
//
// Uses resolved active policy modifiers from resolve-active-policies.js
// and derives a human-friendly, localized label per modifier.

import { getResolvedModifiersForActivePolicies } from "./resolve-active-policies.js";

// Requirements we care about (OR logic)
const ALLOWED_REQUIREMENT_TYPES = new Set([
  "REQUIREMENT_CITY_IS_TOWN",
  "REQUIREMENT_REQUIREMENTSET_IS_MET",
  "REQUIREMENT_CITY_HAS_PROJECT",
  // Add more RequirementType strings here if you want them included
]);

/**
 * Derive a display label for a resolved modifier:
 * - Prefer Tooltip argument (localized).
 * - If no tooltip, fall back to the policyLabel (already localized if possible).
 * - Only then fall back to modifier id.
 */
function getLabelForResolvedModifier(resolved, fallbackId, fallbackPolicyLabel) {
  // Normalize args
  let args = resolved && (resolved.Arguments || resolved.arguments) || [];
  if (!Array.isArray(args) && args && typeof args === "object") {
    args = Object.values(args);
  }

  // 1) Tooltip argument (e.g. LOC_TRADITION_SALES_AND_TRADE_NAME)
  const tooltipArg = args.find(
    (a) => a && (a.Name === "Tooltip" || a.name === "Tooltip")
  );

  if (tooltipArg && tooltipArg.Value) {
    const tag = tooltipArg.Value;
    if (typeof Locale !== "undefined" && tag) {
      const text = Locale.compose(tag);
      if (text && text !== tag) {
        return text;
      }
    }
    return tag;
  }

  // 2) If we have a policy label (localizedName / localized nameTag), use that
  if (fallbackPolicyLabel) {
    return fallbackPolicyLabel;
  }

  // 3) Fall back to the modifier's id
  const rawId =
    (resolved &&
      resolved.Modifier &&
      (resolved.Modifier.ModifierId || resolved.Modifier.ModifierID)) ||
    fallbackId;

  return rawId || "<Unknown Modifier>";
}

/**
 * Helper: derive a nice display label for the policy itself from an entry.
 * Uses:
 *   - entry.localizedName if present
 *   - else entry.nameTag (localized)
 *   - else entry.traditionType
 */
function getPolicyLabelFromEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  if (entry.localizedName) {
    return entry.localizedName;
  }

  if (entry.nameTag) {
    const tag = entry.nameTag;
    if (typeof Locale !== "undefined" && tag) {
      const text = Locale.compose(tag);
      if (text && text !== tag) {
        return text;
      }
    }
    return tag;
  }

  return entry.traditionType || null;
}

/**
 * Returns true if this resolved modifier’s subject requirement set
 * contains at least one requirement whose type is in ALLOWED_REQUIREMENT_TYPES.
 */
function modifierMatchesTownYieldFilter(resolved) {
  if (!resolved) return false;

  const subjectSet =
    resolved.SubjectRequirementSet ||
    resolved.subjectRequirementSet ||
    null;

  if (!subjectSet) return false;

  let reqs =
    subjectSet.Requirements ||
    subjectSet.requirements ||
    [];

  if (!Array.isArray(reqs)) return false;

  return reqs.some((r) => {
    if (!r) return false;
    const t = r.RequirementType || r.requirementType || "";
    return ALLOWED_REQUIREMENT_TYPES.has(t);
  });
}

/**
 * Returns an array of labels for all modifiers attached to *active* policies
 * that match our requirement-set filter.
 *
 * Label priority:
 *  1. Modifier Tooltip (localized)
 *  2. Policy localizedName / localized nameTag
 *  3. Modifier Id
 *
 * Duplicates are removed via Set.
 */
export function getActivePolicyModifierDisplayNames() {
  let data;
  try {
    data = getResolvedModifiersForActivePolicies();
  } catch (e) {
    console.error("[ETFI] getResolvedModifiersForActivePolicies failed:", e);
    return [];
  }

  if (!data || !Array.isArray(data.entries)) {
    return [];
  }

  const labelsSet = new Set();

  for (const entry of data.entries) {
    const policyLabel = getPolicyLabelFromEntry(entry);

    const modifierIds = entry.modifierIds || [];
    const resolvedModifiers = entry.modifiers || [];

    for (let i = 0; i < modifierIds.length; i++) {
      const id = modifierIds[i];
      const resolved = resolvedModifiers[i];

      // Only keep modifiers that match our requirement filter
      if (!modifierMatchesTownYieldFilter(resolved)) continue;

      const label = getLabelForResolvedModifier(resolved, id, policyLabel);
      if (label) {
        labelsSet.add(label);
      }
    }
  }

  return Array.from(labelsSet);
}

/**
 * Render helper: Bonus Yields section HTML
 * showing localized names of active policy modifiers (one per line).
 *
 * @param {string} yieldIconId
 * @returns {string} HTML fragment
 */
export function renderEtfiPolicyBonusYieldsHTML(yieldIconId) {
  const labelBonusYields =
    Locale.compose("LOC_MOD_ETFI_BONUS_YIELDS") || "Bonus Yields";

  let labels = [];
  try {
    labels = getActivePolicyModifierDisplayNames();
  } catch (e) {
    console.error("[ETFI] Failed to build active policy modifier labels:", e);
    labels = [];
  }

  const bodyHTML = labels.length
    ? labels
        .map(
          (name) => `
        <div class="flex items-center mt-1">
          <span>${name}</span>
        </div>
      `
        )
        .join("")
    : `<div class="mt-1 opacity-60" style="font-size: 0.8em;">None</div>`;

  return `
    <div class="mt-3 text-accent-2" style="font-size: 0.8em; line-height: 1.4;">
      <div class="flex justify-between mb-1">
        <span>${labelBonusYields}</span>
        <span></span>
      </div>
      <div class="mt-1 border-t border-white/10"></div>
      <div class="mt-1">
        ${bodyHTML}
      </div>
    </div>
  `;
}
