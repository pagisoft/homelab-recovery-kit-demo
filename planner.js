(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    else {
        root.RecoveryPlanner = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const priority = { critical: 0, important: 1, optional: 2 };

    function cleanText(value, maxLength = 500) {
        return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
    }

    function normalizeAsset(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return null;
        }

        const id = cleanText(value.id, 80);
        const name = cleanText(value.name, 100);
        if (!id || !name) {
            return null;
        }

        return {
            id,
            name,
            kind: cleanText(value.kind, 60),
            criticality: Object.hasOwn(priority, value.criticality) ? value.criticality : "important",
            dependsOn: Array.isArray(value.dependsOn)
                ? [...new Set(value.dependsOn.map(item => cleanText(item, 80)).filter(Boolean))]
                : [],
            backupLocation: cleanText(value.backupLocation),
            restoreNotes: cleanText(value.restoreNotes, 2000),
            verify: cleanText(value.verify, 500)
        };
    }

    function normalizeKit(raw) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.schema !== 1) {
            throw new Error("Unsupported kit file. Expected schema version 1.");
        }

        const assets = Array.isArray(raw.assets) ? raw.assets.map(normalizeAsset).filter(Boolean) : [];
        if (assets.length > 100) {
            throw new Error("This kit has too many components (maximum 100).");
        }

        const seen = new Set();
        for (const asset of assets) {
            if (seen.has(asset.id)) {
                throw new Error("The kit contains duplicate component IDs.");
            }
            seen.add(asset.id);
        }

        const access = raw.access && typeof raw.access === "object" && !Array.isArray(raw.access)
            ? raw.access
            : {};

        return {
            schema: 1,
            homeName: cleanText(raw.homeName, 100),
            owner: cleanText(raw.owner, 100),
            updated: cleanText(raw.updated, 30),
            access: {
                docsLocation: cleanText(access.docsLocation),
                recoveryKeysLocation: cleanText(access.recoveryKeysLocation),
                backupAccessLocation: cleanText(access.backupAccessLocation),
                contact: cleanText(access.contact)
            },
            assets
        };
    }

    function plan(kit) {
        const assets = kit.assets;
        const byId = new Map(assets.map(asset => [asset.id, asset]));
        const indegree = new Map(assets.map(asset => [asset.id, 0]));
        const outgoing = new Map(assets.map(asset => [asset.id, []]));
        const missing = [];
        const warnings = [];
        const score = asset => priority[asset.criticality] ?? 1;

        for (const asset of assets) {
            for (const dependencyId of asset.dependsOn) {
                if (!byId.has(dependencyId)) {
                    missing.push({ asset: asset.name, dependencyId });
                    continue;
                }
                indegree.set(asset.id, indegree.get(asset.id) + 1);
                outgoing.get(dependencyId).push(asset.id);
            }
            if (!asset.backupLocation) {
                warnings.push(asset.name + ": backup location is missing.");
            }
            if (!asset.restoreNotes) {
                warnings.push(asset.name + ": restore steps are missing.");
            }
            if (!asset.verify) {
                warnings.push(asset.name + ": verification step is missing.");
            }
        }

        const ready = assets.filter(asset => indegree.get(asset.id) === 0);
        const ordered = [];
        while (ready.length > 0) {
            ready.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
            const asset = ready.shift();
            ordered.push(asset);
            for (const nextId of outgoing.get(asset.id)) {
                indegree.set(nextId, indegree.get(nextId) - 1);
                if (indegree.get(nextId) === 0) {
                    ready.push(byId.get(nextId));
                }
            }
        }

        const cycles = assets.filter(asset => indegree.get(asset.id) > 0).map(asset => asset.name);
        if (!kit.access.recoveryKeysLocation) {
            warnings.unshift("Emergency key location is missing.");
        }
        if (!kit.access.backupAccessLocation) {
            warnings.unshift("Backup access instructions are missing.");
        }

        return { ordered, missing, cycles, warnings };
    }

    return { normalizeKit, plan };
});
