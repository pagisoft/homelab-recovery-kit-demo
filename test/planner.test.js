const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeKit, plan } = require("../planner");

const asset = (id, dependsOn = [], criticality = "important") => ({
    id, name: id, kind: "Other", criticality, dependsOn,
    backupLocation: "External drive", restoreNotes: "Restore to a safe test location", verify: "Open test file"
});

test("recovery order respects dependencies over urgency", () => {
    const kit = normalizeKit({
        schema: 1,
        access: { recoveryKeysLocation: "safe", backupAccessLocation: "paper guide" },
        assets: [asset("app", ["host"], "critical"), asset("host", ["router"]), asset("router", [], "optional")]
    });
    assert.deepEqual(plan(kit).ordered.map(item => item.id), ["router", "host", "app"]);
});

test("dependency loops block a false complete plan", () => {
    const kit = normalizeKit({
        schema: 1,
        assets: [asset("vault", ["dns"]), asset("dns", ["vault"])]
    });
    const result = plan(kit);
    assert.equal(result.ordered.length, 0);
    assert.deepEqual(result.cycles, ["vault", "dns"]);
});

test("missing dependencies and missing recovery details are reported", () => {
    const kit = normalizeKit({
        schema: 1,
        assets: [{ ...asset("photos", ["missing"]), backupLocation: "", verify: "" }]
    });
    const result = plan(kit);
    assert.equal(result.missing.length, 1);
    assert.match(result.warnings.join(" "), /backup location/);
    assert.match(result.warnings.join(" "), /verification step/);
});

test("import rejects malformed files and duplicate IDs", () => {
    assert.throws(() => normalizeKit({ schema: 2, assets: [] }), /Unsupported/);
    assert.throws(() => normalizeKit({ schema: 1, assets: [asset("a"), asset("a")] }), /duplicate/);
});

test("missing prerequisite blocks its downstream chain", () => {
    const result = plan(normalizeKit({ schema: 1, assets: [asset("host", ["missing"]), asset("app", ["host"]), asset("router")] }));
    assert.deepEqual(result.ordered.map(item => item.id), ["router"]);
    assert.deepEqual(result.cycles, ["host", "app"]);
});

test("invalid records and overlong text reject the whole import", () => {
    assert.throws(() => normalizeKit({ schema: 1, assets: [asset("ok"), null] }), /Invalid/);
    assert.throws(() => normalizeKit({ schema: 1, assets: [{ ...asset("ok"), restoreNotes: "x".repeat(2001) }] }), /maximum length/);
    assert.throws(() => normalizeKit({ schema: 1, assets: {} }), /array/);
});
