// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const [binaryPath, version, archivePath] = process.argv.slice(2);
assert.ok(binaryPath && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? ""),
  "usage: node scripts/smoke-native-package.mjs BINARY VERSION");
const binary = resolve(binaryPath);
const sha256 = createHash("sha256").update(await readFile(binary)).digest("hex");
const archiveSha256 = archivePath
  ? createHash("sha256").update(await readFile(archivePath)).digest("hex") : undefined;
const directory = await mkdtemp(join(tmpdir(), "harness-lens-native-consumer-"));
const invoke = (args) => {
  const result = spawnSync(binary, args, { cwd: directory, encoding: "utf8", timeout: 30_000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null, "Native CLI terminated by signal");
  return result;
};

try {
  const reportedVersion = invoke(["--version"]);
  assert.equal(reportedVersion.status, 0);
  assert.equal(reportedVersion.stdout.trim(), `harness-lens ${version}`);
  const help = invoke(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/u);
  const invalid = invoke(["--unknown-option"]);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /unknown option/u);
  const missingConfig = invoke(["--config"]);
  assert.equal(missingConfig.status, 2);
  assert.match(missingConfig.stderr, /requires a path/u);
  const instructions = "# Project\n\n## Testing\nRun npm test.\n\n## Safety\nNever expose secrets.\n";
  await writeFile(join(directory, "AGENTS.md"), instructions);
  const scan = () => {
    const result = invoke([directory, "--json"]);
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schema_version, 1);
    assert.equal(report.sources.length, 1);
    assert.equal(report.sources[0].path, "AGENTS.md");
    assert.equal(report.sources[0].bytes, Buffer.byteLength(instructions));
    assert.ok(report.metrics.length > 0);
    // Execution timing is measured telemetry, not deterministic scan output.
    const plugin_executions = report.plugin_executions.map(({ duration_micros, ...execution }) => {
      assert.ok(Number.isSafeInteger(duration_micros) && duration_micros >= 0);
      assert.equal(execution.status, "completed");
      return execution;
    });
    return { ...report, plugin_executions };
  };
  assert.ok(isDeepStrictEqual(scan(), scan()), "Native CLI changed deterministic reports between identical scans");
  assert.equal(createHash("sha256").update(await readFile(binary)).digest("hex"), sha256);
  if (archivePath) assert.equal(createHash("sha256").update(await readFile(archivePath)).digest("hex"), archiveSha256);
  console.log(JSON.stringify({
    version, sha256, archiveSha256, node: process.version, platform: process.platform, architecture: process.arch,
    help: "passed", invalidOption: "passed", missingConfig: "passed",
    functionalScans: 2, deterministicReportsEqual: true, binaryUnchanged: true,
    comparisonExcludes: ["plugin_executions[].duration_micros"],
  }));
} finally {
  await rm(directory, { recursive: true, force: true });
}
