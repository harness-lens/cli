> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

![Harness Lens](assets/harness-lens-banner.png)

# @harness-lens/cli

Terminal adapters for Harness Lens structural analysis. The native Rust binary
under [`rust/`](rust/) is the reference CLI; the existing TypeScript package
remains available to npm users.

```bash
npx @harness-lens/cli scan . --profile coding-agent/v1
npx @harness-lens/cli scan . --json
npx @harness-lens/cli scan . --input-cost-per-million-tokens 2.5 --invocations 100 --cost-reference provider/model-input-rate
npx @harness-lens/cli tui .
npx @harness-lens/cli compare before.json after.json
```

`scan` and the initial overview renderer are functional. The first `tui` command renders the same overview without an interactive event loop. Tabs, persistence, and Git-revision snapshot loading are planned.

The JSON and native CLI reports expose exact-duplicate counts, per-source byte
and token measurements, soft size/token budget findings, and—when configured—
input cost per invocation and total input cost.

The native CLI reads the same evaluation settings from `harness-lens.toml`:

```toml
[evaluation]
invocations = 100
input_cost_per_million_tokens = 2.5
cost_reference = "provider/model-input-rate"
```

`--ai` never changes deterministic findings or metrics. Until an interpreter is configured, it emits a notice and preserves the report.

Bootstrap order: publish `@harness-lens/core@0.0.1` before this package.

The Rust CLI pins an immutable revision of the
[`harness-lens/sdk`](https://github.com/harness-lens/sdk), keeping filesystem and
analysis behavior out of the terminal adapter.

## Ecosystem

- [Core](https://github.com/harness-lens/core)
- [SDK](https://github.com/harness-lens/sdk)
- [Language Server](https://github.com/harness-lens/language-server)
- [VS Code](https://github.com/harness-lens/harness-lens-vscode)
- [Project hub](https://github.com/harness-lens/harness-lens)

## Diagram Flow Chart

```mermaid
flowchart TD

subgraph group_ts["TypeScript CLI"]
  node_tsbin["TS executable<br/>[bin.ts]"]
  node_tscli["TS command router<br/>[index.ts]"]
end

subgraph group_native["Native CLI"]
  node_nativecli["Rust CLI<br/>[main.rs]"]
end

subgraph group_analysis["Analysis integration"]
  node_tscore["Harness Lens core"]
  node_sdk["Harness Lens SDK"]
end

subgraph group_output["Report output"]
  node_formatter["Overview formatter<br/>[format.ts]"]
  node_terminal["Terminal renderer<br/>[lib.rs]"]
end

node_user(("CLI user"))
node_reports["Saved reports"]
node_repository["Target repository"]
node_config["Harness Lens config"]

node_user -->|"runs"| node_tsbin
node_tsbin -->|"dispatches"| node_tscli
node_tscli -->|"scans repository"| node_tscore
node_tscli -->|"compares reports"| node_tscore
node_tscli -->|"selects target"| node_repository
node_tscli -->|"reads"| node_reports
node_tscli -->|"formats overview"| node_formatter
node_user -->|"runs"| node_nativecli
node_nativecli -->|"loads config and scans"| node_sdk
node_nativecli -->|"renders report"| node_terminal
node_nativecli -->|"selects target"| node_repository
node_nativecli -->|"loads settings"| node_config

click node_tsbin "https://github.com/harness-lens/cli/blob/main/src/bin.ts"
click node_tscli "https://github.com/harness-lens/cli/blob/main/src/index.ts"
click node_formatter "https://github.com/harness-lens/cli/blob/main/src/format.ts"
click node_nativecli "https://github.com/harness-lens/cli/blob/main/rust/src/main.rs"
click node_terminal "https://github.com/harness-lens/cli/blob/main/rust/crates/harness-lens-terminal/src/lib.rs"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_tsbin,node_tscli,node_user toneBlue
class node_nativecli toneAmber
class node_tscore,node_sdk toneMint
class node_formatter,node_terminal toneRose
class node_reports,node_repository,node_config toneIndigo
```

## Development

```bash
npm install
npm test
npm run check

cd rust
cargo test --locked
cargo run -- --version
```

## Native releases

The release pipeline builds native macOS, Windows, and Linux archives with
SHA-256 checksums, CycloneDX SBOMs, and signed GitHub attestations. Those same
reviewed archives drive the Homebrew, WinGet, Scoop, and Chocolatey packages;
the GHCR scanner image is published last. See
[`docs/distribution.md`](docs/distribution.md) for the exact artifacts, review
gate, registry handoffs, container restrictions, and retention policy.

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
