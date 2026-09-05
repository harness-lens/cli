// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import path from "node:path";
import type { HarnessReport, MetricEvaluation } from "@harness-lens/core";

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function evaluation(metric: MetricEvaluation): string {
  if (metric.status === "not-evaluated") return "Not evaluated";
  if (metric.score === null && metric.details && typeof metric.details === "object") {
    const details = metric.details as {
      inputCostPerInvocation?: number;
      inputCostTotal?: number;
      currency?: string;
    };
    if (details.inputCostPerInvocation !== undefined && details.inputCostTotal !== undefined) {
      return `${details.currency ?? "USD"} ${details.inputCostPerInvocation.toFixed(6)}/invocation; ${details.currency ?? "USD"} ${details.inputCostTotal.toFixed(6)} total`;
    }
  }
  if (metric.score === null) return "Evaluated";
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
  const extendedMetrics = report.metrics as typeof report.metrics & {
    duplicates?: { lines: number; paragraphs: number };
    budgets?: { tooLarge: number; overElaborated: number };
  };
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
    ["Exact duplicates", `${extendedMetrics.duplicates?.lines ?? 0} lines · ${extendedMetrics.duplicates?.paragraphs ?? 0} paragraphs`],
    ["Large sources", String(extendedMetrics.budgets?.tooLarge ?? 0)],
    ["Over-elaborated", String(extendedMetrics.budgets?.overElaborated ?? 0)],
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
