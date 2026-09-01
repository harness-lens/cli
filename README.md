> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

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

## Language package placeholders

Buildable staging packages for the future Go and C/C++ implementations live in
[`placeholders/`](https://github.com/harness-lens/cli/tree/main/placeholders).
They document what can actually be reserved in each ecosystem and are intended
to move into dedicated repositories before their first public release.

## License

Early namespace-reservation versions used BSD-3-Clause. The official functional
implementation is licensed under MPL-2.0. When Covered Software is distributed,
modified MPL-covered files must remain available in Source Code Form under the
license. See [LICENSING](LICENSING.md), [COPYRIGHT](COPYRIGHT), and
[TRADEMARKS](TRADEMARKS).
