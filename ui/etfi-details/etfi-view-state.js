// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Per-settlement "hide details" state, keyed by the selected city so each
// settlement remembers its own choice. Its own module so the panel section and
// the focus hover tooltip need not import each other.

import { ETFI_Settings } from "../../core/settings.js";

const hidden = new Map();

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
  // An explicit per-settlement toggle wins over the global default setting.
  if (v !== undefined) return v === true;
  let expandByDefault = true;
  try { expandByDefault = ETFI_Settings.ExpandDetailsByDefault; } catch {}
  return !expandByDefault;
}

export function setHideDetails(value) {
  const key = currentKey();
  if (key) hidden.set(key, !!value);
}
