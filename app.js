"use strict";

const emptyKit = () => ({
    schema: 1,
    homeName: "",
    owner: "",
    updated: "",
    access: { docsLocation: "", recoveryKeysLocation: "", backupAccessLocation: "", contact: "" },
    assets: []
});

let kit = emptyKit();
const $ = id => document.getElementById(id);
const fieldMap = {
    "home-name": ["homeName"],
    "owner": ["owner"],
    "docs-location": ["access", "docsLocation"],
    "keys-location": ["access", "recoveryKeysLocation"],
    "backup-access": ["access", "backupAccessLocation"],
    "contact": ["access", "contact"]
};

function make(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) {
        element.textContent = text;
    }
    if (className) {
        element.className = className;
    }
    return element;
}

function notify(message, error = false) {
    const notice = $("notice");
    notice.textContent = message;
    notice.classList.toggle("error", error);
    notice.hidden = false;
}

function clearNotice() {
    $("notice").hidden = true;
}

function getAssetForm() {
    return {
        id: $("asset-id").value || (globalThis.crypto && crypto.randomUUID
            ? crypto.randomUUID()
            : "asset-" + Date.now() + "-" + Math.random().toString(36).slice(2)),
        name: $("asset-name").value.trim(),
        kind: $("asset-kind").value,
        criticality: $("asset-criticality").value,
        dependsOn: [...$("dependencies").querySelectorAll("input:checked")].map(input => input.value),
        backupLocation: $("asset-backup").value.trim(),
        restoreNotes: $("asset-restore").value.trim(),
        verify: $("asset-verify").value.trim()
    };
}

function resetAssetForm() {
    $("asset-form").reset();
    $("asset-id").value = "";
    $("asset-save").textContent = "Add component";
    $("asset-cancel").hidden = true;
    renderDependencies();
}

function renderDependencies(selected = []) {
    const area = $("dependencies");
    area.replaceChildren();
    const currentId = $("asset-id").value;
    const options = kit.assets.filter(asset => asset.id !== currentId);
    if (options.length === 0) {
        area.append(make("span", "Add another component to create a dependency.", "muted"));
        return;
    }
    for (const asset of options) {
        const label = make("label");
        const input = make("input");
        input.type = "checkbox";
        input.value = asset.id;
        input.checked = selected.includes(asset.id);
        label.append(input, document.createTextNode(asset.name));
        area.append(label);
    }
}

function editAsset(id) {
    const asset = kit.assets.find(item => item.id === id);
    if (!asset) {
        return;
    }
    $("asset-id").value = asset.id;
    $("asset-name").value = asset.name;
    $("asset-kind").value = asset.kind || "Other";
    $("asset-criticality").value = asset.criticality;
    $("asset-backup").value = asset.backupLocation;
    $("asset-restore").value = asset.restoreNotes;
    $("asset-verify").value = asset.verify;
    $("asset-save").textContent = "Save changes";
    $("asset-cancel").hidden = false;
    renderDependencies(asset.dependsOn);
    $("asset-form").scrollIntoView({ behavior: "smooth", block: "start" });
    $("asset-name").focus();
}

function removeAsset(id) {
    const asset = kit.assets.find(item => item.id === id);
    if (!asset || !confirm('Remove "' + asset.name + '" from this kit?')) {
        return;
    }
    kit.assets = kit.assets.filter(item => item.id !== id).map(item => ({
        ...item,
        dependsOn: item.dependsOn.filter(dependency => dependency !== id)
    }));
    if ($("asset-id").value === id) {
        resetAssetForm();
    }
    renderAll();
}

function renderAssets() {
    const area = $("asset-list");
    area.replaceChildren();
    if (kit.assets.length === 0) {
        area.append(make("p", "No components added yet. Start with your router, storage or backup system.", "muted"));
        return;
    }
    for (const asset of kit.assets) {
        const card = make("article", undefined, "asset-card");
        const head = make("div", undefined, "asset-card-head");
        const title = make("h3", asset.name);
        const actions = make("div", undefined, "actions");
        const edit = make("button", "Edit", "quiet");
        edit.type = "button";
        edit.addEventListener("click", () => editAsset(asset.id));
        const remove = make("button", "Remove", "quiet");
        remove.type = "button";
        remove.addEventListener("click", () => removeAsset(asset.id));
        actions.append(edit, remove);
        head.append(title, actions);
        const deps = asset.dependsOn.map(id => kit.assets.find(item => item.id === id)?.name || "Missing component");
        card.append(head, make("p", asset.kind + " · " + asset.criticality +
            (deps.length ? " · after " + deps.join(", ") : " · no dependencies")));
        area.append(card);
    }
}

function addWarning(area, message, critical = false) {
    area.append(make("div", message, critical ? "warning critical" : "warning"));
}

function renderPlan() {
    const result = RecoveryPlanner.plan(kit);
    const total = kit.assets.length;
    $("plan-summary").textContent = total
        ? result.ordered.length + " of " + total + " components have an ordered recovery step."
        : "Add components to build a recovery plan.";
    const warnings = $("plan-warnings");
    warnings.replaceChildren();
    for (const missing of result.missing) {
        addWarning(warnings, missing.asset + " refers to a component that is no longer in this kit.", true);
    }
    if (result.cycles.length) {
        addWarning(warnings, "Dependency loop or blocked chain involving: " + result.cycles.join(", ") + ". Review dependencies before relying on this order.", true);
    }
    if (!kit.access.docsLocation) {
        addWarning(warnings, "Offline binder location is missing.");
    }
    for (const warning of result.warnings) {
        addWarning(warnings, warning);
    }

    const steps = $("plan-steps");
    steps.replaceChildren();
    for (const asset of result.ordered) {
        const li = make("li");
        li.append(make("h3", asset.name + " · " + asset.kind));
        const dependencies = asset.dependsOn
            .map(id => kit.assets.find(item => item.id === id)?.name)
            .filter(Boolean);
        if (dependencies.length) {
            li.append(make("p", "After: " + dependencies.join(", "), "meta"));
        }
        li.append(make("p", "Backup/source: " + (asset.backupLocation || "NOT RECORDED")));
        li.append(make("p", "Restore: " + (asset.restoreNotes || "NOT RECORDED")));
        li.append(make("p", "Verify: " + (asset.verify || "NOT RECORDED")));
        steps.append(li);
    }
}

function renderHandoff() {
    $("handoff-docs").textContent = kit.access.docsLocation || "not recorded";
    $("handoff-backups").textContent = kit.access.backupAccessLocation || "not recorded";
    $("handoff-keys").textContent = kit.access.recoveryKeysLocation || "not recorded";
    $("handoff-contact").textContent = kit.access.contact || "not recorded";
}

function renderAll() {
    renderAssets();
    renderDependencies();
    renderPlan();
    renderHandoff();
}

function fillFields() {
    for (const [id, path] of Object.entries(fieldMap)) {
        $(id).value = path.length === 1 ? kit[path[0]] : kit[path[0]][path[1]];
    }
}

function download() {
    kit.updated = new Date().toISOString();
    const blob = new Blob([JSON.stringify(kit, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = make("a");
    link.href = url;
    link.download = "homelab-recovery-kit.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Kit downloaded. Store a copy outside the homelab and rehearse a restore.");
}

async function importFile(file) {
    if (!file) {
        return;
    }
    if (file.size > 1024 * 1024) {
        notify("The file is too large (maximum 1 MB).", true);
        return;
    }
    try {
        const imported = RecoveryPlanner.normalizeKit(JSON.parse(await file.text()));
        kit = imported;
        fillFields();
        resetAssetForm();
        renderAll();
        notify("Kit imported. Review the recovery order and warnings.");
    }
    catch (error) {
        notify("Could not import kit: " + error.message, true);
    }
}

function loadExample() {
    if ((kit.assets.length || kit.homeName) && !confirm("Replace the current unsaved kit with the example?")) {
        return;
    }
    kit = RecoveryPlanner.normalizeKit({
        schema: 1,
        homeName: "Example family homelab",
        owner: "Alex",
        access: {
            docsLocation: "Encrypted USB in the home safe",
            recoveryKeysLocation: "Sealed recovery sheet in the home safe",
            backupAccessLocation: "External backup drive in the safe; cloud account recovery instructions on paper",
            contact: "Trusted technical friend — number on the paper contact sheet"
        },
        assets: [
            { id: "router", name: "Router and local network", kind: "Network", criticality: "critical", dependsOn: [], backupLocation: "Router configuration export on encrypted USB", restoreNotes: "Restore known-good configuration to replacement router; confirm LAN and internet.", verify: "Connect laptop by cable and open a public website." },
            { id: "nas", name: "Backup NAS", kind: "Storage", criticality: "critical", dependsOn: ["router"], backupLocation: "NAS disks plus offsite encrypted copy", restoreNotes: "Follow NAS vendor recovery guide; mount backup share read-only first.", verify: "Open a known backup archive and list its contents." },
            { id: "pve", name: "Proxmox host", kind: "Hypervisor", criticality: "critical", dependsOn: ["router", "nas"], backupLocation: "Proxmox Backup Server datastore on NAS", restoreNotes: "Install Proxmox on replacement host, attach the backup datastore and restore the Docker VM to an isolated network.", verify: "Boot restored VM and verify its virtual disk is present." },
            { id: "vault", name: "Password vault", kind: "Identity / secrets", criticality: "critical", dependsOn: ["pve"], backupLocation: "Encrypted vault export on external drive", restoreNotes: "Use offline recovery sheet to access the export; restore vault before other apps.", verify: "Sign in with a test account and read a test record." },
            { id: "photos", name: "Photo library", kind: "Application", criticality: "important", dependsOn: ["pve", "vault"], backupLocation: "Offsite photo archive and database backup", restoreNotes: "Restore database and files to an isolated test instance, then reconnect storage.", verify: "Open several older and recent photos." }
        ]
    });
    fillFields();
    resetAssetForm();
    renderAll();
    notify("Example loaded. It is illustrative; run real restore tests for your own setup.");
}

for (const [id, path] of Object.entries(fieldMap)) {
    $(id).addEventListener("input", event => {
        if (path.length === 1) {
            kit[path[0]] = event.target.value;
        }
        else {
            kit[path[0]][path[1]] = event.target.value;
        }
        clearNotice();
        renderPlan();
        renderHandoff();
    });
}

$("asset-form").addEventListener("submit", event => {
    event.preventDefault();
    const asset = getAssetForm();
    if (!asset.name) {
        notify("Enter a component name.", true);
        return;
    }
    const existing = kit.assets.findIndex(item => item.id === asset.id);
    if (existing === -1) {
        kit.assets.push(asset);
    }
    else {
        kit.assets[existing] = asset;
    }
    resetAssetForm();
    renderAll();
    clearNotice();
});
$("asset-cancel").addEventListener("click", resetAssetForm);
$("download").addEventListener("click", download);
$("import-file").addEventListener("change", event => {
    importFile(event.target.files[0]);
    event.target.value = "";
});
$("print").addEventListener("click", () => window.print());
$("demo").addEventListener("click", loadExample);

renderAll();
