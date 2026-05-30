# Enhanced Town Focus Info

A mod for Civilization VII that enhances the display of town focus yield bonuses, showing detailed breakdowns of improvements, buildings, and trade routes that contribute to specialization bonuses.

## Version 2.4.0

### What's New

- **Resort Town accuracy:** Natural Wonder tiles are now listed in their own category with the correct +50% bonus, grouped per wonder with a tile count, reading the live (effective) tile yields so the numbers match the game whether or not the Resort focus is already active. Improved appealing tiles — including **Districts** — correctly receive the +1 Happiness / +1 Gold, and Districts now appear first in the Improved category with a hover list of their building(s).
- **Auto-refresh on focus change:** committing a Town Focus now updates the panel's yield previews and the city yield bar in place — no need to close and reopen the panel.
- **Bulleted hover tooltips:** all hover panels (connected settlements, the Breathtaking breakdown, and the new Districts list) now use bullet points; two buildings sharing a tile (a Quarter) are shown together with a `|` divider.
- **Display polish:** yield values round to the nearest 0.5, the "View Hidden" checkbox sits more comfortably in the header, and several yield/count display fixes.

### Maintenance

- Reset the legacy tooltip files to clean scaffolds for future work (renamed the old `etfi.js` to `town-focus-tooltip.js`) and removed dead code.

## Version 2.3.0

### What's New

- Town focus details now render **inline** in the focus chooser list (no longer a hover tooltip), so every focus' breakdown is visible at a glance with yield pills next to each focus name.
- New **View Hidden** toggle at the top of the Town Focus panel. "Unimproved" and other supplementary categories are hidden by default and revealed when checked.
- **Hub Town** now lists both **Connected** and **Disconnected** settlements (Disconnected is hidden by default), each split into Cities and Towns with hover-to-reveal names.
- **Urban Center** and **Religious Site** now share consistent categories: **Quarters**, **Unique Quarters**, **Special Quarters**, and **Buildings** (lone), each in its own panel.
- **Religious Site** lists every qualifying building (matching Urban Center's eligibility rules), counts **all** temple types — including unique civilization temples — for Relic Slots, and includes Palace / City Hall (ageless buildings).
- **Resort Town** Tourism category is correctly limited to the Modern Age, with a hover breakdown of Breathtaking Improvements vs. Districts.
- Tighter, narrower yield pills for a cleaner read.

### Maintenance

- Significant code cleanup: removed dead code, unified shared rendering helpers, and standardized how every town focus builds its display.

### Languages

- Refreshed and re-synced all supported language strings to match the current UI:
  English, French, Italian, Japanese, Korean, Polish, Russian, Simplified Chinese, Traditional Chinese.

## Version 2.2.2

## What's New

- Fixed UI
- Added Modern Age Tourism to the Resort Town details
- Added Factory Town
- Added Relic slots to Religious Site details

## Version 2.2.0

## What's New

- Updated all town focuses for Game Patch 1.4.0
- This is just a hot fix for compatiblity and more changes and proper cleanup will be coming 

## Version 2.1.1

### What's New

- Updated Fort town and Religious Site to show the number of walls
- Fort Town now displays the total "Health" gained per Age relevant wall
- Fixed Religious Site bug where the walls were not be calculated into the total happiness
- Improved readbility for Resort Town, Urban Town, Religious Site, and Fort Town
- Added helpers

### Features

- N/A

### Languages

- N/A

## Version 2.1.0

### What's New

- Updated resort town and urban town
- Improved code organization and folder structure

### Features

- Updated color yield preview and added a setting to turn on/off
- Trade Town now has +5 trade range yield
- Added Fort Town yield preview

### Languages

- Updated text for all currently supported languages

## Version 2.0.1

### What's New

- Improved language support and maintenance

### Features

- Show empty details when appropriate

### Languages

- French (New)
- Tradtional Chinese (New)

## Version 2.0.0

### What's New

- Complete rewrite to fix any potential mod conflicts
- More icons are used and overall more visually appealing
- Updated language support
- New logo image and screenshots

### Features

- Urban Town Center details
- Tooltip improvements are calculated as warehouse bonuses and displayed as their improvement name

### Languages

- English
- Japanese
- Italian
- Russian
- Polish
- Simplified Chinese
- Korean

## Version 1.2.4

### What's New

- Fixed some language localization bugs
  
## Version 1.2.3

### What's New

- Resort Town details
- Hub Town calculation changes (+1 from +2)
- Mining Town multiplier changes (+2/+3/+4 from +1/+2/+3)
- Religious Site details

### Features

- Tooltip improvements allowing Unique improvements warehouse bonus

## Version 1.1.10

### What's New

- Improved resource icon sizing and spacing in tooltips
- Better scaling for 4K/high-resolution displays
- Updated documentation
- Minor visual improvements

### Features

- Detailed breakdown of specialization bonuses
- Support for multiple languages (English, Japanese, Italian, Russian, Polish, Simplified Chinese, Korean)
- Visual improvements and detailed tooltips
- Era bonus multiplier display
- Resource and happiness calculations
- Trade route connection details

### Languages

- English
- Japanese
- Italian
- Russian
- Polish
- Simplified Chinese
- Korean (New!)

## Overview

Enhanced Town Focus Info is a quality-of-life mod for Civilization VII that provides detailed breakdowns of yield bonuses when selecting town specializations. This mod enhances the tooltip display to show exactly how many buildings, improvements, and trade routes contribute to each specialization's bonuses.

## Compatibility

- Works with Civilization VII base game
- Compatible with most other UI mods
- Does not affect save games

## Contributing

Feel free to contribute to this project by:

- Reporting bugs
- Suggesting improvements
- Submitting pull requests
- Helping with translations (see Localization section below)

## Localization

The mod supports multiple languages! All text strings are stored in localization files under the `modules/text` directory.

To contribute a new translation:

1. Create a new directory under `modules/text` with your language code (e.g., `fr_FR` for French)
2. Copy `ModuleText.xml` from the `en_us` directory to your new language directory
3. Translate the strings in your new file
4. Add the SQL translations to `ETFI_Text.sql`
5. Update the modinfo file to include your new language file
6. Submit a pull request or send the files to the mod maintainers

Current language support:

- English (en_US)
- French (fr_FR)
- Italian (it_IT)
- Japanese (ja_JP)
- Korean (ko_KR)
- Polish (pl_PL)
- Russian (ru_RU)
- Simplified Chinese (zh_Hans_CN)
- Traditional Chinese (zh_Hant_HK)

## Credits

- Original mod concept by Yamada and Mallek
- Enhanced and maintained by Zatygold
- Thanks to the Civilization VII modding community

## License

This project is licensed under the MIT License - see the LICENSE file for details
