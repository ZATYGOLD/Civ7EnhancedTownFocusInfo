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