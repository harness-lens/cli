// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

function packagePurl(pkg) {
  const source = pkg.source ?? "";
  const qualifiers = source.startsWith("git+")
    ? `?vcs_url=${encodeURIComponent(source.replace(/#[a-f0-9]+$/u, ""))}`
    : "";
  return `pkg:cargo/${encodeURIComponent(pkg.name)}@${encodeURIComponent(pkg.version)}${qualifiers}`;
}

function deterministicUuid(value) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function cargoMetadataToCycloneDx(metadata, target, serialNumber) {
  const root = metadata.packages.find((pkg) => pkg.name === "harness-lens-cli");
  if (!root) throw new Error("cargo metadata does not contain harness-lens-cli");

  const resolvedSerialNumber = serialNumber
    ?? deterministicUuid(
      JSON.stringify({
        target,
        packages: metadata.packages
          .map(({ name, version, source }) => ({ name, version, source }))
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      }),
    );

  const components = metadata.packages
    .filter((pkg) => pkg.name !== root.name)
    .map((pkg) => ({
      type: "library",
      "bom-ref": packagePurl(pkg),
      name: pkg.name,
      version: pkg.version,
      purl: packagePurl(pkg),
      licenses: pkg.license ? [{ expression: pkg.license }] : undefined,
      externalReferences: pkg.repository
        ? [{ type: "vcs", url: pkg.repository }]
        : undefined,
    }))
    .sort((left, right) => left["bom-ref"].localeCompare(right["bom-ref"]));

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${resolvedSerialNumber}`,
    version: 1,
    metadata: {
      component: {
        type: "application",
        "bom-ref": packagePurl(root),
        name: "harness-lens",
        version: root.version,
        purl: packagePurl(root),
        properties: [{ name: "harness-lens:target", value: target }],
      },
    },
    components,
  };
}

export async function generateCycloneDx(target, outputPath) {
  const metadata = JSON.parse(
    execFileSync("cargo", ["metadata", "--locked", "--format-version", "1"], {
      cwd: resolve("rust"),
      encoding: "utf8",
    }),
  );
  const bom = cargoMetadataToCycloneDx(metadata, target);
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), `${JSON.stringify(bom, null, 2)}\n`, "utf8");
}

async function main() {
  const [target, outputPath] = process.argv.slice(2);
  if (!target || !outputPath) {
    throw new Error("usage: node scripts/generate-cyclonedx.mjs TARGET OUTPUT_PATH");
  }
  await generateCycloneDx(target, outputPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
