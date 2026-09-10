// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

assert.ok(process.env.npm_execpath, "Run through npm run launcher:pack");
const source = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(source.name, "@harness-lens/cli");
assert.match(source.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u);
const output = resolve(process.argv[2] ?? "launcher-package");
const staging = await mkdtemp(join(tmpdir(), "harness-lens-launcher-pack-"));
try {
  const manifest = {
    name: "harness-lens",
    version: source.version,
    description: "Command-line launcher for deterministic Harness Lens analysis.",
    type: "module",
    bin: { "harness-lens": "./bin.js" },
    files: ["bin.js", "README.md", "LICENSE", "COPYRIGHT"],
    dependencies: { [source.name]: source.version },
    engines: source.engines,
    publishConfig: source.publishConfig,
    repository: source.repository,
    homepage: source.homepage,
    bugs: source.bugs,
    keywords: source.keywords,
    author: source.author,
    license: source.license,
  };
  await writeFile(join(staging, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const name of ["bin.js", "README.md"]) {
    await copyFile(new URL(`../packaging/npm-launcher/${name}`, import.meta.url), join(staging, name));
  }
  for (const name of ["LICENSE", "COPYRIGHT"]) {
    await copyFile(new URL(`../${name}`, import.meta.url), join(staging, name));
  }
  await mkdir(output, { recursive: true });
  const result = spawnSync(process.execPath, [process.env.npm_execpath, "pack", "--ignore-scripts", "--pack-destination", output], {
    cwd: staging, stdio: "inherit", timeout: 120_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, "Launcher packaging failed");
} finally {
  await rm(staging, { recursive: true, force: true });
}
