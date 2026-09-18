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

// Both options are simple booleans rendered as toggle switches (OptionType.Switch
// -> <fxs-switch>). The switch reads its state from `optionInfo.currentValue` and
// reports changes as a boolean in the change event, so the listeners just read
// and write the setting directly — no index mapping, and no On/Off label strings.
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

// NOTE: earlier versions monkey-patched Options.addInitCallback here to "fix
// Options initialization". As of game 1.5.0 that replacement is byte-identical
// to the stock implementation in /core/ui/options/model-options.js, so it fixed
// nothing and merely froze a core singleton's method at our copy of it for every
// other mod in the session. Removed deliberately — do not reinstate without
// checking the current stock implementation first.

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