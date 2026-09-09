// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { publishNpmCandidate } from "../scripts/publish-npm.mjs";
import { generateManifest, loadCandidate, REPOSITORY } from "../scripts/release-transaction.mjs";

const version = "0.0.5";
const tarball = Buffer.from("exact reviewed npm tarball");
const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
const metadata = { name: "@harness-lens/cli", version, dist: { integrity } };

async function fixture({ includeTarball = true } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "harness-lens-npm-release-"));
  const payload = Buffer.from("another release payload");
  await writeFile(join(directory, "payload.txt"), payload);
  if (includeTarball) await writeFile(join(directory, `harness-lens-cli-${version}.tgz`), tarball);
  const checksumLines = [
    `${createHash("sha256").update(payload).digest("hex")}  payload.txt`,
    ...(includeTarball ? [`${createHash("sha256").update(tarball).digest("hex")}  harness-lens-cli-${version}.tgz`] : []),
  ].sort();
  await writeFile(join(directory, "SHA256SUMS"), `${checksumLines.join("\n")}\n`);
  await generateManifest(directory, {
    repository: REPOSITORY,
    version,
    sourceSha: "a".repeat(40),
    workflowSha: "b".repeat(40),
    runId: "123",
    runAttempt: "1",
  });
  return loadCandidate(directory);
}

const response = (value) => value === null
  ? { status: 404, ok: false }
  : { status: 200, ok: true, json: async () => value };

test("publishes the exact reviewed tarball once and verifies registry integrity", async () => {
  const candidate = await fixture();
  const states = [null, metadata];
  const published = [];
  const result = await publishNpmCandidate(candidate, async () => response(states.shift()), (path) => published.push(path));
  assert.equal(result, metadata);
  assert.deepEqual(published, [join(candidate.directory, `harness-lens-cli-${version}.tgz`)]);
});

test("retry reuses an identical published npm version without another mutation", async () => {
  const candidate = await fixture();
  let publishes = 0;
  assert.equal(await publishNpmCandidate(candidate, async () => response(metadata), () => { publishes += 1; }), metadata);
  assert.equal(publishes, 0);
});

test("ambiguous npm publication reconciles the accepted tarball on rerun", async () => {
  const candidate = await fixture();
  let remote = null;
  await assert.rejects(publishNpmCandidate(candidate, async () => response(remote), () => {
    remote = metadata;
    throw new Error("connection lost after npm accepted package");
  }), /connection lost/u);
  let publishes = 0;
  await publishNpmCandidate(candidate, async () => response(remote), () => { publishes += 1; });
  assert.equal(publishes, 0);
});

test("npm publisher stops on missing tarballs, conflicting bytes, identity, or outages", async () => {
  await assert.rejects(publishNpmCandidate(await fixture({ includeTarball: false })), /tarball is missing/u);
  const candidate = await fixture();
  for (const remote of [
    { ...metadata, name: "other" },
    { ...metadata, version: "0.0.6" },
    { ...metadata, dist: { integrity: `sha512-${"x".repeat(32)}` } },
  ]) await assert.rejects(publishNpmCandidate(candidate, async () => response(remote)), /conflicting/u);
  await assert.rejects(
    publishNpmCandidate(candidate, async () => ({ status: 503, ok: false })),
    /HTTP 503/u,
  );
});
