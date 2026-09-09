<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Qualifying installed candidate packages

Adopt shared GitHub composite actions for native archive and npm tarball
construction. PR checks and production preparation execute the same build,
packaging, extraction, and consumer checks. PR jobs retain test artifacts but
do not attest or publish releases. Sharing these actions does not yet share
Windows metadata assembly, container construction, or the complete release
candidate workflow.

Adopt Homebrew's documented `brew --cache --build-from-source FORMULA` to locate
the source download cache. Seed it with the qualified native candidate and
verify its digest against `brew info --json=v2` before installation. Keep the
generated formula and its canonical release URL unchanged. Use an unavailable
loopback artifact domain with `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK=1` during
fetch/install/test so a missing cache entry cannot silently fetch an existing
production package. This assumes Homebrew is set up before the check and the
formula is not installed on the runner. Each architecture gets its own cache.

Reject substituting a local URL in the formula: that would exercise changed
metadata. Reject version-only smoke tests as package acceptance: also test help,
invalid invocation, installed dependency resolution, and repeated functional
scans. Exclude only schema-defined wall-clock generation time (npm) and measured
plugin execution duration (native) from deterministic report comparisons.

These checks establish behavior for the installed candidate on the tested
runner. They do not establish clean-build reproducibility, cryptographic
attestation verification, public download availability, or sandbox permissions.

Sources:

- https://docs.github.com/en/actions/tutorials/creating-a-composite-action
- https://docs.brew.sh/Manpage#--cache-options-formulacask-
- https://docs.brew.sh/Manpage#environment

Evidence and outstanding work: [release reliability ledger](../release-reliability.md).
