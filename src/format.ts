import path from "node:path";
import type { HarnessReport, MetricEvaluation } from "@harness-lens/core";

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function evaluation(metric: MetricEvaluation): string {
  if (metric.status === "not-evaluated" || metric.score === null) return "Not evaluated";
  return `${percentage(metric.score)}${metric.reference ? ` — ${metric.reference}` : ""}`;
}

export function reportStatus(report: HarnessReport): string {
  if (report.findings.some((finding) => finding.severity === "fail")) return "Invalid";
  if (report.findings.some((finding) => finding.severity === "warn")) return "Valid with warnings";
  return "Valid";
}

export function formatReport(report: HarnessReport): string {
  const warnings = report.findings.filter((finding) => finding.severity === "warn").length;
  const errors = report.findings.filter((finding) => finding.severity === "fail").length;
  const primary = report.files[0]?.path ? path.relative(report.repository, report.files[0].path) : "None";
  const rows: Array<[string, string]> = [
    ["Repository", path.basename(report.repository)],
    ["Harness files", String(report.files.length)],
    ["Primary file", primary],
    ["Status", reportStatus(report)],
    ["Tokens", String(report.metrics.tokens.count)],
    ["Tokenizer", report.metrics.tokens.tokenizer],
    ["Cost/injection", evaluation(report.metrics.cost)],
    ["Coverage", evaluation(report.metrics.coverage)],
    ["Alignment", evaluation(report.metrics.alignment)],
    ["Redundancy", percentage(report.metrics.redundancy)],
    ["Conflicts", String(report.metrics.conflicts)],
    ["Findings", `${warnings} warnings · ${errors} errors`],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));
  const overview = rows.map(([label, value]) => ` ${label.padEnd(width)}  ${value}`).join("\n");
  const findings = report.findings
    .filter((finding) => finding.severity !== "pass")
    .map((finding) => `${finding.severity.toUpperCase().padEnd(4)} ${finding.ruleId} ${finding.message}`)
    .join("\n");

  return [
    "Harness Lens — Overview",
    "",
    overview,
    findings ? `\n${findings}` : "",
  ].join("\n").trimEnd();
}
