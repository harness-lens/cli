import { readFile } from "node:fs/promises";
import { compareReports, scanRepository } from "@harness-lens/core";
import type { HarnessReport, ScanOptions } from "@harness-lens/core";
import { formatReport } from "./format.js";

export interface CliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface CliDependencies {
  scan(repository: string, options?: ScanOptions): Promise<HarnessReport>;
}

const DEFAULT_IO: CliIo = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
};

function usage(): string {
  return [
    "Usage:",
    "  harness-lens scan [path] [--profile coding-agent/v1] [--json] [--ai]",
    "  harness-lens tui [path] [--profile coding-agent/v1]",
    "  harness-lens compare <before.json> <after.json> [--json]",
  ].join("\n");
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function readReport(file: string): Promise<HarnessReport> {
  return JSON.parse(await readFile(file, "utf8")) as HarnessReport;
}

export async function runCli(
  argv: string[],
  io: CliIo = DEFAULT_IO,
  dependencies: CliDependencies = { scan: scanRepository },
): Promise<number> {
  const [command = "scan", ...args] = argv;
  if (command === "--help" || command === "-h" || command === "help") {
    io.stdout(usage());
    return 0;
  }

  if (command === "compare") {
    const files = args.filter((arg) => !arg.startsWith("--"));
    if (!files[0] || !files[1]) {
      io.stderr(usage());
      return 2;
    }
    const comparison = compareReports(await readReport(files[0]), await readReport(files[1]));
    io.stdout(args.includes("--json") ? JSON.stringify(comparison, null, 2) : [
      `Files       ${comparison.fileDelta >= 0 ? "+" : ""}${comparison.fileDelta}`,
      `Tokens      ${comparison.tokenDelta >= 0 ? "+" : ""}${comparison.tokenDelta}`,
      `Findings    ${comparison.findingDelta >= 0 ? "+" : ""}${comparison.findingDelta}`,
      `Conflicts   ${comparison.conflictDelta >= 0 ? "+" : ""}${comparison.conflictDelta}`,
      `Coverage    ${comparison.coverageDelta === null ? "Not evaluated" : `${Math.round(comparison.coverageDelta * 100)} points`}`,
    ].join("\n"));
    return 0;
  }

  if (command !== "scan" && command !== "tui") {
    io.stderr(`Unknown command: ${command}\n\n${usage()}`);
    return 2;
  }

  const positional = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--profile");
  const repository = positional ?? process.cwd();
  const profile = option(args, "--profile");
  const report = await dependencies.scan(repository, profile ? { profile } : {});
  io.stdout(args.includes("--json") ? JSON.stringify(report, null, 2) : formatReport(report));
  if (args.includes("--ai")) {
    io.stderr("AI interpretation not configured; deterministic report unchanged.");
  }
  return report.findings.some((finding) => finding.severity === "fail") ? 1 : 0;
}

export { formatReport, reportStatus } from "./format.js";
