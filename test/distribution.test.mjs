// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateChecksums } from "../scripts/generate-checksums.mjs";
import { cargoMetadataToCycloneDx } from "../scripts/generate-cyclonedx.mjs";
import {
  parseChecksums,
  renderPackages,
} from "../scripts/generate-distribution-packages.mjs";

const version = "0.0.1";
const checksum = (character) => character.repeat(64);
const checksumFile = [
  `${checksum("a")}  harness-lens-v${version}-aarch64-apple-darwin.tar.gz`,
  `${checksum("b")}  harness-lens-v${version}-x86_64-apple-darwin.tar.gz`,
  `${checksum("c")}  harness-lens-v${version}-x86_64-pc-windows-msvc.zip`,
].join("\n");

test("distribution packages use immutable release URLs and exact checksums", () => {
  const files = renderPackages(version, checksumFile);

  assert.match(files["homebrew/Formula/harness-lens.rb"], /a{64}/u);
  assert.match(files["homebrew/Formula/harness-lens.rb"], /b{64}/u);
  assert.match(
    files["homebrew/Formula/harness-lens.rb"],
    /releases\/download\/v0\.0\.1\/harness-lens-v0\.0\.1-aarch64-apple-darwin\.tar\.gz/u,
  );

  const winget = files[
    "winget/manifests/h/HarnessLens/HarnessLens/0.0.1/HarnessLens.HarnessLens.installer.yaml"
  ];
  assert.match(winget, /InstallerType: zip/u);
  assert.match(winget, /InstallerSha256: "C{64}"/u);
  assert.match(winget, /ManifestVersion: 1\.12\.0/u);

  const scoop = JSON.parse(files["scoop/harness-lens.json"]);
  assert.equal(scoop.version, version);
  assert.equal(scoop.architecture["64bit"].hash, checksum("c"));

  assert.match(
    files["chocolatey/tools/chocolateyinstall.ps1"],
    /checksumType64 = 'sha256'/u,
  );
  assert.match(files["chocolatey/harness-lens.nuspec"], /<version>0\.0\.1<\/version>/u);
});

test("distribution generation rejects incomplete or malformed checksums", () => {
  assert.throws(() => parseChecksums("not-a-checksum"), /invalid SHA256SUMS/u);
  assert.throws(
    () => parseChecksums(`${checksumFile}\n${checksumFile.split("\n")[0]}`),
    /duplicate checksum/u,
  );
  assert.throws(() => renderPackages("01.2.3", checksumFile), /invalid semantic version/u);
  assert.throws(
    () => renderPackages(version, checksumFile.split("\n").slice(0, 2).join("\n")),
    /missing checksum/u,
  );
});

test("CycloneDX output identifies the binary target and locked packages", () => {
  const metadata = {
    packages: [
      {
        name: "harness-lens-cli",
        version,
        license: "MPL-2.0",
        repository: "https://github.com/harness-lens/cli",
      },
      { name: "serde", version: "1.0.0", license: "MIT OR Apache-2.0" },
    ],
  };
  const bom = cargoMetadataToCycloneDx(metadata, "x86_64-unknown-linux-gnu", "fixed-id");

  assert.equal(bom.serialNumber, "urn:uuid:fixed-id");
  assert.equal(bom.metadata.component.name, "harness-lens");
  assert.deepEqual(bom.metadata.component.properties, [
    { name: "harness-lens:target", value: "x86_64-unknown-linux-gnu" },
  ]);
  assert.equal(bom.components.length, 1);
  assert.deepEqual(
    cargoMetadataToCycloneDx(metadata, "x86_64-unknown-linux-gnu"),
    cargoMetadataToCycloneDx(metadata, "x86_64-unknown-linux-gnu"),
  );
});

test("checksum files are sorted and exclude their own output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-lens-checksums-"));
  await writeFile(join(directory, "z.txt"), "z", "utf8");
  await writeFile(join(directory, "a.txt"), "a", "utf8");
  const outputPath = join(directory, "SHA256SUMS");

  const lines = await generateChecksums(directory, outputPath);
  assert.deepEqual(
    lines.map((line) => line.slice(66)),
    ["a.txt", "z.txt"],
  );
  assert.equal((await readFile(outputPath, "utf8")).split("SHA256SUMS").length, 1);
});
