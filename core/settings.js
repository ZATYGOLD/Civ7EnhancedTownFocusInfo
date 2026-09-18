// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
// File Path: core/settings.js
//
// VENDORED, SHARED CODE — not original to this mod.
//
// ModSettingsManager is the community-standard settings shim used across several
// Civ VII mods (e.g. LF Policies-Yields Preview). It is kept close to its
// upstream form ON PURPOSE — including the 4-space indentation, which differs
// from the 2-space style used everywhere else here — so it stays diffable
// against the shared original. Only ETFI_Settings below is ours.
//
// Upstream rationale, preserved verbatim because the behaviour is surprising:
//
//   Please, always use ModSettingsManager to save and read settings in your mod.
//   Right now if you try to use **multiple** keys in localStorage, it will break
//   reading from localStorage for **every mod**. This is a workaround to avoid
//   this issue, while keeping a namespace to give each mod its own settings.
//
// That is why save() clears localStorage when it finds more than one top-level
// key: every mod is expected to funnel through the single "modSettings" key, and
// a stray second key breaks reads game-wide. The cost is that a mod which does
// NOT use this shim loses its stored data the first time any mod writes here.
// Do not "fix" this in isolation — it is a cross-mod contract.

const ModSettingsManager = {
    save(key, data) {
        if (localStorage.length > 1) {
            console.warn("[ModSettingsManager] erasing previous storage..", localStorage.length);
            localStorage.clear();
        }
        const modSettings = JSON.parse(localStorage.getItem("modSettings") || '{}');
        modSettings[key] = data;
        localStorage.setItem("modSettings", JSON.stringify(modSettings));
    },
    read(key) {
        const modSettings = localStorage.getItem("modSettings");
        try {
            if (modSettings) {
                const data = JSON.parse(modSettings || '{}')[key];
                if (data) {
                    return data;
                }
            }
            return null;
        }
        catch (e) {
            console.error(`[ModSettingsManager][${key}] Error loading settings`, e);
        }
        return null;
    }
}

export const ETFI_Settings = new class {
    _data = {
        IsColorful: true,
        // When true, each town's focus details start expanded; when false they
        // start collapsed. The in-panel checkbox still overrides per settlement.
        ExpandDetailsByDefault: true
    };

    constructor() {
        const modSettings = ModSettingsManager.read("ETFI_Settings");
        if (modSettings) {
            // Merge (not replace) so newly-added settings keep their defaults for
            // players whose saved data predates them.
            this._data = { ...this._data, ...modSettings };
        }
    }

    save() {
        ModSettingsManager.save("ETFI_Settings", this._data);
    }

    get IsColorful() {
        return this._data.IsColorful !== false;
    }

    set IsColorful(value) {
        this._data.IsColorful = value;
        this.save();
    }

    get ExpandDetailsByDefault() {
        return this._data.ExpandDetailsByDefault !== false;
    }

    set ExpandDetailsByDefault(value) {
        this._data.ExpandDetailsByDefault = !!value;
        this.save();
    }
}