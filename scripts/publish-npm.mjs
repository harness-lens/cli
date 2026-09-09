// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadCandidate } from "./release-transaction.mjs";

const PACKAGE_NAME = "@harness-lens/cli";
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function registryVersion(version, fetcher) {
  const response = await fetcher(`https://registry.npmjs.org/@harness-lens%2Fcli/${version}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  requireThat(response.ok, `npm registry returned HTTP ${response.status}; read current state before rerunning`);
  return response.json();
}

export async function publishNpmCandidate(candidate, fetcher = fetch, publish = (path) => {
  execFileSync("npm", ["publish", path, "--access", "public", "--provenance"], { stdio: "inherit" });
}) {
  const { version } = candidate.manifest;
  const name = `harness-lens-cli-${version}.tgz`;
  const asset = candidate.assets.find((item) => item.name === name);
  requireThat(asset, `Reviewed npm tarball is missing: ${name}`);
  const path = join(candidate.directory, name);
  const bytes = await readFile(path);
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

  const verify = (metadata) => {
    requireThat(metadata?.name === PACKAGE_NAME && metadata.version === version,
      `npm ${version} has conflicting package identity`);
    requireThat(metadata.dist?.integrity === integrity,
      `npm ${version} has conflicting tarball integrity`);
  };

  let metadata = await registryVersion(version, fetcher);
  if (metadata) {
    verify(metadata);
    return metadata;
  }
  // Never retry this mutation. If npm accepted the package but the command or
  // verification failed ambiguously, rerun this job to reconcile its integrity.
  publish(path);
  metadata = await registryVersion(version, fetcher);
  requireThat(metadata, `npm ${version} is not yet observable; rerun to reconcile without republishing`);
  verify(metadata);
  return metadata;
}

async function main() {
  const directory = process.argv[2] ?? "release";
  const candidate = await loadCandidate(directory);
  await publishNpmCandidate(candidate);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
