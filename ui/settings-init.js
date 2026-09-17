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

// Shared On/Off choices for our boolean dropdowns. Index 0 = On, 1 = Off.
const ON_OFF_ITEMS = [
    { label: "LOC_MOD_ETFI_TOGGLE_ON" },
    { label: "LOC_MOD_ETFI_TOGGLE_OFF" },
];

const onOptionColorfulInit = (optionInfo) => {
    optionInfo.selectedItemIndex = ETFI_Settings.IsColorful ? 0 : 1;
}

const onOptionColorfulUpdate = (optionInfo, value) => {
    // `value` is the selected dropdown index; 0 = On (colorful), 1 = Off.
    ETFI_Settings.IsColorful = value === 0;
}

const onOptionExpandDetailsInit = (optionInfo) => {
    optionInfo.selectedItemIndex = ETFI_Settings.ExpandDetailsByDefault ? 0 : 1;
}

const onOptionExpandDetailsUpdate = (optionInfo, value) => {
    // 0 = On (start expanded), 1 = Off (start collapsed).
    ETFI_Settings.ExpandDetailsByDefault = value === 0;
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
        type: OptionType.Dropdown,
        id: "etfi-yields-colorful",
        initListener: onOptionColorfulInit,
        updateListener: onOptionColorfulUpdate,
        label: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL",
        description: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL_DESC",
        dropdownItems: ON_OFF_ITEMS
    });

    Options.addOption({
        category: CategoryType["Mods"],
        group: 'etfi',
        type: OptionType.Dropdown,
        id: "etfi-expand-details-default",
        initListener: onOptionExpandDetailsInit,
        updateListener: onOptionExpandDetailsUpdate,
        label: "LOC_MOD_ETFI_EXPAND_DETAILS_DEFAULT",
        description: "LOC_MOD_ETFI_EXPAND_DETAILS_DEFAULT_DESC",
        dropdownItems: ON_OFF_ITEMS
    });
});