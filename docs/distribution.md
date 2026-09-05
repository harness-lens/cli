> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# Native distribution

The native distribution pipeline has one release contract. A `vX.Y.Z` tag must
match `rust/Cargo.toml`, and the protected workflow builds these assets from that
exact tag:

| Target | Release archive | Consumer |
| --- | --- | --- |
| Apple silicon macOS | `harness-lens-vX.Y.Z-aarch64-apple-darwin.tar.gz` | Homebrew |
| Intel macOS | `harness-lens-vX.Y.Z-x86_64-apple-darwin.tar.gz` | Homebrew |
| Windows x64 | `harness-lens-vX.Y.Z-x86_64-pc-windows-msvc.zip` | WinGet, Scoop, Chocolatey |
| Linux x64 | `harness-lens-vX.Y.Z-x86_64-unknown-linux-gnu.tar.gz` | Direct download |

Each archive has a CycloneDX SBOM. `SHA256SUMS` covers every public release
asset. GitHub artifact attestations provide cryptographically signed SLSA build
provenance and bind each archive to its SBOM. These attestations are the current
cross-platform release signature; they are not Apple Developer ID signatures,
Apple notarization, or Windows Authenticode signatures.

Verify an archive after downloading it:

```bash
sha256sum --check SHA256SUMS --ignore-missing
gh attestation verify harness-lens-v0.0.1-x86_64-unknown-linux-gnu.tar.gz \
  --repo harness-lens/cli
```

## Review before publication

Pushing a stable version tag creates a dry-run candidate only. The workflow can
also be dispatched against that exact tag with `publish` left false. It builds,
tests, packages, attests, and retains the full candidate as a workflow artifact
for 30 days without creating a release, updating a package registry, or pushing
a container. For manual runs, select the same tag as both the workflow ref and
the `tag` input so the signed provenance identifies the source commit exactly.

Review at least:

- all four binaries report the expected version;
- archive contents are limited to the binary, license, copyright, and README;
- `SHA256SUMS`, SBOMs, and attestations verify;
- the generated Homebrew formula selects the correct architecture;
- WinGet and Scoop manifests parse and reference the reviewed Windows checksum;
- the Chocolatey package contains only its install scripts and metadata;
- the container runs as UID/GID 65532 with a read-only workspace and no network.

Enable release immutability in the CLI repository, and require an approver for
the `release` GitHub environment. Set `publish: true` only after review. The
workflow creates a draft, attaches every asset, and publishes it only when the
complete set is present; GitHub then locks the tag and assets. The remaining
jobs update Homebrew when enabled and publish GHCR last.

## Homebrew

The release produces `harness-lens-homebrew-tap-vX.Y.Z.tar.gz`. Its formula
installs the prebuilt macOS archive selected by CPU architecture and verifies
the exact SHA-256 generated earlier in the workflow.

Create `harness-lens/homebrew-tap` with a protected `main` branch, README, and
license only after the first dry-run candidate passes review. Install the
existing Harness Lens GitHub App on that repository with `Contents: read and
write`; if `main` requires a pull request, explicitly configure the App as the
reviewed release-automation bypass actor. Then configure the CLI repository:

- repository variable `HOMEBREW_TAP_PUBLISH_ENABLED=true`;
- secret `HARNESS_LENS_APP_ID`;
- secret `HARNESS_LENS_APP_PRIVATE_KEY`.

The release workflow then commits only `Formula/harness-lens.rb` to the tap.
Consumers install it with:

```bash
brew install harness-lens/tap/harness-lens
```

## WinGet, Scoop, and Chocolatey

All Windows definitions consume the same reviewed portable ZIP and checksum.
The release contains:

- `harness-lens-winget-vX.Y.Z.zip`: multi-file manifest for
  `HarnessLens.HarnessLens`;
- `harness-lens-scoop-vX.Y.Z.json`: Scoop manifest with immutable version URL;
- `harness-lens.X.Y.Z.nupkg`: Chocolatey package that downloads and verifies the
  release ZIP.

Registry submission remains an explicit review step because each registry has
its own ownership and moderation boundary:

1. Extract the WinGet package and validate its version directory with `winget
   validate --manifest manifests/h/HarnessLens/HarnessLens/X.Y.Z`, then copy
   the included `manifests/` tree into a branch of `microsoft/winget-pkgs` and
   submit it for review.
2. Validate the Scoop JSON with `scoop install <manifest-path>`, then commit it
   to the controlled bucket or submit it to an appropriate reviewed bucket.
3. Inspect the Chocolatey package with `choco pack`/`choco install --source .`,
   then push it with the package-owner API key. Never place that key in source.

Do not submit a manifest before its release URL resolves and its checksum and
attestation verify.

## GHCR scanner

After the package release and Homebrew update stage completes, the workflow
publishes `ghcr.io/harness-lens/cli` for `linux/amd64` and `linux/arm64`. Only
immutable version and source-SHA tags are created; there is deliberately no
mutable `latest` tag. BuildKit publishes an SBOM and maximum provenance, and
GitHub adds a registry-backed artifact attestation.

After the first publication, link the package to `harness-lens/cli`, set package
visibility to public, and confirm anonymous pulls work before documenting the
image as generally available.

Run the scanner with an explicitly constrained container:

```bash
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --mount "type=bind,src=$PWD,dst=/workspace,readonly" \
  ghcr.io/harness-lens/cli:0.0.1 /workspace --json
```

The production retention policy is to retain every semantic-version tag,
source-SHA tag, release checksum, SBOM, and attestation indefinitely. Never
overwrite version tags. A registry administrator may remove untagged BuildKit
cache objects after 30 days, but not a tagged release manifest or its attached
provenance.
