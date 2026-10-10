import { Options, OptionType, CategoryType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';
import { ETFI_Settings } from '../core/settings.js';

// We add a dependency on the Options module to ensure default options are loaded before we add our own
import '/core/ui/options/screen-options.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType["Mods"]] = {
    title: "LOC_UI_CONTENT_MGR_SUBTITLE",
    description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

// <fxs-switch> reads `optionInfo.currentValue` and reports changes as a plain
// boolean, so no index mapping or On/Off label strings are needed.
const onOptionColorfulInit = (optionInfo) => {
    optionInfo.currentValue = ETFI_Settings.IsColorful;
}

const onOptionColorfulUpdate = (optionInfo, value) => {
    ETFI_Settings.IsColorful = !!value;
}

const onOptionExpandDetailsInit = (optionInfo) => {
    optionInfo.currentValue = ETFI_Settings.ExpandDetailsByDefault;
}

const onOptionExpandDetailsUpdate = (optionInfo, value) => {
    ETFI_Settings.ExpandDetailsByDefault = !!value;
}

// Earlier versions monkey-patched Options.addInitCallback to "fix" Options
// initialization. As of game 1.5.0 that replacement is identical to the stock
// implementation, so it fixed nothing and only froze a core singleton's method
// at our copy for every other mod. Do not reinstate without re-checking stock.

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType["Mods"],
        group: 'etfi',
        type: OptionType.Switch,
        id: "etfi-yields-colorful",
        initListener: onOptionColorfulInit,
        updateListener: onOptionColorfulUpdate,
        label: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL",
        description: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL_DESC"
    });

    Options.addOption({
        category: CategoryType["Mods"],
        group: 'etfi',
        type: OptionType.Switch,
        id: "etfi-expand-details-default",
        initListener: onOptionExpandDetailsInit,
        updateListener: onOptionExpandDetailsUpdate,
        label: "LOC_MOD_ETFI_EXPAND_DETAILS_DEFAULT",
        description: "LOC_MOD_ETFI_EXPAND_DETAILS_DEFAULT_DESC"
    });
});