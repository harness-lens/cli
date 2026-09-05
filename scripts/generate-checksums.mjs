// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function generateChecksums(directory, outputPath) {
  const absoluteOutput = resolve(outputPath);
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && resolve(directory, entry.name) !== absoluteOutput)
    .sort((left, right) => left.name.localeCompare(right.name));
  if (entries.length === 0) throw new Error(`no files found in ${directory}`);

  const lines = [];
  for (const entry of entries) {
    const digest = await sha256(resolve(directory, entry.name));
    lines.push(`${digest}  ${basename(entry.name)}`);
  }
  await writeFile(absoluteOutput, `${lines.join("\n")}\n`, "utf8");
  return lines;
}

async function main() {
  const [directory, outputPath] = process.argv.slice(2);
  if (!directory || !outputPath) {
    throw new Error("usage: node scripts/generate-checksums.mjs DIRECTORY OUTPUT_PATH");
  }
  await generateChecksums(directory, outputPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
