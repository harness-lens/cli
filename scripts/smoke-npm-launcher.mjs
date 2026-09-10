// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const [cliTarball, launcherTarball, version] = process.argv.slice(2);
assert.ok(cliTarball && launcherTarball && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? ""),
  "usage: npm run launcher:smoke -- CLI_TARBALL LAUNCHER_TARBALL VERSION");
assert.ok(process.env.npm_execpath, "Run through npm run launcher:smoke");
const cliArchive = resolve(cliTarball);
const launcherArchive = resolve(launcherTarball);
const cliBytes = await readFile(cliArchive);
const launcherBytes = await readFile(launcherArchive);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const integrity = `sha512-${createHash("sha512").update(cliBytes).digest("base64")}`;
const source = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(source.version, version);
const directory = await realpath(await mkdtemp(join(tmpdir(), "harness-lens-launcher-consumer-")));
const prefix = join(directory, "global");
const globalBin = process.platform === "win32" ? prefix : join(prefix, "bin");
const consumer = join(directory, "consumer");
const userconfig = join(directory, "npmrc");

// Serve the candidate dependency under its future registry identity. This lets
// both real local and global installs exercise the unchanged launcher tarball
// before that exact CLI version exists publicly. Only the existing Core package
// metadata and tarballs are proxied, without credentials, to the npm registry.
let registry;
let candidateDownloads = 0;
const server = createServer(async (request, response) => {
  try {
    assert.equal(request.method, "GET");
    const path = decodeURIComponent(new URL(request.url, registry).pathname);
    if (path === "/cli.tgz") {
      candidateDownloads += 1;
      response.writeHead(200, { "Content-Type": "application/octet-stream" }).end(cliBytes);
    } else if (path === "/@harness-lens/cli") {
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
        name: source.name,
        "dist-tags": { latest: version },
        versions: { [version]: { ...source, dist: { tarball: `${registry}/cli.tgz`, integrity } } },
      }));
    } else if (path === "/@harness-lens/core" || /^\/@harness-lens\/core\/-\/core-[0-9]+\.[0-9]+\.[0-9]+\.tgz$/u.test(path)) {
      const upstream = await fetch(`https://registry.npmjs.org${path}`, {
        signal: AbortSignal.timeout(30_000),
      });
      response.writeHead(upstream.status, {
        "Content-Type": path.endsWith(".tgz") ? "application/octet-stream" : "application/json",
      }).end(Buffer.from(await upstream.arrayBuffer()));
    } else {
      response.writeHead(404).end();
    }
  } catch {
    response.writeHead(502).end();
  }
});

const node = async (args, cwd = consumer) => {
  const child = spawn(process.execPath, args, {
    cwd,
    env: {
      ...process.env, NODE_PATH: "", NODE_ENV: "production",
      npm_config_registry: registry, npm_config_userconfig: userconfig,
      npm_config_cache: join(directory, "cache"), npm_config_prefix: prefix,
      PATH: `${globalBin}${delimiter}${process.env.PATH ?? ""}`,
    },
    stdio: ["ignore", "pipe", "pipe"], timeout: 120_000,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  const [status, signal] = await once(child, "close");
  assert.equal(signal, null, "npm process terminated by signal");
  return { status, stdout, stderr };
};
const npm = (args, cwd = consumer) => node([process.env.npm_execpath, ...args], cwd);
const success = (result) => assert.equal(result.status, 0, result.stderr);

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  registry = `http://127.0.0.1:${server.address().port}`;
  await mkdir(consumer);
  await writeFile(userconfig, "");
  await writeFile(join(consumer, "package.json"), JSON.stringify({
    name: "launcher-consumer", private: true, scripts: { "global-smoke": "harness-lens" },
  }));
  success(await npm(["install", "--ignore-scripts", "--omit=dev", "--no-audit", "--no-fund", launcherArchive]));
  const manifest = JSON.parse(await readFile(join(consumer, "node_modules/harness-lens/package.json"), "utf8"));
  assert.equal(manifest.name, "harness-lens");
  assert.equal(manifest.version, version);
  assert.deepEqual(manifest.dependencies, { "@harness-lens/cli": version });
  assert.equal(manifest.scripts, undefined);
  const lock = JSON.parse(await readFile(join(consumer, "package-lock.json"), "utf8"));
  assert.equal(lock.packages["node_modules/@harness-lens/cli"].integrity, integrity);
  const shim = join(consumer, "node_modules/.bin/harness-lens");
  const launcherBin = join(consumer, "node_modules/harness-lens/bin.js");
  // npm may link the identically named bin of the exact CLI dependency when
  // hoisting. Verify both allowed targets and exercise the wrapper separately.
  if (process.platform === "win32") {
    assert.match(await readFile(`${shim}.cmd`, "utf8"), /(?:harness-lens[\\/]bin\.js|@harness-lens[\\/]cli[\\/]dist[\\/]bin\.js)/u);
  } else {
    assert.ok((await Promise.all([
      realpath(launcherBin), realpath(join(consumer, "node_modules/@harness-lens/cli/dist/bin.js")),
    ])).includes(await realpath(shim)));
  }

  const invoke = (args, global = false) => global
    ? npm(["run", "--silent", "global-smoke", "--", ...args])
    : npm(["exec", "--offline", "--package=harness-lens", "--", "harness-lens", ...args]);
  const help = await invoke(["--help"]);
  success(help);
  assert.match(help.stdout, /Usage:/u);
  assert.deepEqual(await node([launcherBin, "--help"]), help);
  const invalid = await invoke(["unknown-command"]);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Unknown command/u);
  assert.deepEqual(await node([launcherBin, "unknown-command"]), invalid);
  const fixture = join(consumer, "fixture with spaces");
  await mkdir(fixture);
  const instructions = "# Project\n\n## Testing\nRun npm test.\n\n## Safety\nNever expose secrets.\n";
  await writeFile(join(fixture, "AGENTS.md"), instructions);
  const scan = async (global = false, direct = false) => {
    const args = ["scan", fixture, "--json"];
    const result = direct ? await node([launcherBin, ...args]) : await invoke(args, global);
    assert.ok(result.stdout.trim(), `Scan produced no report (exit ${result.status}): ${result.stderr}`);
    const { generatedAt, ...report } = JSON.parse(result.stdout);
    assert.ok(!Number.isNaN(Date.parse(generatedAt)));
    assert.equal(report.schemaVersion, "harness-lens/report/v1");
    assert.equal(report.files.length, 1);
    assert.equal(report.files[0].bytes, Buffer.byteLength(instructions));
    assert.equal(result.status, report.findings.some((finding) => finding.severity === "fail") ? 1 : 0);
    return report;
  };
  const report = await scan();
  assert.deepEqual(await scan(), report);
  assert.deepEqual(await scan(false, true), report);
  const defaultScan = await node([launcherBin, "scan", "--json"], fixture);
  assert.ok(defaultScan.stdout.trim(), defaultScan.stderr);
  const { generatedAt: defaultGeneratedAt, ...defaultReport } = JSON.parse(defaultScan.stdout);
  assert.ok(!Number.isNaN(Date.parse(defaultGeneratedAt)));
  assert.deepEqual(defaultReport, report);
  assert.equal(defaultScan.status, report.findings.some((finding) => finding.severity === "fail") ? 1 : 0);
  success(await npm(["install", "--global", "--ignore-scripts", "--no-audit", "--no-fund", launcherArchive]));
  // Remove the local installation before exercising global command resolution.
  success(await npm(["uninstall", "--ignore-scripts", "--no-audit", "--no-fund", "harness-lens"]));
  await assert.rejects(readFile(join(consumer, "node_modules/harness-lens/package.json")), { code: "ENOENT" });
  await assert.rejects(lstat(process.platform === "win32" ? `${shim}.cmd` : shim), { code: "ENOENT" });
  assert.deepEqual(await scan(true), report);
  success(await npm(["uninstall", "--global", "--ignore-scripts", "harness-lens"]));
  const globalModules = process.platform === "win32" ? join(prefix, "node_modules") : join(prefix, "lib/node_modules");
  await assert.rejects(readFile(join(globalModules, "harness-lens/package.json")), { code: "ENOENT" });
  await assert.rejects(lstat(join(globalBin, process.platform === "win32" ? "harness-lens.cmd" : "harness-lens")), { code: "ENOENT" });
  assert.ok(candidateDownloads > 0, "Installer did not consume the candidate dependency");
  assert.equal(hash(await readFile(cliArchive)), hash(cliBytes));
  assert.equal(hash(await readFile(launcherArchive)), hash(launcherBytes));
  console.log(JSON.stringify({
    package: manifest.name, version, node: process.version, platform: process.platform,
    sha256: hash(launcherBytes), cliSha256: hash(cliBytes),
    localInstall: "passed", globalInstall: "passed", npmExec: "passed", invalidCommand: "passed",
    functionalScans: 5, deterministicReportsEqual: true, workingDirectory: "passed",
    uninstall: "passed", tarballsUnchanged: true,
    comparisonExcludes: ["generatedAt"],
  }));
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await rm(directory, { recursive: true, force: true });
}
