> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# Product identity and integration readiness

Status: 2026-08-30. This inventory records accounts and namespaces reported as
controlled by Harness Lens.

## Controlled identities

| Surface | Identity | Purpose |
| --- | --- | --- |
| GitHub | `harness-lens` organization | Source, releases, Actions, packages, and future GitHub App ownership. |
| GitHub | GitHub App(s) owned by the organization | Future repository installation, webhooks, Checks, and status integration. |
| Domain | Reported as `harness-les.com` | Confirm intended canonical spelling before using it in public links, OAuth callbacks, email, or package metadata. |
| npm | `@harness-lens` organization | Namespace for TypeScript packages, including clients and editor-extension dependencies. |
| crates.io | `harness-lens` ownership | Rust crate publishing identity. Intended public crates: `harness-lens`, `harness-lens-core`, and `harness-lens-cli`. |
| Visual Studio Marketplace | Harness Lens publisher | Publish the real VS Code extension. |
| Open VSX | Harness Lens namespace/publisher | Publish the same real extension for Open VSX consumers. |

Keep at least two organization owners wherever platform rules permit. Store
publishing tokens only in protected CI secrets; prefer short-lived/OIDC
credentials when supported.

## What this enables

### GitHub integration

The GitHub organization and App ownership are sufficient to build a Harness
Lens GitHub integration. A real integration still needs explicit App
permissions, webhook configuration, and installation by each customer or
repository owner. It can run the Harness Lens CLI/core, publish Checks or
commit statuses, and expose report data for a badge.

No separate registry name is needed for a badge. A GitHub Action, GitHub App,
or public status endpoint can generate it from a versioned Harness Lens report.

### VS Code and language servers

Marketplace ownership permits distribution, not implementation. A future VS
Code extension can ship a TypeScript language client and either bundle or
download a Harness Lens language-server binary. The language server itself
needs no marketplace or registry registration. It must call
`harness-lens-core` for diagnostics and reports rather than reimplementing
scanning or validation.

Open VSX is a separate registry from the Visual Studio Marketplace. Release
the same tested extension package to both only when the extension is real and
supported.

### Rust packages and CLI

Rust packages should preserve these boundaries:

- `harness-lens-core`: deterministic scanning, resolution, validation,
  findings, metrics, comparisons, and serializable report types.
- `harness-lens`: stable public facade and selected re-exports.
- `harness-lens-cli`: commands, terminal/JSON output, exit codes, and future
  transport adapters.

GitHub, MCP, LSP, terminal, editor, and network code stay outside core. Core
reports remain reproducible from identical inputs and retain source locations
and evidence.

## Intentionally not claimed or built

There is no Atlassian/Jira app or Marketplace listing. None is needed for the
GitHub, badge, VS Code, or language-server paths. Create a real Jira app only
when Harness Lens needs to participate in Jira workflows, such as showing
findings in issues or automating issue updates.

Do not create empty Marketplace listings, crates, Go modules, MCP servers,
language servers, macro crates, or editor extensions only to reserve a name.
Names and marketplace accounts do not establish trademark rights. Obtain legal
advice and trademark protection in target markets when brand protection is
needed.

## Review checklist

- Verify the canonical domain and renew it with MFA enabled.
- Verify at least two owners for GitHub, npm, crates.io, Visual Studio
  Marketplace, and Open VSX.
- Record publisher IDs, App IDs, and recovery contacts in private operations
  documentation; never commit tokens or private identifiers here.
- Before releasing an integration, document its permissions, data handling,
  support policy, and uninstall path.
