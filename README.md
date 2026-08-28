# @harness-lens/cli

Terminal adapter for Harness Lens structural analysis.

```bash
npx @harness-lens/cli scan . --profile coding-agent/v1
npx @harness-lens/cli scan . --json
npx @harness-lens/cli tui .
npx @harness-lens/cli compare before.json after.json
```

`scan` and the initial overview renderer are functional. The first `tui` command renders the same overview without an interactive event loop. Tabs, persistence, and Git-revision snapshot loading are planned.

`--ai` never changes deterministic findings or metrics. Until an interpreter is configured, it emits a notice and preserves the report.

Bootstrap order: publish `@harness-lens/core@0.0.1` before this package.

## Development

```bash
npm install
npm test
npm run check
```
