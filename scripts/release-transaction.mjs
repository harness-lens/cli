// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MANIFEST_NAME = "RELEASE-MANIFEST.json";
export const REPOSITORY = "harness-lens/cli";

const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const shaPattern = /^[a-f0-9]{40}$/;
const positiveIntegerPattern = /^[1-9]\d*$/;
const assetNamePattern = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const compareNames = (left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0;

export function releaseIdentity(values) {
  const identity = {
    repository: values.repository,
    version: values.version,
    tag: values.tag ?? `v${values.version}`,
    sourceSha: values.sourceSha,
    workflowSha: values.workflowSha,
    runId: String(values.runId),
    runAttempt: String(values.runAttempt),
  };
  requireThat(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(identity.repository), "Invalid release repository");
  requireThat(semverPattern.test(identity.version), "Invalid release version");
  requireThat(identity.tag === `v${identity.version}`, "Release tag must be the canonical v-prefixed version");
  requireThat(shaPattern.test(identity.sourceSha), "Invalid source SHA");
  requireThat(shaPattern.test(identity.workflowSha), "Invalid workflow SHA");
  requireThat(positiveIntegerPattern.test(identity.runId), "Invalid workflow run ID");
  requireThat(positiveIntegerPattern.test(identity.runAttempt), "Invalid workflow run attempt");
  return identity;
}

function validateAsset(asset) {
  requireThat(asset && typeof asset === "object", "Invalid manifest asset");
  requireThat(assetNamePattern.test(asset.name) && asset.name !== MANIFEST_NAME, `Invalid asset name: ${asset.name}`);
  requireThat(Number.isSafeInteger(asset.size) && asset.size >= 0, `Invalid asset size: ${asset.name}`);
  requireThat(/^[a-f0-9]{64}$/.test(asset.sha256), `Invalid asset SHA-256: ${asset.name}`);
  return { name: asset.name, size: asset.size, sha256: asset.sha256 };
}

export function validateManifest(value) {
  requireThat(value && typeof value === "object" && value.schemaVersion === 1, "Unsupported release manifest schema");
  const identity = releaseIdentity(value);
  requireThat(Array.isArray(value.assets) && value.assets.length > 0, "Release manifest has no assets");
  const assets = value.assets.map(validateAsset);
  const names = assets.map((asset) => asset.name);
  requireThat(new Set(names).size === names.length, "Release manifest contains duplicate assets");
  requireThat(names.every((name, index) => index === 0 || names[index - 1] < name),
    "Release manifest assets must be sorted");
  requireThat(names.includes("SHA256SUMS"), "Release manifest must include SHA256SUMS");
  return { schemaVersion: 1, ...identity, assets };
}

async function directoryAssets(directory, excluded = new Set()) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !excluded.has(entry.name))
    .sort(compareNames);
  requireThat(entries.length > 0, `No release assets found in ${directory}`);
  const assets = [];
  for (const entry of entries) {
    requireThat(entry.isFile() && !entry.isSymbolicLink(), `Release candidate must contain only regular files: ${entry.name}`);
    requireThat(assetNamePattern.test(entry.name), `Unsafe release asset name: ${entry.name}`);
    const path = join(directory, entry.name);
    const metadata = await stat(path);
    assets.push({ name: entry.name, size: metadata.size, sha256: await sha256File(path) });
  }
  return assets;
}

export async function generateManifest(directory, identityValues) {
  const absolute = resolve(directory);
  const identity = releaseIdentity(identityValues);
  const assets = await directoryAssets(absolute, new Set([MANIFEST_NAME]));
  const manifest = validateManifest({ schemaVersion: 1, ...identity, assets });
  await writeFile(join(absolute, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function loadCandidate(directory) {
  const absolute = resolve(directory);
  const manifestBytes = await readFile(join(absolute, MANIFEST_NAME));
  const manifest = validateManifest(JSON.parse(manifestBytes.toString("utf8")));
  const actual = await directoryAssets(absolute, new Set([MANIFEST_NAME]));
  requireThat(JSON.stringify(actual) === JSON.stringify(manifest.assets),
    "Release candidate files do not match RELEASE-MANIFEST.json");
  const checksums = new Map();
  for (const line of (await readFile(join(absolute, "SHA256SUMS"), "utf8")).split(/\r?\n/u)) {
    if (line === "") continue;
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9._+-]*)$/.exec(line);
    requireThat(match && match[2] !== "SHA256SUMS" && match[2] !== MANIFEST_NAME,
      `Invalid SHA256SUMS entry: ${line}`);
    requireThat(!checksums.has(match[2]), `Duplicate SHA256SUMS entry: ${match[2]}`);
    checksums.set(match[2], match[1]);
  }
  const payloads = manifest.assets.filter((asset) => asset.name !== "SHA256SUMS");
  requireThat(checksums.size === payloads.length && payloads.every((asset) => checksums.get(asset.name) === asset.sha256),
    "SHA256SUMS does not exactly cover the release payloads");
  const manifestAsset = {
    name: MANIFEST_NAME,
    size: manifestBytes.length,
    sha256: sha256(manifestBytes),
  };
  return {
    directory: absolute,
    manifest,
    manifestSha256: manifestAsset.sha256,
    assets: [...actual, manifestAsset].sort(compareNames),
  };
}

// Mutations are deliberately never retried. After an ambiguous response, rerun
// the protected job; the state machine below reads and reconciles remote state.
export function github(token, fetcher = fetch) {
  requireThat(token, "GH_TOKEN is required");
  return async (path, { method = "GET", body, optional = false } = {}) => {
    const response = await fetcher(`https://api.github.com/repos/${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (optional && response.status === 404) return null;
    requireThat(response.ok, `GitHub ${method} ${path}: HTTP ${response.status}; read current state before rerunning`);
    return response.json();
  };
}

export function githubUploader(token, repository, fetcher = fetch) {
  requireThat(token, "GH_TOKEN is required");
  requireThat(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), "Invalid release repository");
  return async (releaseId, asset) => {
    const bytes = await readFile(asset.path);
    requireThat(bytes.length === asset.size && sha256(bytes) === asset.sha256,
      `Asset changed before upload: ${asset.name}`);
    const response = await fetcher(
      `https://uploads.github.com/repos/${repository}/releases/${releaseId}/assets?name=${encodeURIComponent(asset.name)}`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.length),
        },
        body: bytes,
        signal: AbortSignal.timeout(120_000),
      },
    );
    requireThat(response.ok, `GitHub asset upload ${asset.name}: HTTP ${response.status}; read current state before rerunning`);
    return response.json();
  };
}

async function findRelease(api, repository, tag) {
  const releases = await api(`${repository}/releases?per_page=100`);
  const matches = releases.filter((release) => release.tag_name === tag);
  requireThat(matches.length <= 1, `Multiple releases found for ${tag}`);
  return matches[0] ?? null;
}

async function tagRef(api, repository, tag) {
  return api(`${repository}/git/ref/tags/${encodeURIComponent(tag)}`, { optional: true });
}

async function resolveTagCommit(api, repository, ref) {
  let object = ref?.object;
  for (let depth = 0; object?.type === "tag" && depth < 8; depth += 1) {
    object = (await api(`${repository}/git/tags/${object.sha}`)).object;
  }
  requireThat(object?.type === "commit" && shaPattern.test(object.sha), "Release tag does not resolve to a commit");
  return object.sha;
}

async function verifySourceOnMain(api, repository, sourceSha) {
  const main = await api(`${repository}/git/ref/heads/main`);
  if (main.object.sha === sourceSha) return;
  const comparison = await api(`${repository}/compare/${sourceSha}...${main.object.sha}`);
  requireThat(comparison.status === "ahead", "Release source is not an ancestor of current main");
}

async function verifyImmutability(api, repository) {
  const setting = await api(`${repository}/immutable-releases`);
  requireThat(setting.enabled === true, "Release immutability must be enabled");
}

export async function preflightNewRelease(api, identityValues) {
  const identity = releaseIdentity(identityValues);
  await verifyImmutability(api, identity.repository);
  await verifySourceOnMain(api, identity.repository, identity.sourceSha);
  requireThat(await tagRef(api, identity.repository, identity.tag) === null, `Release tag ${identity.tag} already exists`);
  requireThat(await findRelease(api, identity.repository, identity.tag) === null, `Release ${identity.tag} already exists`);
  return identity;
}

export async function requireUnusedNpmVersion(version, fetcher = fetch) {
  requireThat(semverPattern.test(version), "Invalid npm release version");
  const response = await fetcher(`https://registry.npmjs.org/@harness-lens%2Fcli/${version}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return;
  requireThat(!response.ok, `npm version ${version} is already published; refusing replacement`);
  throw new Error(`npm registry preflight failed with HTTP ${response.status}`);
}

function releaseMarker(candidate) {
  const { manifest } = candidate;
  return `<!-- harness-lens-release:${JSON.stringify({
    sourceSha: manifest.sourceSha,
    workflowSha: manifest.workflowSha,
    runId: manifest.runId,
    runAttempt: manifest.runAttempt,
    manifestSha256: candidate.manifestSha256,
  })} -->`;
}

function verifyReleaseBinding(release, candidate) {
  const { manifest } = candidate;
  requireThat(release.tag_name === manifest.tag && release.name === `Harness Lens CLI ${manifest.tag}`,
    "Draft release tag or title conflicts with the reviewed candidate");
  requireThat(release.prerelease === false && release.body?.includes(releaseMarker(candidate)),
    "Draft release provenance binding conflicts with the reviewed candidate");
}

export function verifyRemoteAssets(remoteAssets, expectedAssets, { complete = true } = {}) {
  const expected = new Map(expectedAssets.map((asset) => [asset.name, asset]));
  const seen = new Set();
  for (const remote of remoteAssets) {
    requireThat(!seen.has(remote.name), `Duplicate remote asset: ${remote.name}`);
    seen.add(remote.name);
    const local = expected.get(remote.name);
    requireThat(local, `Unexpected remote asset: ${remote.name}`);
    requireThat(remote.state === "uploaded" && remote.size === local.size && remote.digest === `sha256:${local.sha256}`,
      `Remote asset conflicts with reviewed candidate: ${remote.name}`);
  }
  if (complete) requireThat(seen.size === expected.size, "Remote release is missing reviewed assets");
  return expectedAssets.filter((asset) => !seen.has(asset.name));
}

async function verifyTagIfPresent(api, manifest) {
  const ref = await tagRef(api, manifest.repository, manifest.tag);
  if (ref) requireThat(await resolveTagCommit(api, manifest.repository, ref) === manifest.sourceSha,
    "Release tag points to a different source SHA");
  return ref;
}

export async function prepareDraft(api, upload, candidate) {
  const { manifest } = candidate;
  await verifyImmutability(api, manifest.repository);
  await verifySourceOnMain(api, manifest.repository, manifest.sourceSha);
  let release = await findRelease(api, manifest.repository, manifest.tag);
  const ref = await verifyTagIfPresent(api, manifest);
  if (!release) {
    requireThat(ref === null, `Release tag ${manifest.tag} exists without the bound draft`);
    release = await api(`${manifest.repository}/releases`, { method: "POST", body: {
      tag_name: manifest.tag,
      target_commitish: manifest.sourceSha,
      name: `Harness Lens CLI ${manifest.tag}`,
      body: `${releaseMarker(candidate)}\n`,
      draft: true,
      prerelease: false,
      generate_release_notes: true,
    } });
  }
  requireThat(release.draft === true && release.immutable !== true, "Existing release is not a mutable draft");
  verifyReleaseBinding(release, candidate);
  let missing = verifyRemoteAssets(release.assets ?? [], candidate.assets, { complete: false });
  for (const asset of missing) {
    await upload(release.id, { ...asset, path: join(candidate.directory, asset.name) });
  }
  release = await api(`${manifest.repository}/releases/${release.id}`);
  requireThat(release.draft === true, "Release changed state while assets were uploaded");
  verifyReleaseBinding(release, candidate);
  missing = verifyRemoteAssets(release.assets ?? [], candidate.assets);
  requireThat(missing.length === 0, "Draft release is incomplete");
  return release;
}

export async function publishDraft(api, candidate) {
  const { manifest } = candidate;
  await verifyImmutability(api, manifest.repository);
  await verifySourceOnMain(api, manifest.repository, manifest.sourceSha);
  let release = await findRelease(api, manifest.repository, manifest.tag);
  requireThat(release, `Draft release ${manifest.tag} is missing`);
  verifyReleaseBinding(release, candidate);
  verifyRemoteAssets(release.assets ?? [], candidate.assets);
  await verifyTagIfPresent(api, manifest);
  if (release.draft) {
    release = await api(`${manifest.repository}/releases/${release.id}`, {
      method: "PATCH",
      body: { draft: false },
    });
  }
  release = await api(`${manifest.repository}/releases/${release.id}`);
  requireThat(release.draft === false && release.prerelease === false && release.immutable === true,
    "Published release did not become immutable");
  verifyReleaseBinding(release, candidate);
  verifyRemoteAssets(release.assets ?? [], candidate.assets);
  const ref = await tagRef(api, manifest.repository, manifest.tag);
  requireThat(ref && await resolveTagCommit(api, manifest.repository, ref) === manifest.sourceSha,
    "Published release tag does not match the reviewed source SHA");
  return release;
}

function identityFromEnvironment() {
  return releaseIdentity({
    repository: process.env.GITHUB_REPOSITORY,
    version: process.env.RELEASE_VERSION,
    sourceSha: process.env.RELEASE_SHA,
    workflowSha: process.env.GITHUB_WORKFLOW_SHA,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.RELEASE_RUN_ATTEMPT ?? process.env.GITHUB_RUN_ATTEMPT,
  });
}

async function main() {
  const [command, directory = "release"] = process.argv.slice(2);
  requireThat(["manifest", "preflight", "prepare", "publish", "verify"].includes(command),
    "Usage: node scripts/release-transaction.mjs manifest|preflight|prepare|publish|verify [DIRECTORY]");
  const identity = identityFromEnvironment();
  if (command === "manifest") {
    await generateManifest(directory, identity);
    return;
  }
  if (command === "verify") {
    const candidate = await loadCandidate(directory);
    requireThat(JSON.stringify(releaseIdentity(candidate.manifest)) === JSON.stringify(identity),
      "Candidate identity differs from this workflow run");
    return;
  }
  const api = github(process.env.GH_TOKEN);
  if (command === "preflight") {
    await requireUnusedNpmVersion(identity.version);
    await preflightNewRelease(api, identity);
    return;
  }
  const candidate = await loadCandidate(directory);
  requireThat(JSON.stringify(releaseIdentity(candidate.manifest)) === JSON.stringify(identity),
    "Candidate identity differs from this workflow run");
  if (command === "prepare") {
    await requireUnusedNpmVersion(identity.version);
    await prepareDraft(api, githubUploader(process.env.GH_TOKEN, identity.repository), candidate);
  }
  if (command === "publish") await publishDraft(api, candidate);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
