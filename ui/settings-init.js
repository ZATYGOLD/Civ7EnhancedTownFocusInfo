// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// Registers the mod's two options under Options -> Mods.

import { Options, OptionType, CategoryType } from "/core/ui/options/model-options.js";
import { CategoryData } from "/core/ui/options/options-helpers.js";
import { ETFI_Settings } from "../vendor/settings.js";

// Depend on the Options module so the stock options are loaded before ours.
import "/core/ui/options/screen-options.js";

CategoryType["Mods"] = "mods";
CategoryData[CategoryType["Mods"]] = {
  title: "LOC_UI_CONTENT_MGR_SUBTITLE",
  description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

// <fxs-switch> reads `optionInfo.currentValue` and reports changes as a plain
// boolean, so no index mapping or On/Off label strings are needed.
const onOptionColorfulInit = (optionInfo) => {
  optionInfo.currentValue = ETFI_Settings.IsColorful;
};

const onOptionColorfulUpdate = (optionInfo, value) => {
  ETFI_Settings.IsColorful = !!value;
};

const onOptionExpandDetailsInit = (optionInfo) => {
  optionInfo.currentValue = ETFI_Settings.ExpandDetailsByDefault;
};

const onOptionExpandDetailsUpdate = (optionInfo, value) => {
  ETFI_Settings.ExpandDetailsByDefault = !!value;
};

// Earlier versions monkey-patched Options.addInitCallback to "fix" Options
// initialization. As of game 1.5.0 that replacement is identical to the stock
// implementation, so it fixed nothing and only froze a core singleton's method
// at our copy for every other mod. Do not reinstate without re-checking stock.

// addInitCallback throws ("Options already initialized") if the options screen
// has already run its init pass. LoadOrder 1100 is comfortably before the first
// time that screen opens, so this does not fire today — but if a future patch
// moves options init earlier, an unguarded throw here would abort the rest of
// this module at load. Catching it costs nothing and degrades to "the mod's two
// options are missing from the Options screen" instead, with a reason in the log.
const registerEtfiOptions = () => {
  Options.addOption({
    category: CategoryType["Mods"],
    group: "etfi",
    type: OptionType.Switch,
    id: "etfi-yields-colorful",
    initListener: onOptionColorfulInit,
    updateListener: onOptionColorfulUpdate,
    label: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL",
    description: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL_DESC",
  });

  Options.addOption({
    category: CategoryType["Mods"],
    group: "etfi",
    type: OptionType.Switch,
    id: "etfi-expand-details-default",
    initListener: onOptionExpandDetailsInit,
    updateListener: onOptionExpandDetailsUpdate,
    label: "LOC_MOD_ETFI_EXPAND_DETAILS_DEFAULT",
    description: "LOC_MOD_ETFI_EXPAND_DETAILS_DEFAULT_DESC",
  });
};

try {
  Options.addInitCallback(registerEtfiOptions);
} catch (e) {
  console.error(
    "[ETFI] could not register the mod's Options entries; the rest of the mod is unaffected. " +
    "Options.addInitCallback rejected a late registration:",
    e,
  );
}
