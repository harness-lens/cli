<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Chocolatey acceptance preparation

Priority P1, directly after [npm #45](https://github.com/harness-lens/cli/issues/45).
Track registry ownership, validation, moderation, and deployment in
[#35](https://github.com/harness-lens/cli/issues/35). Package generation already
exists; public Chocolatey acceptance has not been established.

## Candidate selection and inspection

Select the accepted replacement release through the release runbook. Record its
source/workflow SHAs, run ID, version, manifest digest, Windows ZIP digest,
and `.nupkg` digest. Inspect retained candidate bytes before approval. Do not
repack a published package or modify v0.0.5.

The generated package ID is `harness-lens`. Verify these package members:

- `harness-lens.nuspec`: matching ID/version, publisher, project/release links,
  license reference, description, and files limited to the intended tools.
- `tools/chocolateyinstall.ps1`: immutable Windows ZIP URL and SHA-256,
  `checksumType64 = 'sha256'`, extraction into the package tools directory.
- `tools/VERIFICATION.txt`: matching source/archive and verification guidance.
- `tools/LICENSE.txt`: license material; inspect the downloaded archive's full
  MPL-2.0 text as well and resolve any moderation requirement before submission.

Verify the manifest/checksum inventory and cryptographic attestations using
the accepted provenance procedure. A locally computed hash alone does not prove
the producer's identity. Never use `--ignore-checksums` to make a test pass.

## Clean Windows rehearsal

Use a disposable Windows VM with supported Chocolatey installed. Confirm no
other `harness-lens` executable or package is present, including npm/Scoop
installations. Keep user workspaces and production credentials out of this VM.
Place the exact reviewed `.nupkg` in an otherwise empty local directory.

With `$CandidateVersion` and `$CandidateDirectory` set to the reviewed values:

```powershell
$ErrorActionPreference = 'Stop'
choco install harness-lens --version="$CandidateVersion" --source="$CandidateDirectory" --yes --no-progress
if ($LASTEXITCODE -ne 0) { throw 'Chocolatey installation failed' }

$ReportedVersion = harness-lens --version
if ($LASTEXITCODE -ne 0 -or $ReportedVersion -ne "harness-lens $CandidateVersion") {
    throw 'Installed CLI version differs from the reviewed candidate'
}
harness-lens --help
if ($LASTEXITCODE -ne 0) { throw 'Installed CLI help failed' }
```

Create an `AGENTS.md` fixture in a path containing spaces. Exercise
`harness-lens scan PATH --json`, compare deterministic results with the reviewed
native ZIP, verify unknown-command failure, and verify hidden agent files are
discovered. Record process exit codes and the actual executable resolved by
`Get-Command harness-lens`. Confirm the shim points into this Chocolatey package.

```powershell
choco uninstall harness-lens --yes --no-progress
if ($LASTEXITCODE -ne 0) { throw 'Chocolatey removal failed' }
if (Get-Command harness-lens -ErrorAction SilentlyContinue) {
    throw 'The executable remains after removal; inspect the installation'
}
```

For upgrade acceptance, install the prior accepted package in a fresh VM,
upgrade using the exact next candidate, check version and scans, then remove it.
If no accepted predecessor exists, record that limitation and require upgrade
evidence at the next release. Do not present package generation or source tests
as Windows installation evidence.

## Submission and public acceptance

Confirm the project-controlled Chocolatey maintainer account and name availability.
Protect its package-owner credential through the approved publication procedure.
Submit the same reviewed `.nupkg`; resolve moderator feedback through reviewed
source changes and a new version when package bytes must change.

After moderation acceptance, repeat installation from the public community feed
in a clean VM, then record the package page, maintainer identity, version,
install/scan/uninstall evidence, and future update owner in #35.

The Chocolatey `.nupkg` is an installer package for Chocolatey. It is not a
NuGet library or a .NET global tool and must not be relabeled as one.

Source: [owning distribution contract](distribution.md#winget-scoop-and-chocolatey).
