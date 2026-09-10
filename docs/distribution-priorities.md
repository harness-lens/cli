<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Distribution preparation priorities

Maintainer order recorded 2026-09-10:

| Order | Delivery | Tracking |
| --- | --- | --- |
| P0 | `npm install harness-lens` and `npx harness-lens` | [#45](https://github.com/harness-lens/cli/issues/45) |
| P1 | Validate and submit the Chocolatey package | [#35](https://github.com/harness-lens/cli/issues/35) |
| P2 | Register the Snap name and qualify distribution | [#46](https://github.com/harness-lens/cli/issues/46) |
| P3 | Request the NuGet prefix and define package ownership | [#47](https://github.com/harness-lens/cli/issues/47) |

This order prioritizes implementation and account preparation. Production
publication still follows the [release runbook](release-runbook.md). Homebrew
recovery #32, mandatory sandbox acceptance #38, and the #41–#44/#42/#36
reliability ledger remain open. The tracker must identify which reliability
items are replacement-release gates and which follow Homebrew acceptance.
Priority changes do not grant protected-environment approval.

Preserve v0.0.5, its original 15 assets, tag, source, npm package, failed run,
and bound tap PR #3. A new launcher is not added to that immutable release.
WinGet #33, Scoop #34, and GHCR #36 remain tracked; this order does not close
or waive their acceptance requirements.

## P0: unscoped npm package

The existing package is named `@harness-lens/cli`. Its executable is already
named `harness-lens`; an executable name does not reserve an npm package name.
The new package delegates to an exact version of `@harness-lens/cli`, preserving
arguments, working directory, output, and exit status. The spelling is
`harness-lens`; no `harness-lns` typo package is planned.

Build review artifacts from this source:

```bash
npm ci
npm test
npm run check
mkdir -p npm-package
npm pack --pack-destination npm-package
npm run launcher:pack
version="$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')"
npm run launcher:smoke -- "npm-package/harness-lens-cli-${version}.tgz" "launcher-package/harness-lens-${version}.tgz" "$version"
```

The packer derives version and metadata from the root manifest, includes the
license/copyright and a functional launcher, and pins the scoped CLI dependency
exactly. There are no install lifecycle scripts or native binary downloads.
The launcher runs the existing JavaScript CLI; it does not replace that CLI
with the native Rust implementation.

CI packs and installs the candidates on Linux with Node 20/22/24 and on
Windows/macOS with Node 24. The smoke test serves the retained CLI tarball
through a temporary localhost registry so it can test a future version before
publication. Core metadata/archive requests use fixed URLs for the minimum Core
version declared by the CLI, from the official npm registry; evidence reports
that tested version. Production dependency resolution still follows the scoped
CLI's manifest.
Installation uses isolated directories and a temporary global prefix. It
checks both executable providers permitted by npm hoisting, the wrapper itself,
arguments containing spaces, scan equivalence, failure exit codes, uninstall,
and unchanged candidate digests. A separate empty consumer/cache verifies fresh
npx-style download and execution. This is candidate acceptance, not proof of
public registry ownership or public npx resolution.

Before public availability:

1. Confirm the package name is claimable and identify its project-controlled
   npm owner. An HTTP 404 alone does not establish claimability.
2. Resolve the first-publication authentication procedure. The scoped package's
   trusted publisher does not automatically authorize the unscoped package.
   Record how the initial package and package-specific trusted publisher will
   be established under an explicitly reviewed procedure; do not introduce an
   interactive/token bypass or silently extend the v0.0.5 exception.
3. Select the accepted source SHA and an unused version. The currently generated
   version is a source-validation fixture, not a release allocation.
4. Review a future release-contract change that includes both npm tarballs in
   the candidate inventory, checksums, provenance, preflight, and publication
   reconciliation. Each package must reconcile its own identity and integrity;
   a partial two-package publication must not trigger a duplicate publication.
5. Rehearse that exact contract with the required controls, then publish the
   retained bytes through the protected workflow. Verify real registry installs,
   npx, global installs, upgrade/uninstall, ownership, and provenance.

The current launcher preparation deliberately leaves `native-release.yml`,
`publish.yml`, and the 15-file release validator unchanged. It cannot publish
or reserve the bare package by itself. The public command remains
`npx @harness-lens/cli` until #45 records registry acceptance.

## Remaining preparation

- Chocolatey: [candidate inspection and Windows acceptance](chocolatey-acceptance.md).
- Snap: [registration, confinement, and build preparation](snap-preparation.md).
- NuGet: [prefix request draft and package decision](nuget-prefix-request.md).

Open VSX is the Eclipse-hosted registry for VS Code-compatible extensions. Its
namespace belongs to the [editor publication procedure](https://github.com/harness-lens/harness-lens-vscode/blob/main/docs/publishing.md#open-vsx),
not the CLI package. Namespace creation and verified ownership are separate
steps; an owner must complete the required account agreement and ownership claim.

## Sources

- [npm scopes](https://docs.npmjs.com/about-scopes/)
- [npm active-use/name policy](https://docs.npmjs.com/policies/disputes/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [Open VSX publication](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
