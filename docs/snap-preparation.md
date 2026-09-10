<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Snap preparation

Priority P2 after Chocolatey #35; tracking [#46](https://github.com/harness-lens/cli/issues/46).
Prepare registration independently from binary publication. A public store
lookup returning 404 does not exclude an unpublished name registration.

## Identity

Confirm the accountable publisher and account access. Snapcraft supports explicit
name registration with `snapcraft register harness-lens`. Record the resulting
snap ID, publisher, and ownership evidence. Run registration only under the
authorized account; never paste login credentials into issues or source.

## Filesystem behavior before recipe selection

Harness Lens scans user-selected repositories and hidden agent configuration.
Qualify strict confinement against ordinary files, nested `.github`, `.claude`,
and similar agent directories, global hidden configuration, and repositories
outside the home directory. The `home` interface excludes hidden home files by
default. Record actual access and incomplete-discovery behavior; do not infer
complete scans from a zero exit code.

If the required filesystem contract cannot work with strict confinement and
available interfaces, prepare a classic-confinement review request explaining
the exact inaccessible paths and why narrower access is insufficient. Obtain
Store approval before distributing a classic snap. Do not silently claim
classic permission, ship devmode as stable, or advertise partial scans as complete.

## Recipe and binary qualification

- Select a supported base after inspecting the accepted Linux executable's
  interpreter and shared-library requirements. Do not assume a build runner's
  userspace matches the chosen snap base.
- Current native releases include Linux x86_64. Limit the first recipe to that
  architecture unless an independently qualified Linux arm64 build is added.
- Consume the reviewed binary bytes or an explicitly reviewed reproducible build
  from immutable source. Bind recipe, source, binary, SBOM, and provenance digests.
- Choose a reviewed build-tool version and build in an isolated environment.
  Check all linter findings and record the resulting `.snap` digest.
- Install on a disposable snapd VM and test help/version, deterministic scans,
  hidden/out-of-home paths, refresh, removal, and confinement rejection behavior.
- Use a prerelease channel for accepted rehearsal and promote only through the
  reviewed release decision. Do not publish a mutable download recipe or an empty
  package solely to hold the name.

No runnable production recipe is asserted until the base, confinement, and
filesystem tests have been accepted. Track that decision in #46.

Sources:

- [Register a snap](https://snapcraft.io/docs/registering-your-app-name/)
- [Snap confinement](https://documentation.ubuntu.com/security/security-features/privilege-restriction/snap-confinement/)
- [Classic confinement approval](https://documentation.ubuntu.com/snapcraft/8.14/how-to/crafting/enable-classic-confinement/)
