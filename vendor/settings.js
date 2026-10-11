// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Zatygold
//
// VENDORED, SHARED CODE — not original to this mod. ModSettingsManager is the
// community settings shim several Civ VII mods use (e.g. LF Policies-Yields
// Preview), kept close to upstream ON PURPOSE — including its 4-space indent —
// so it stays diffable against the original. Only ETFI_Settings below is ours.
//
// Upstream rationale, kept verbatim because the behaviour is surprising:
//
//   Please, always use ModSettingsManager to save and read settings in your mod.
//   Right now if you try to use **multiple** keys in localStorage, it will break
//   reading from localStorage for **every mod**. This is a workaround to avoid
//   this issue, while keeping a namespace to give each mod its own settings.
//
// Hence save() clearing localStorage when it finds a second top-level key: every
// mod funnels through "modSettings", and a stray key breaks reads game-wide. The
// cost is that a mod NOT using this shim loses its data the first time any mod
// writes here. Do not "fix" this in isolation — it is a cross-mod contract.

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