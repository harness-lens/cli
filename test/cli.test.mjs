import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "../dist/index.js";

const report = {
  schemaVersion: "harness-lens/report/v1",
  repository: "/repo/example",
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [{ path: "/repo/example/AGENTS.md", kind: "agents", scope: "/repo/example", bytes: 42 }],
  findings: [{ severity: "warn", ruleId: "HL014", message: "Testing instructions missing", file: "/repo/example/AGENTS.md", line: null, evidence: null }],
  metrics: {
    tokens: { count: 11, tokenizer: "heuristic/4-chars" },
    cost: { status: "not-evaluated", score: null, reference: null, details: null },
    coverage: { status: "not-evaluated", score: null, reference: null, details: null },
    alignment: { status: "not-evaluated", score: null, reference: null, details: null },
    redundancy: 0,
    conflicts: 0,
  },
};

test("renders a deterministic overview", async () => {
  const output = [];
  const code = await runCli(["scan", "/repo/example"], {
    stdout: (message) => output.push(message),
    stderr: () => {},
  }, { scan: async () => report });
  assert.equal(code, 0);
  assert.match(output.join("\n"), /Harness Lens — Overview/);
  assert.match(output.join("\n"), /Coverage\s+Not evaluated/);
});

test("returns usage errors for unknown commands", async () => {
  const errors = [];
  const code = await runCli(["unknown"], {
    stdout: () => {},
    stderr: (message) => errors.push(message),
  });
  assert.equal(code, 2);
  assert.match(errors[0], /Unknown command/);
});
