// File Path: ui/etfi-details/etfi-view-state.js
//
// Author: Zatygold
//
// Per-settlement "hide details" state, keyed by the currently selected city so
// each town/settlement remembers its own choice (not a single global toggle).
// Read by the panel section (header checkbox) and the focus hover tooltip, kept
// in its own module so neither needs to import the other.

const hidden = new Map();

// Stable key for the currently selected settlement (ComponentID owner + id).
function currentKey() {
  try {
    const cid = UI?.Player?.getHeadSelectedCity?.();
    if (!cid) return "";
    return `${cid.owner}:${cid.id}`;
  } catch {
    return "";
  }
}

export function getHideDetails() {
  return hidden.get(currentKey()) === true;
}

export function setHideDetails(value) {
  const key = currentKey();
  if (key) hidden.set(key, !!value);
}
