// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { generateChecksums } from "../scripts/generate-checksums.mjs";
import { generateManifest, requiredReleaseAssetNames, verifyRequiredReleaseAssets } from "../scripts/release-transaction.mjs";

// Independent contract fixture: changing the producer cannot silently shrink it.
const names = [
  "RELEASE-MANIFEST.json",
  "SHA256SUMS",
  "harness-lens-cli-0.0.5.tgz",
  "harness-lens-homebrew-tap-v0.0.5.tar.gz",
  "harness-lens-scoop-v0.0.5.json",
  "harness-lens-v0.0.5-aarch64-apple-darwin.tar.gz",
  "harness-lens-v0.0.5-aarch64-apple-darwin.tar.gz.cdx.json",
  "harness-lens-v0.0.5-x86_64-apple-darwin.tar.gz",
  "harness-lens-v0.0.5-x86_64-apple-darwin.tar.gz.cdx.json",
  "harness-lens-v0.0.5-x86_64-pc-windows-msvc.zip",
  "harness-lens-v0.0.5-x86_64-pc-windows-msvc.zip.cdx.json",
  "harness-lens-v0.0.5-x86_64-unknown-linux-gnu.tar.gz",
  "harness-lens-v0.0.5-x86_64-unknown-linux-gnu.tar.gz.cdx.json",
  "harness-lens-winget-v0.0.5.zip",
  "harness-lens.0.0.5.nupkg",
];
const candidate = { manifest: { version: "0.0.5" }, assets: names.map((name) => ({ name, size: 1 })) };

test("release inventory requires all four native targets and distribution metadata", () => {
  assert.deepEqual(requiredReleaseAssetNames("0.0.5"), names);
  verifyRequiredReleaseAssets(candidate);
  verifyRequiredReleaseAssets({ ...candidate, assets: [...candidate.assets].reverse() });
});

test("every missing or empty required release asset is rejected", async (t) => {
  for (const asset of candidate.assets) {
    await t.test(`missing ${asset.name}`, () => {
      assert.throws(() => verifyRequiredReleaseAssets({
        ...candidate, assets: candidate.assets.filter((item) => item !== asset),
      }), /required asset inventory/u);
    });
    await t.test(`empty ${asset.name}`, () => {
      assert.throws(() => verifyRequiredReleaseAssets({
        ...candidate, assets: candidate.assets.map((item) => item === asset ? { ...item, size: 0 } : item),
      }), /must not be empty/u);
    });
  }
});

test("unexpected, duplicate, and wrong-version inventories are rejected", () => {
  for (const asset of [{ name: "unexpected.zip", size: 1 }, candidate.assets[0]]) {
    assert.throws(() => verifyRequiredReleaseAssets({ ...candidate, assets: [...candidate.assets, asset] }),
      /required asset inventory/u);
  }
  assert.throws(() => verifyRequiredReleaseAssets({ ...candidate, manifest: { version: "0.0.6" } }),
    /required asset inventory/u);
  assert.throws(() => requiredReleaseAssetNames("../0.0.5"), /Invalid/u);
});

test("publisher commands reject self-consistent incomplete candidates before network access", async (t) => {
  const identity = {
    repository: "harness-lens/cli", version: "0.0.5",
    sourceSha: "a".repeat(40), workflowSha: "b".repeat(40), runId: "123", runAttempt: "1",
  };
  for (const scenario of ["complete", "missing", "empty", "changed", "wrong-source", "wrong-workflow", "wrong-run", "wrong-attempt"]) {
    await t.test(scenario, async () => {
      const directory = await mkdtemp(join(tmpdir(), "harness-lens-inventory-"));
      t.after(() => rm(directory, { recursive: true, force: true }));
      const payloads = names.filter((name) => !["SHA256SUMS", "RELEASE-MANIFEST.json"].includes(name));
      for (const name of payloads) {
        if (scenario === "missing" && name === payloads[0]) continue;
        await writeFile(join(directory, name), scenario === "empty" && name === payloads[0] ? "" : `fixture ${name}`);
      }
      await generateChecksums(directory, join(directory, "SHA256SUMS"));
      await generateManifest(directory, identity);
      if (scenario === "changed") await writeFile(join(directory, payloads[0]), "changed bytes");
      const env = {
        ...process.env,
        GH_TOKEN: "test-token",
        GITHUB_REPOSITORY: identity.repository, RELEASE_VERSION: identity.version,
        RELEASE_SHA: scenario === "wrong-source" ? "c".repeat(40) : identity.sourceSha,
        GITHUB_WORKFLOW_SHA: scenario === "wrong-workflow" ? "c".repeat(40) : identity.workflowSha,
        GITHUB_RUN_ID: scenario === "wrong-run" ? "456" : identity.runId,
        RELEASE_RUN_ATTEMPT: scenario === "wrong-attempt" ? "2" : identity.runAttempt,
      };
      const commands = scenario === "complete" ? ["verify"]
        : ["missing", "empty"].includes(scenario) ? ["manifest", "verify", "prepare", "publish"]
          : ["verify", "prepare", "publish"];
      for (const command of commands) {
        const guard = "data:text/javascript," + encodeURIComponent('globalThis.fetch = () => { throw new Error("UNEXPECTED_NETWORK_ACCESS"); };');
        const result = spawnSync(process.execPath,
          ["--import", guard, fileURLToPath(new URL("../scripts/release-transaction.mjs", import.meta.url)), command, directory],
          { env, encoding: "utf8", timeout: 10_000 });
        assert.ifError(result.error);
        assert.equal(result.signal, null);
        assert.equal(result.status, scenario === "complete" ? 0 : 1, `${scenario}: ${command}: ${result.stderr}`);
        assert.doesNotMatch(result.stderr, /UNEXPECTED_NETWORK_ACCESS/u);
        if (scenario !== "complete") assert.match(result.stderr,
          /required asset inventory|must not be empty|do not match RELEASE-MANIFEST|identity differs/u);
      }
    });
  }
});
