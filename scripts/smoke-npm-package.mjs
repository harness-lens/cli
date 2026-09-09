// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const [tarball, version] = process.argv.slice(2);
assert.ok(tarball && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? ""),
  "usage: npm run package:smoke -- TARBALL VERSION");
assert.ok(process.env.npm_execpath, "Run through npm run package:smoke");
const archive = resolve(tarball);
const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
const directory = await mkdtemp(join(tmpdir(), "harness-lens-npm-consumer-"));
const npm = (args) => {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: directory, encoding: "utf8", timeout: 120_000,
    env: { ...process.env, NODE_PATH: "", NODE_ENV: "production" },
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, "npm process terminated by signal");
  return result;
};

try {
  await writeFile(join(directory, "package.json"), JSON.stringify({ name: "package-consumer", private: true }));
  const installation = npm(["install", "--omit=dev", "--no-audit", "--no-fund", archive]);
  assert.equal(installation.status, 0, "Candidate installation failed in an empty consumer directory");
  const installed = JSON.parse(await readFile(join(directory, "node_modules/@harness-lens/cli/package.json"), "utf8"));
  assert.equal(installed.name, "@harness-lens/cli");
  assert.equal(installed.version, version);
  assert.equal(installed.bin["harness-lens"], "./dist/bin.js");
  const core = JSON.parse(await readFile(join(directory, "node_modules/@harness-lens/core/package.json"), "utf8"));
  const invoke = (args) => npm(["exec", "--offline", "--", "harness-lens", ...args]);
  const help = invoke(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/u);
  const invalid = invoke(["unknown-command"]);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Unknown command/u);

  const fixture = join(directory, "fixture");
  await mkdir(fixture);
  const instructions = "# Project\n\n## Testing\nRun npm test.\n\n## Safety\nNever expose secrets.\n";
  await writeFile(join(fixture, "AGENTS.md"), instructions);
  const scan = () => {
    const result = invoke(["scan", fixture, "--json"]);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaVersion, "harness-lens/report/v1");
    assert.equal(report.files.length, 1);
    assert.equal(report.files[0].bytes, Buffer.byteLength(instructions));
    assert.equal(result.status, report.findings.some((finding) => finding.severity === "fail") ? 1 : 0);
    // This schema intentionally records wall-clock generation time.
    const { generatedAt, ...deterministic } = report;
    assert.ok(!Number.isNaN(Date.parse(generatedAt)));
    return deterministic;
  };
  assert.ok(isDeepStrictEqual(scan(), scan()), "Installed CLI changed deterministic findings between identical scans");
  assert.equal(createHash("sha256").update(await readFile(archive)).digest("hex"), digest);
  console.log(JSON.stringify({
    package: installed.name, version, sha256: digest, node: process.version,
    npm: npm(["--version"]).stdout.trim(), core: core.version,
    installation: "passed", help: "passed", invalidCommand: "passed",
    functionalScans: 2, deterministicReportsEqual: true, tarballUnchanged: true,
    comparisonExcludes: ["generatedAt"],
  }));
} finally {
  await rm(directory, { recursive: true, force: true });
}
