<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Release reliability implementation and handoff

Updated: 2026-09-09. Owner: `harness-lens/cli`.

## Current phase

Phase 1: reproduce and repair whole-publisher retry after GitHub accepts
publication but its response is lost. No production release is authorized by
this implementation checkpoint. Existing immutable versions remain unchanged.

Base: `d5bfffbaa1d412e6ba21639c3593e50f87a7d0f2`.
Branch: `fix/release-recovery-evidence`.
Working checkout: `/tmp/harness-lens-cli-recovery.yanc9H`.
The hub checkout and all pre-existing dirty work remain untouched.

## Completion ledger

A checked item means its stated deliverable has recorded evidence. Local tests,
GitHub CI, merged deployment, and production acceptance are distinct states.
Do not infer deployment from a passing unit test or PR.

- [x] 1. Inspect live source, CI, release state, and configuration metadata.
  Base CI: https://github.com/harness-lens/cli/actions/runs/34384877273.
  Sandbox secrets count and tag bypass actors are both zero. Production
  `v0.0.5` is immutable; tap PR 3 is open with both architecture checks failing.
- [x] 2. Create an isolated CLI branch and preserve existing dirty work.
- [x] 3. Repair whole-job retry after successful publication (local verification;
  PR, merge, and live sandbox acceptance remain pending).
- [x] 4. Add interruption tests for creation, each upload, publication, and verification
  (12 simulated interruption cases and nine conflicting-state cases pass).
- [ ] 5. Enforce required asset inventory, digests, source identity, and provenance.
- [ ] 6. Test installation and functionality of native, npm, and Homebrew packages.
- [ ] 7. Build and smoke-test both container architectures before publication.
- [ ] 8. Unify pinned tools across CI and release qualification.
- [ ] 9. Normalize archives and compare independent clean-build payload digests.
- [ ] 10. Share candidate construction between PR checks and release preparation.
- [ ] 11. Reconcile existing destination artifacts before writing.
- [ ] 12. Represent Homebrew review as pending while preserving the merge gate.
- [ ] 13. Implement protected recovery from verified immutable assets.
- [ ] 14. Add configuration checks and sandbox rehearsal cases.
- [ ] 15. Run owner checks and native platform CI on the final commit.
- [ ] 16. Prepare focused commits/PRs, monitor checks, and fix failures.
- [ ] 17. Update runbook, incident evidence, and prior-art notes.
- [ ] 18. After owner PRs merge, update hub pins and composition documentation.

## Empirical acceptance

- Record command, source revision, tool versions, scenario count, and results.
- Recovery tests count draft creations, each asset upload, publication requests,
  and writes after successful publication. Expected: one creation, one accepted
  upload per asset, one accepted publication, zero writes on completed retries.
- Reject missing assets, changed digests, wrong provenance/tag, mutable public
  releases, and missing evidence before any further writes.
- Exercise both failure before acceptance and response loss after acceptance.
  Mocked APIs establish state-machine behavior only; sandbox establishes actual
  GitHub permissions and immutable-release behavior.
- Package qualification uses installed candidate bytes and functional fixtures.
- Reproducibility compares payload digests from two clean builds per target;
  run-specific attestations/manifests are intentionally separate. No percentage
  reliability claim is justified by a small number of rehearsals.
- Record source SHA and exact GitHub check URLs; do not count stale checks.

## Baseline evidence

Local tools: Node `v24.18.0`, npm `11.16.0`, Cargo `1.97.1` (not the release
toolchain `1.85.1`; release-toolchain verification remains pending).

`node test/release-transaction.test.mjs`: 15 tests passed, zero failures.
Existing ambiguous-publication test retries `publishDraft` alone. The workflow
restarts with `prepare`, which rejects a matching immutable release with
`Existing release is not a mutable draft`. This is a workflow-sequence coverage
gap. The CLI command also unconditionally requires an unused npm version during
prepare, which must not prevent read-only reconciliation of a completed release.

## Next action

Complete release-pinned Rust checks and prepare the focused retry-repair PR.
Then implement independent asset inventory and package qualification work.
Update this checkpoint before any handoff or context exhaustion.

## Phase 1 measurements

- Regression before repair: 16 transaction tests, 15 passed, one failed with
  `Existing release is not a mutable draft`.
- After repair: `node test/release-transaction.test.mjs`, 40 passed, zero failed.
  Each of 12 interruption cases finishes with one accepted draft creation,
  one accepted upload per fixture asset, one accepted publication, and zero
  additional writes on a completed retry. Nine inconsistent-state cases reject
  with zero writes. The fixture has three assets; this does not claim native
  package installation or real GitHub transport coverage.
- `node test/publish-npm.test.mjs`: four passed, zero failed.
- `npm ci`: succeeded with committed lockfile.
- `npm test`: 97 passed, zero failed/skipped.
- `npm run check`, `npm pack --dry-run`, `git diff --check`: passed.
- Rust `1.85.1`: `cargo fmt --check`, `cargo clippy --all-targets --locked --
  -D warnings`, `cargo test --locked`, and `cargo run --locked -- --version`
  passed. The CLI Rust test target contains zero unit tests; the version smoke
  returned `harness-lens 0.0.5`. This is not native package qualification.
  The toolchain installer exited nonzero during its final rustup self-location
  check after successfully installing the toolchain; subsequent checks used
  that installation with isolated `RUSTUP_HOME`/`CARGO_HOME` and
  `RUSTUP_TOOLCHAIN=1.85.1`.

## External prerequisites

Sandbox App installation, private-key provisioning, tag authorization, and
protected approvals are not complete. Never print or store credential values
in this record. No sandbox or production release has been dispatched by this
implementation work. The existing 30-day same-run recovery policy remains in
force until a separately reviewed recovery implementation replaces it.
