// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: ui/etfi-details/etfi-view-state.js
//
// Author: Zatygold
//
// Per-settlement "hide details" state, keyed by the currently selected city so
// each town/settlement remembers its own choice (not a single global toggle).
// Read by the panel section (header checkbox) and the focus hover tooltip, kept
// in its own module so neither needs to import the other.

import { ETFI_Settings } from "../../core/settings.js";

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
  const v = hidden.get(currentKey());
  // An explicit per-settlement toggle wins; otherwise fall back to the global
  // "Expand Details by Default" setting (off => start collapsed/hidden).
  if (v !== undefined) return v === true;
  let expandByDefault = true;
  try { expandByDefault = ETFI_Settings.ExpandDetailsByDefault; } catch {}
  return !expandByDefault;
}

export function setHideDetails(value) {
  const key = currentKey();
  if (key) hidden.set(key, !!value);
}
