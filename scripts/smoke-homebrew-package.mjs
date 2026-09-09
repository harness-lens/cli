// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const [formula, archiveDirectory, version] = process.argv.slice(2);
assert.ok(formula && archiveDirectory && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? ""),
  "usage: node scripts/smoke-homebrew-package.mjs FORMULA ARCHIVES VERSION");
assert.equal(process.platform, "darwin");
assert.ok(["arm64", "x64"].includes(process.arch));
const invoke = (program, args, env = process.env) => {
  const result = spawnSync(program, args, { encoding: "utf8", timeout: 180_000, env });
  assert.ifError(result.error);
  assert.equal(result.signal, null, `${program} terminated by signal`);
  assert.equal(result.status, 0, `${program} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
};
const { formulae: [metadata] } = JSON.parse(invoke("brew", ["info", "--json=v2", formula]));
const target = `${process.arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`;
const archiveName = `harness-lens-v${version}-${target}.tar.gz`;
assert.equal(metadata.versions.stable, version);
assert.equal(metadata.urls.stable.url,
  `https://github.com/harness-lens/cli/releases/download/v${version}/${archiveName}`);
assert.deepEqual(metadata.installed, [], "Qualification needs an uninstalled formula");
const archive = resolve(archiveDirectory, archiveName);
const sha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
assert.equal(sha256, metadata.urls.stable.checksum, "Candidate archive differs from the formula checksum");

// Keep the generated formula and its future production URL unchanged. Seed the
// documented source cache, then forbid falling back to a published version.
const cache = invoke("brew", ["--cache", "--build-from-source", formula]);
assert.ok(basename(cache).endsWith(archiveName), "Unexpected Homebrew source cache path");
await mkdir(dirname(cache), { recursive: true });
await copyFile(archive, cache);
const environment = {
  ...process.env,
  HOMEBREW_NO_AUTO_UPDATE: "1",
  HOMEBREW_NO_INSTALL_CLEANUP: "1",
  HOMEBREW_ARTIFACT_DOMAIN: "http://127.0.0.1:9",
  HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK: "1",
};
invoke("brew", ["fetch", "--build-from-source", formula], environment);
invoke("brew", ["install", "--build-from-source", formula], environment);
invoke("brew", ["test", formula], environment);
const prefix = invoke("brew", ["--prefix", formula]);
const result = invoke(process.execPath,
  ["scripts/smoke-native-package.mjs", join(prefix, "bin/harness-lens"), version]);
assert.equal(createHash("sha256").update(await readFile(archive)).digest("hex"), sha256);
console.log(JSON.stringify({
  formula, version, target, archiveSha256: sha256,
  installation: "passed", formulaTest: "passed", nativeSmoke: JSON.parse(result),
  productionUrlUnchanged: true, downloadFallback: false,
}));
