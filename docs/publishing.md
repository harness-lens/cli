> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# Publishing

Publish `@harness-lens/core@0.0.1` first. Then publish this package interactively
once and configure npm trusted publishing for `.github/workflows/publish.yml`.

```bash
npm login
npm publish --access public --provenance
```

Later npm releases use GitHub Releases and OIDC. Never commit npm tokens.

Native releases are separate from npm publication. Follow
[`distribution.md`](distribution.md): build and review a dry-run candidate,
verify checksums/SBOM attestations, configure the protected `release`
environment, and only then publish. The native workflow derives Homebrew,
WinGet, Scoop, and Chocolatey packages from the reviewed binary checksums and
opens a protected Homebrew formula PR. GHCR stays blocked until that PR merges
with both macOS checks successful; a maintainer then reruns failed jobs in the
same publication run. The gate is rechecked after GHCR environment approval.
Follow the [resume procedure](distribution.md#resume-ghcr-after-formula-review),
including the 30-day retry window and partial-publication boundaries. Keep
`HOMEBREW_TAP_PUBLISH_ENABLED=false` while preparing this change.

As verified on 2026-09-07, existing tags are `v0.0.1` and `v0.0.2`, and neither
has a GitHub release. `v0.0.2` contains the old direct-push workflow. Source and
lockfile metadata now prepare `v0.0.3` as the next candidate. Recheck remote
tags and releases before creating that tag. Never rewrite existing tags, and
never dispatch publication from `v0.0.2` to test this change.
