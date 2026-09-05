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
publishes the GHCR scanner last.
